const db = require('../config/database');
const langchainService = require('../services/langchainService');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

class EnhancedChatController {
  // Create new chat session with enhanced features
  async createSession(req, res) {
    try {
      const { 
        title, 
        workflow_id, 
        autonomous_agent_id,
        knowledge_base_id,
        session_type = 'interactive',
        is_shared = false,
        share_mode = 'view'
      } = req.body;
      const userId = req.user.id;

      const result = await db.query(
        `INSERT INTO chat_sessions 
         (user_id, title, workflow_id, autonomous_agent_id, knowledge_base_id, 
          session_type, context)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          userId, 
          title || 'New Chat', 
          workflow_id, 
          autonomous_agent_id, 
          knowledge_base_id, 
          session_type,
          JSON.stringify({ is_shared, share_mode })
        ]
      );

      res.status(201).json({
        success: true,
        session: result.rows[0]
      });
    } catch (error) {
      console.error('Create session error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get all sessions with message count and sharing info
  async getSessions(req, res) {
    try {
      const userId = req.user.id;
      const result = await db.query(
        `SELECT 
          cs.*,
          COUNT(DISTINCT cm.id) as message_count,
          cs.context->>'is_shared' as is_shared,
          cs.context->>'share_mode' as share_mode,
          MAX(cm.created_at) as last_message_at
         FROM chat_sessions cs
         LEFT JOIN chat_messages cm ON cs.id = cm.session_id
         WHERE cs.user_id = $1 AND cs.is_active = true
         GROUP BY cs.id
         ORDER BY COALESCE(MAX(cm.created_at), cs.created_at) DESC`,
        [userId]
      );

      res.json({
        success: true,
        sessions: result.rows
      });
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get single session details
  async getSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      // Get session with message count
      const result = await db.query(
        `SELECT 
          cs.*,
          COUNT(DISTINCT cm.id) as message_count,
          cs.context->>'is_shared' as is_shared,
          cs.context->>'share_mode' as share_mode,
          MAX(cm.created_at) as last_message_at
         FROM chat_sessions cs
         LEFT JOIN chat_messages cm ON cs.id = cm.session_id
         WHERE cs.id = $1 AND cs.user_id = $2 AND cs.is_active = true
         GROUP BY cs.id`,
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

  // Get messages with attachments and outputs
  async getMessages(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      // Verify session ownership or sharing permissions
      const sessionCheck = await db.query(
        `SELECT * FROM chat_sessions 
         WHERE id = $1 AND (user_id = $2 OR context->>'is_shared' = 'true')`,
        [sessionId, userId]
      );

      if (sessionCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Session not found or access denied'
        });
      }

      // Get messages with attachments
      const result = await db.query(
        `SELECT 
          cm.*,
          lm.display_name as model_name,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', uf.id,
                'name', uf.filename,
                'type', uf.file_type,
                'size', uf.file_size_bytes
              )
            ) FILTER (WHERE uf.id IS NOT NULL),
            '[]'::json
          ) as attachments,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', of.id,
                'name', of.filename,
                'type', of.output_type,
                'content', of.content,
                'downloadUrl', '/api/chat/outputs/' || of.id || '/download'
              )
            ) FILTER (WHERE of.id IS NOT NULL),
            '[]'::json
          ) as output_files
         FROM chat_messages cm
         LEFT JOIN llm_models lm ON cm.llm_model_id = lm.id
         LEFT JOIN message_attachments ma ON cm.id = ma.message_id
         LEFT JOIN user_files uf ON ma.file_id = uf.id
         LEFT JOIN message_outputs mo ON cm.id = mo.message_id
         LEFT JOIN output_files of ON mo.output_file_id = of.id
         WHERE cm.session_id = $1
         GROUP BY cm.id, lm.display_name
         ORDER BY cm.created_at ASC`,
        [sessionId]
      );

      res.json({
        success: true,
        messages: result.rows
      });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Send message with attachments and generate outputs
  async sendMessage(req, res) {
    try {
      const { sessionId } = req.params;
      const { content, model_id, attachments, workflow_execution_id } = req.body;
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

      // Store user message with attachments
      const userMessageResult = await db.query(
        `INSERT INTO chat_messages 
         (session_id, role, content, metadata, workflow_execution_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [sessionId, 'user', content, JSON.stringify({ attachments }), workflow_execution_id]
      );

      const userMessage = userMessageResult.rows[0];

      // Store attachments
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          await db.query(
            `INSERT INTO message_attachments (message_id, file_id)
             VALUES ($1, $2)`,
            [userMessage.id, attachment.id]
          );
        }
      }

      // Get AI response
      let aiResponse;
      let usage;
      let outputFiles = [];

      try {
        // Include knowledge base context if available
        let context = '';
        if (session.knowledge_base_id) {
          const kbResult = await db.query(
            `SELECT content FROM knowledge_documents 
             WHERE knowledge_base_id = $1 
             ORDER BY created_at DESC LIMIT 5`,
            [session.knowledge_base_id]
          );
          context = kbResult.rows.map(r => r.content).join('\n\n');
        }

        // Get AI response with context
        const response = await langchainService.chat({
          messages: [
            ...(context ? [{ role: 'system', content: `Context:\n${context}` }] : []),
            { role: 'user', content }
          ],
          modelId: model_id,
          userId,
          sessionId
        });

        aiResponse = response.content;
        usage = response.usage;

        // Generate outputs if requested
        if (req.body.generateOutput) {
          const outputContent = await this.generateOutput(aiResponse, req.body.outputType);
          const outputFile = await this.saveOutput(sessionId, outputContent, req.body.outputType);
          outputFiles.push(outputFile);
        }
      } catch (error) {
        console.error('AI response error:', error);
        aiResponse = 'I apologize, but I encountered an error processing your request.';
      }

      // Store assistant message
      const assistantMessageResult = await db.query(
        `INSERT INTO chat_messages 
         (session_id, role, content, llm_model_id, tokens_used, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          sessionId,
          'assistant',
          aiResponse,
          model_id,
          usage?.total_tokens || 0,
          JSON.stringify({ output_files: outputFiles })
        ]
      );

      const assistantMessage = assistantMessageResult.rows[0];

      // Store output files
      for (const file of outputFiles) {
        await db.query(
          `INSERT INTO message_outputs (message_id, output_file_id)
           VALUES ($1, $2)`,
          [assistantMessage.id, file.id]
        );
      }

      // Update session
      await db.query(
        'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [sessionId]
      );

      res.json({
        success: true,
        userMessage,
        assistantMessage,
        usage,
        output_files: outputFiles
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Generate output files from AI response
  async generateOutput(content, outputType) {
    switch (outputType) {
      case 'pdf':
        // Generate PDF from content
        // Implementation would use a PDF library like puppeteer or pdfkit
        return {
          type: 'pdf',
          content: Buffer.from(content).toString('base64'),
          filename: `output-${Date.now()}.pdf`
        };
      
      case 'markdown':
        return {
          type: 'markdown',
          content: content,
          filename: `output-${Date.now()}.md`
        };
      
      case 'json':
        // Extract structured data from response
        return {
          type: 'json',
          content: JSON.stringify({ response: content }, null, 2),
          filename: `output-${Date.now()}.json`
        };
      
      default:
        return {
          type: 'text',
          content: content,
          filename: `output-${Date.now()}.txt`
        };
    }
  }

  // Save output file
  async saveOutput(sessionId, outputData, outputType) {
    const outputId = uuidv4();
    const fileName = outputData.filename;
    const filePath = path.join('outputs', sessionId, fileName);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Save file
    if (outputData.type === 'pdf') {
      await fs.writeFile(filePath, Buffer.from(outputData.content, 'base64'));
    } else {
      await fs.writeFile(filePath, outputData.content);
    }

    // Store in database
    const result = await db.query(
      `INSERT INTO output_files 
       (id, session_id, filename, output_type, content, file_path)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [outputId, sessionId, fileName, outputType, outputData.content, filePath]
    );

    return result.rows[0];
  }

  // Download output file
  async downloadOutput(req, res) {
    try {
      const { outputId } = req.params;
      const userId = req.user.id;

      // Verify access
      const result = await db.query(
        `SELECT of.* FROM output_files of
         JOIN chat_sessions cs ON of.session_id = cs.id
         WHERE of.id = $1 AND cs.user_id = $2`,
        [outputId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Output file not found'
        });
      }

      const file = result.rows[0];
      const filePath = path.resolve(file.file_path);

      res.download(filePath, file.filename);
    } catch (error) {
      console.error('Download output error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update chat sharing settings
  async updateSharing(req, res) {
    try {
      const { sessionId } = req.params;
      const { is_shared, share_mode } = req.body;
      const userId = req.user.id;

      // Verify ownership
      const result = await db.query(
        `UPDATE chat_sessions 
         SET context = jsonb_set(
           jsonb_set(context, '{is_shared}', $3::jsonb),
           '{share_mode}', $4::jsonb
         )
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [sessionId, userId, JSON.stringify(is_shared), JSON.stringify(share_mode)]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      // Generate share link
      const shareLink = `${process.env.FRONTEND_URL}/shared/chat/${sessionId}?mode=${share_mode}`;

      res.json({
        success: true,
        session: result.rows[0],
        shareLink
      });
    } catch (error) {
      console.error('Update sharing error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get shared chat (for viewers)
  async getSharedChat(req, res) {
    try {
      const { sessionId } = req.params;
      const { mode } = req.query;

      // Check if chat is shared
      const sessionResult = await db.query(
        `SELECT * FROM chat_sessions 
         WHERE id = $1 AND context->>'is_shared' = 'true'`,
        [sessionId]
      );

      if (sessionResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Shared chat not found'
        });
      }

      const session = sessionResult.rows[0];
      const shareMode = session.context.share_mode;

      // Check access mode
      if (mode !== shareMode && shareMode === 'view') {
        return res.status(403).json({
          success: false,
          error: 'This chat is view-only'
        });
      }

      // Get messages
      const messages = await this.getMessagesForSession(sessionId);

      res.json({
        success: true,
        session,
        messages,
        canEdit: shareMode === 'edit'
      });
    } catch (error) {
      console.error('Get shared chat error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Helper method to get messages for a session
  async getMessagesForSession(sessionId) {
    const result = await db.query(
      `SELECT 
        cm.*,
        lm.display_name as model_name
       FROM chat_messages cm
       LEFT JOIN llm_models lm ON cm.llm_model_id = lm.id
       WHERE cm.session_id = $1
       ORDER BY cm.created_at ASC`,
      [sessionId]
    );
    return result.rows;
  }

  // Delete session
  async deleteSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      // Soft delete
      const result = await db.query(
        `UPDATE chat_sessions 
         SET is_active = false, closed_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
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
        message: 'Chat session deleted successfully'
      });
    } catch (error) {
      console.error('Delete session error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get token usage statistics
  async getTokenUsage(req, res) {
    try {
      const userId = req.user.id;
      
      // Get usage for current period
      const result = await db.query(
        `SELECT 
          SUM(cm.tokens_used) as total_tokens,
          COUNT(DISTINCT cm.session_id) as total_sessions,
          COUNT(cm.id) as total_messages,
          lm.model_name,
          lm.display_name
         FROM chat_messages cm
         JOIN chat_sessions cs ON cm.session_id = cs.id
         LEFT JOIN llm_models lm ON cm.llm_model_id = lm.id
         WHERE cs.user_id = $1 
           AND cm.created_at >= date_trunc('month', CURRENT_DATE)
         GROUP BY lm.model_name, lm.display_name`,
        [userId]
      );

      // Get user's token limit
      const limitResult = await db.query(
        `SELECT token_limit FROM user_subscriptions 
         WHERE user_id = $1 AND status = 'active'`,
        [userId]
      );

      const limit = limitResult.rows[0]?.token_limit || 100000;
      const used = result.rows.reduce((sum, row) => sum + parseInt(row.total_tokens || 0), 0);

      res.json({
        success: true,
        usage: {
          used,
          limit,
          percentage: (used / limit) * 100,
          byModel: result.rows
        }
      });
    } catch (error) {
      console.error('Get token usage error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Export chat session data
  async exportSession(req, res) {
    try {
      const { sessionId } = req.params;
      const { format = 'json' } = req.query;
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
      const messages = await this.getMessagesForSession(sessionId);

      const exportData = {
        session: {
          id: session.id,
          title: session.title,
          created_at: session.created_at,
          session_type: session.session_type
        },
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.created_at,
          model: msg.model_name
        }))
      };

      switch (format) {
        case 'json':
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="chat-${sessionId}.json"`);
          res.json(exportData);
          break;
        
        case 'markdown':
          let markdown = `# ${session.title}\n\n`;
          markdown += `Created: ${new Date(session.created_at).toLocaleString()}\n\n`;
          
          for (const message of messages) {
            markdown += `## ${message.role === 'user' ? 'You' : 'Assistant'}\n`;
            if (message.model_name) {
              markdown += `*Model: ${message.model_name}*\n\n`;
            }
            markdown += `${message.content}\n\n---\n\n`;
          }
          
          res.setHeader('Content-Type', 'text/markdown');
          res.setHeader('Content-Disposition', `attachment; filename="chat-${sessionId}.md"`);
          res.send(markdown);
          break;
        
        default:
          res.status(400).json({
            success: false,
            error: 'Unsupported export format'
          });
      }
    } catch (error) {
      console.error('Export session error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update session title
  async updateSessionTitle(req, res) {
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
      console.error('Update session title error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Search messages within a session
  async searchMessages(req, res) {
    try {
      const { sessionId } = req.params;
      const { query, limit = 50 } = req.query;
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

      // Search messages
      const result = await db.query(
        `SELECT cm.*, lm.display_name as model_name
         FROM chat_messages cm
         LEFT JOIN llm_models lm ON cm.llm_model_id = lm.id
         WHERE cm.session_id = $1 
           AND cm.content ILIKE $2
         ORDER BY cm.created_at DESC
         LIMIT $3`,
        [sessionId, `%${query}%`, limit]
      );

      res.json({
        success: true,
        messages: result.rows,
        query
      });
    } catch (error) {
      console.error('Search messages error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new EnhancedChatController();