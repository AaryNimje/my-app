const db = require('../config/database');
const langchainService = require('../services/langchainService');
const mcpService = require('../services/mcpService');

class AgentController {
  // Create new agent
  async createAgent(req, res) {
  try {
    const { 
      name, 
      description, 
      agent_type, 
      custom_prompt,
      model_id,
      temperature = 0.7,
      max_tokens = 1000
    } = req.body;
    const userId = req.user.id;

    console.log('Creating agent with data:', {
      name,
      agent_type,
      description: description?.substring(0, 50) + '...',
      model_id,
      temperature,
      max_tokens,
      userId
    });

    const query = `INSERT INTO ai_agents (
      user_id, name, agent_type, description, custom_prompt,
      model_id, temperature, max_tokens
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`;

    const values = [
      userId, 
      name, 
      agent_type || 'general', 
      description, 
      custom_prompt, 
      model_id || 'gemini-pro', 
      temperature, 
      max_tokens
    ];

    console.log('SQL Query:', query);
    console.log('Values:', values);

    const result = await db.query(query, values);

    console.log('Agent created successfully:', result.rows[0].id);

    res.status(201).json({
      success: true,
      agent: result.rows[0]
    });
  } catch (error) {
    console.error('=== AGENT CREATION ERROR ===');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error detail:', error.detail);
    console.error('Error hint:', error.hint);
    console.error('Full error:', error);
    console.error('===========================');
    
    res.status(500).json({
      success: false,
      error: error.message,
      detail: error.detail || 'Check backend console for more details'
    });
  }
}

  // Get all agents for user
  async getAgents(req, res) {
    try {
      const userId = req.user.id;

      const result = await db.query(
        `SELECT * FROM ai_agents 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [userId]
      );

      res.json({
        success: true,
        agents: result.rows
      });
    } catch (error) {
      console.error('Get agents error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get single agent
  async getAgent(req, res) {
    try {
      const { agentId } = req.params;
      const userId = req.user.id;

      const result = await db.query(
        `SELECT * FROM ai_agents 
         WHERE id = $1 AND user_id = $2`,
        [agentId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }

      res.json({
        success: true,
        agent: result.rows[0]
      });
    } catch (error) {
      console.error('Get agent error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update agent
  async updateAgent(req, res) {
    try {
      const { agentId } = req.params;
      const updates = req.body;
      const userId = req.user.id;

      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      Object.keys(updates).forEach(key => {
        if (['name', 'description', 'custom_prompt', 'temperature', 'max_tokens', 'model_id'].includes(key)) {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(updates[key]);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        });
      }

      values.push(agentId, userId);
      const query = `
        UPDATE ai_agents 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }

      res.json({
        success: true,
        agent: result.rows[0]
      });
    } catch (error) {
      console.error('Update agent error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Delete agent
  async deleteAgent(req, res) {
    try {
      const { agentId } = req.params;
      const userId = req.user.id;

      const result = await db.query(
        `DELETE FROM ai_agents 
         WHERE id = $1 AND user_id = $2
         RETURNING id`,
        [agentId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }

      res.json({
        success: true,
        message: 'Agent deleted successfully'
      });
    } catch (error) {
      console.error('Delete agent error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Execute agent
  async executeAgent(req, res) {
    try {
      const { agentId } = req.params;
      const { input } = req.body;
      const userId = req.user.id;

      // Get agent details
      const agentResult = await db.query(
        `SELECT * FROM ai_agents 
         WHERE id = $1 AND user_id = $2`,
        [agentId, userId]
      );

      if (agentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }

      const agent = agentResult.rows[0];

      // For email agent, use the email service
      if (agent.agent_type === 'email') {
        // Get user's email integration
        const integrationResult = await db.query(
          `SELECT * FROM integrations 
           WHERE user_id = $1 AND type = 'email' AND status = 'active'
           LIMIT 1`,
          [userId]
        );

        if (integrationResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'No email integration found. Please connect your email first.'
          });
        }

        const integration = integrationResult.rows[0];

        // Process email command
        const emailService = require('../services/emailService');
        const result = await emailService.processCommand(input, integration, agent);

        res.json({
          success: true,
          result
        });
      } else {
        // For other agents, use LangChain
        const model = await langchainService.getModel(agent.model_id || 'gemini-pro');
        
        const systemPrompt = agent.custom_prompt || `You are a helpful ${agent.agent_type} assistant.`;
        
        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'human', content: input }
        ];

        const response = await model.invoke(messages);

        res.json({
          success: true,
          result: {
            output: response.content,
            usage: response.usage
          }
        });
      }
    } catch (error) {
      console.error('Execute agent error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new AgentController();