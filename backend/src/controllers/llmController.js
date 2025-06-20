// backend/src/controllers/llmController.js
const db = require('../config/database');
const langchainService = require('../services/langchainService');

class LLMController {
  // Get available LLM models
  async getModels(req, res) {
    try {
      const result = await db.query(
        'SELECT * FROM llm_models ORDER BY provider, model_name'
      );

      res.json({
        success: true,
        models: result.rows
      });
    } catch (error) {
      console.error('Get models error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Direct completion
  async complete(req, res) {
    try {
      const { prompt, model_id, options = {} } = req.body;
      const userId = req.user.id;

      const model = await langchainService.getModel(model_id || 'gemini-pro');
      
      const response = await model.invoke(prompt);

      // Track usage
      if (response.usage) {
        await langchainService.trackTokenUsage(
          userId,
          model_id,
          response.usage.prompt_tokens || 0,
          response.usage.completion_tokens || 0
        );
      }

      res.json({
        success: true,
        response: response.content,
        usage: response.usage
      });
    } catch (error) {
      console.error('Complete error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Chat completion
  async chat(req, res) {
    try {
      const { messages, model_id, options = {} } = req.body;
      const userId = req.user.id;

      const model = await langchainService.getModel(model_id || 'gemini-pro');
      
      const response = await model.invoke(messages);

      // Track usage
      if (response.usage) {
        await langchainService.trackTokenUsage(
          userId,
          model_id,
          response.usage.prompt_tokens || 0,
          response.usage.completion_tokens || 0
        );
      }

      res.json({
        success: true,
        response: response.content,
        usage: response.usage
      });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get user's API keys (masked)
  async getApiKeys(req, res) {
    try {
      const userId = req.user.id;

      // In a real app, you'd store user-specific API keys
      // For now, return which providers have keys configured
      const providers = [];
      
      if (process.env.GOOGLE_API_KEY) {
        providers.push({ provider: 'google', configured: true });
      }
      if (process.env.OPENAI_API_KEY) {
        providers.push({ provider: 'openai', configured: true });
      }
      if (process.env.ANTHROPIC_API_KEY) {
        providers.push({ provider: 'anthropic', configured: true });
      }

      res.json({
        success: true,
        apiKeys: providers
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Add/Update API key
  async upsertApiKey(req, res) {
    try {
      const { provider, api_key } = req.body;
      const userId = req.user.id;

      // In production, encrypt and store user-specific API keys
      // For now, just return success
      res.json({
        success: true,
        message: 'API key updated successfully'
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
}

module.exports = new LLMController();