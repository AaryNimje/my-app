const db = require('../config/database');
const langchainService = require('../services/langchainService');
const { v4: uuidv4 } = require('uuid');

class ChatController {
  // Create new chat session
  async createSession(req, res) {
    try {
      const { 
        title, 
        workflow_id, 
        autonomous_agent_id,
        knowledge_base_id,
        session_type = 'interactive' 
      } = req.body;
      const userId = req.user.id;

      const result = await db.query(
        `INSERT INTO chat_sessions 
         (user_id, title, workflow_id, autonomous_agent_id, knowledge_base_id, session_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, title || 'New Chat', workflow_id, autonomous_agent_id, knowledge_base_id, session_type]
      );

      res.status(201).json({
        success: true,
        session: result.rows[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get all chat sessions for user
  async getSessions(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 50, offset = 0, is_active } = req.query;

      let query = `
        SELECT cs.*, 
               COUNT(cm.id) as message_count,
               MAX(cm.created_at) as last_message_at,
               w.name as workflow_name,
               aa.name as agent_name
        FROM chat_sessions cs
        LEFT JOIN chat_messages cm ON cs.id = cm.session_id
        LEFT JOIN workflows w ON cs.workflow_id = w.id
        LEFT JOIN ai_agents aa ON cs.autonomous_agent_id = aa.id
        WHERE cs.user_id = $1
      `;

      const params = [userId];
      let paramIndex = 2;

      if (is_active !== undefined) {
        query += ` AND cs.is_active = $${paramIndex}`;
        params.push(is_active === 'true');
        paramIndex++;
      }

      query += `
        GROUP BY cs.id, w.name, aa.name
        ORDER BY COALESCE(MAX(cm.created_at), cs.created_at) DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);

      const result = await db.query(query, params);

      res.json({
        success: true,
        sessions: result.rows
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Send message to chat
  async sendMessage(req, res) {
    try {
      const { sessionId } = req.params;
      const { content, model_id, attachments } = req.body;
      const userId = req.user.id;

      // Verify session ownership
      const sessionResult = await db.query(
        'SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2',
        [sessionId, userId]
      );

      if (sessionResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      const session = sessionResult.rows[0];

      // Store user message
      const userMessageResult = await db.query(
        `INSERT INTO chat_messages (session_id, role, content, metadata)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [sessionId, 'user', content, attachments ? { attachments } : null]
      );

      const userMessage = userMessageResult.rows[0];

      // Get model info
      const modelResult = await db.query(
        'SELECT * FROM llm_models WHERE id = $1',
        [model_id || 'default-model-id']
      );

      if (modelResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid model'
        });
      }

      const modelInfo = modelResult.rows[0];

      // Get conversation history
      const historyResult = await db.query(
        `SELECT role, content FROM chat_messages
         WHERE session_id = $1
         ORDER BY created_at ASC
         LIMIT 20`,
        [sessionId]
      );

      const messages = historyResult.rows;

      // Generate AI response
      try {
        const model = await langchainService.getModel(modelInfo.model_name);
        
        // If session has a knowledge base, search for relevant context
        let context = '';
        if (session.knowledge_base_id) {
          const contextResult = await db.query(
            `SELECT content FROM knowledge_documents
             WHERE knowledge_base_id = $1 
             AND content ILIKE $2
             LIMIT 3`,
            [session.knowledge_base_id, `%${content}%`]
          );
          
          if (contextResult.rows.length > 0) {
            context = contextResult.rows.map(r => r.content).join('\n\n');
          }
        }

        // Build prompt with history
        const formattedMessages = messages.map(msg => ({
          role: msg.role === 'user' ? 'human' : 'assistant',
          content: msg.content
        }));

        if (context) {
          formattedMessages.unshift({
            role: 'system',
            content: `Use the following context to answer questions:\n\n${context}`
          });
        }

        // Get response
        const response = await model.invoke(formattedMessages);
        
        // Store assistant message
        const assistantMessageResult = await db.query(
          `INSERT INTO chat_messages 
           (session_id, role, content, metadata, tokens_used, model_used)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            sessionId, 
            'assistant', 
            response.content,
            { model: modelInfo.model_name },
            response.usage?.total_tokens || 0,
            modelInfo.model_name
          ]
        );

        const assistantMessage = assistantMessageResult.rows[0];

        // Update session context
        await db.query(
          `UPDATE chat_sessions 
           SET context = context || $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [
            { last_exchange: { user: content, assistant: response.content } },
            sessionId
          ]
        );

        // Track token usage
        if (response.usage) {
          await langchainService.trackTokenUsage(
            userId,
            modelInfo.id,
            response.usage.prompt_tokens || 0,
            response.usage.completion_tokens || 0,
            sessionId
          );
        }

        res.json({
          success: true,
          userMessage,
          assistantMessage,
          usage: response.usage
        });
      } catch (error) {
        // Store error message
        await db.query(
          `INSERT INTO chat_messages (session_id, role, content)
           VALUES ($1, $2, $3)`,
          [sessionId, 'system', `Error: ${error.message}`]
        );

        throw error;
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get messages for a session
  async getMessages(req, res) {
    try {
      const { sessionId } = req.params;
      const { limit = 100, offset = 0 } = req.query;
      const userId = req.user.id;

      // Verify session ownership
      const sessionCheck = await db.query(
        'SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2',
        [sessionId, userId]
      );

      if (sessionCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      const result = await db.query(
        `SELECT * FROM chat_messages
         WHERE session_id = $1
         ORDER BY created_at ASC
         LIMIT $2 OFFSET $3`,
        [sessionId, limit, offset]
      );

      res.json({
        success: true,
        messages: result.rows
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Close chat session
  async closeSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      const result = await db.query(
        `UPDATE chat_sessions 
         SET is_active = false, closed_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2
         RETURNING id`,
        [sessionId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      res.json({
        success: true,
        message: 'Session closed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update session title
  async updateSession(req, res) {
    try {
      const { sessionId } = req.params;
      const { title } = req.body;
      const userId = req.user.id;

      const result = await db.query(
        `UPDATE chat_sessions 
         SET title = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND user_id = $3
         RETURNING *`,
        [title, sessionId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      res.json({
        success: true,
        session: result.rows[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get session statistics
  async getSessionStats(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      const result = await db.query(
        `SELECT 
           COUNT(*) as total_messages,
           COUNT(*) FILTER (WHERE role = 'user') as user_messages,
           COUNT(*) FILTER (WHERE role = 'assistant') as assistant_messages,
           SUM(tokens_used) as total_tokens,
           COUNT(DISTINCT model_used) as models_used
         FROM chat_messages cm
         JOIN chat_sessions cs ON cm.session_id = cs.id
         WHERE cs.id = $1 AND cs.user_id = $2`,
        [sessionId, userId]
      );

      res.json({
        success: true,
        stats: result.rows[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  // Add this method to your existing chatController.js

async sendDirectMessage(req, res) {
  try {
    const { message, agent_id, model_id } = req.body;
    const userId = req.user.id;

    // Create a temporary session if agent_id is provided
    let sessionId = null;
    if (agent_id) {
      const sessionResult = await db.query(
        `INSERT INTO chat_sessions 
         (user_id, title, autonomous_agent_id, session_type)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, 'Direct Chat', agent_id, 'direct']
      );
      sessionId = sessionResult.rows[0].id;
    }

    // Get model info
    const modelResult = await db.query(
      'SELECT * FROM llm_models WHERE id = $1',
      [model_id || 'gpt-3.5-turbo']
    );

    if (modelResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid model'
      });
    }

    const modelInfo = modelResult.rows[0];

    // If agent_id is provided, use agent configuration
    let agentConfig = null;
    if (agent_id) {
      const agentResult = await db.query(
        'SELECT * FROM ai_agents WHERE id = $1 AND user_id = $2',
        [agent_id, userId]
      );

      if (agentResult.rows.length > 0) {
        agentConfig = agentResult.rows[0];
      }
    }

    // Generate response
    const model = await langchainService.getModel(modelInfo.model_name);
    
    let systemPrompt = '';
    if (agentConfig) {
      systemPrompt = agentConfig.custom_prompt || `You are a ${agentConfig.agent_type} assistant.`;
    }

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'human', content: message });

    const response = await model.invoke(messages);

    // If session was created, store messages
    if (sessionId) {
      // Store user message
      await db.query(
        `INSERT INTO chat_messages (session_id, role, content)
         VALUES ($1, $2, $3)`,
        [sessionId, 'user', message]
      );

      // Store assistant message
      await db.query(
        `INSERT INTO chat_messages 
         (session_id, role, content, tokens_used, model_used)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          sessionId,
          'assistant',
          response.content,
          response.usage?.total_tokens || 0,
          modelInfo.model_name
        ]
      );
    }

    res.json({
      success: true,
      response: response.content,
      usage: response.usage,
      sessionId
    });
  } catch (error) {
    console.error('Direct message error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
// Add this method to your existing chatController.js:

// Get single session
async getSession(req, res) {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const result = await db.query(
      `SELECT cs.*, 
       COUNT(cm.id) as message_count,
       aa.name as agent_name
       FROM chat_sessions cs
       LEFT JOIN chat_messages cm ON cs.id = cm.session_id
       LEFT JOIN ai_agents aa ON cs.autonomous_agent_id = aa.id
       WHERE cs.id = $1 AND cs.user_id = $2
       GROUP BY cs.id, aa.name`,
      [sessionId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      session: result.rows[0]
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
}

module.exports = new ChatController();