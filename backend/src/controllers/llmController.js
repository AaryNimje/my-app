// backend/src/controllers/llmController.js
const db = require('../config/database');
const llmService = require('../services/llmService');

class LLMController {
  // Get available models
  async getModels(req, res) {
    try {
      const userId = req.user.id;
      const models = await llmService.getAvailableModels(userId);

      res.json({
        success: true,
        models
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Test model
  async testModel(req, res) {
    try {
      const { modelId } = req.params;
      const userId = req.user.id;

      // Get model info
      const modelResult = await db.query(
        'SELECT * FROM llm_models WHERE id = $1',
        [modelId]
      );

      if (modelResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Model not found'
        });
      }

      const model = modelResult.rows[0];

      // Test with simple prompt
      const response = await llmService.complete({
        model: model.model_name,
        prompt: 'Hello! Please respond with a brief greeting.',
        temperature: 0.7,
        userId
      });

      res.json({
        success: true,
        response: response.text,
        usage: response.usage
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Completion endpoint
  async complete(req, res) {
    try {
      const userId = req.user.id;
      const { prompt, model, temperature = 0.7, max_tokens } = req.body;

      if (!prompt) {
        return res.status(400).json({
          success: false,
          error: 'Prompt is required'
        });
      }

      const response = await llmService.complete({
        model: model || 'gpt-3.5-turbo',
        prompt,
        temperature,
        maxTokens: max_tokens,
        userId
      });

      res.json({
        success: true,
        ...response
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Chat endpoint
  async chat(req, res) {
    try {
      const userId = req.user.id;
      const { messages, model, temperature = 0.7, stream = false } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({
          success: false,
          error: 'Messages array is required'
        });
      }

      const response = await llmService.chat({
        messages,
        model: model || 'gpt-3.5-turbo',
        temperature,
        userId,
        stream
      });

      if (stream) {
        // Handle streaming response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        for await (const chunk of response) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }

        res.end();
      } else {
        res.json({
          success: true,
          ...response
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Stream chat endpoint
  async streamChat(req, res) {
    req.body.stream = true;
    return this.chat(req, res);
  }

  // Get user API keys
  async getUserApiKeys(req, res) {
    try {
      const userId = req.user.id;

      const result = await db.query(
        `SELECT provider, key_name, is_active, created_at, last_validated
         FROM user_api_keys
         WHERE user_id = $1
         ORDER BY provider`,
        [userId]
      );

      res.json({
        success: true,
        apiKeys: result.rows
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Add/update API key
  async upsertApiKey(req, res) {
    try {
      const { provider, api_key, key_name } = req.body;
      const userId = req.user.id;

      if (!provider || !api_key) {
        return res.status(400).json({
          success: false,
          error: 'Provider and API key are required'
        });
      }

      // Validate API key
      const isValid = await llmService.validateApiKey(provider, api_key);
      
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid API key'
        });
      }

      // Encrypt API key
      const encryptedKey = llmService.encryptApiKey(api_key);

      // Upsert API key
      await db.query(
        `INSERT INTO user_api_keys 
         (user_id, provider, api_key_encrypted, key_name, is_valid, last_validated)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, provider, key_name)
         DO UPDATE SET 
           api_key_encrypted = $3,
           is_valid = $5,
           is_active = true,
           last_validated = CURRENT_TIMESTAMP`,
        [userId, provider, encryptedKey, key_name || 'default', isValid]
      );

      res.json({
        success: true,
        message: 'API key saved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Delete API key
  async deleteApiKey(req, res) {
    try {
      const { provider } = req.params;
      const userId = req.user.id;

      await db.query(
        'UPDATE user_api_keys SET is_active = false WHERE user_id = $1 AND provider = $2',
        [userId, provider]
      );

      res.json({
        success: true,
        message: 'API key deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get usage stats
  async getUsageStats(req, res) {
    try {
      const userId = req.user.id;
      const { period = '30d' } = req.query;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      // Get usage data
      const usageResult = await db.query(
        `SELECT 
          DATE_TRUNC('day', created_at) as date,
          SUM(prompt_tokens) as prompt_tokens,
          SUM(completion_tokens) as completion_tokens,
          SUM(total_tokens) as total_tokens,
          COUNT(*) as request_count
         FROM token_usage
         WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3
         GROUP BY DATE_TRUNC('day', created_at)
         ORDER BY date`,
        [userId, startDate, endDate]
      );

      // Get usage by model
      const modelUsageResult = await db.query(
        `SELECT 
          lm.display_name,
          lm.provider,
          SUM(tu.total_tokens) as total_tokens,
          COUNT(*) as request_count
         FROM token_usage tu
         JOIN llm_models lm ON tu.model_id = lm.id
         WHERE tu.user_id = $1 AND tu.created_at >= $2
         GROUP BY lm.id, lm.display_name, lm.provider
         ORDER BY total_tokens DESC`,
        [userId, startDate]
      );

      // Get current period usage vs limits
      const limitsResult = await db.query(
        `SELECT 
          us.tokens_used_this_period,
          pp.token_limit_monthly,
          pp.name as plan_name
         FROM user_subscriptions us
         JOIN purchase_plans pp ON us.plan_id = pp.id
         WHERE us.user_id = $1 AND us.status = 'active'`,
        [userId]
      );

      res.json({
        success: true,
        usage: {
          daily: usageResult.rows,
          byModel: modelUsageResult.rows,
          limits: limitsResult.rows[0] || null,
          period: {
            start: startDate,
            end: endDate
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new LLMController();