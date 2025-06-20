// backend/src/services/llmService.js
const { ChatOpenAI } = require('@langchain/openai');
const { ChatAnthropic } = require('@langchain/anthropic');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const db = require('../config/database');

class LLMService {
  constructor() {
    this.models = new Map();
    this.apiKeys = new Map();
  }

  async initializeModel(provider, apiKey, modelName) {
    const key = `${provider}:${modelName}`;
    
    if (this.models.has(key) && this.apiKeys.get(key) === apiKey) {
      return this.models.get(key);
    }

    let model;
    
    switch (provider) {
      case 'openai':
        model = new ChatOpenAI({
          openAIApiKey: apiKey,
          modelName: modelName,
          temperature: 0.7,
        });
        break;
        
      case 'anthropic':
        model = new ChatAnthropic({
          anthropicApiKey: apiKey,
          modelName: modelName,
          temperature: 0.7,
        });
        break;
        
      case 'google':
        model = new ChatGoogleGenerativeAI({
          apiKey: apiKey,
          modelName: modelName,
          temperature: 0.7,
        });
        break;
        
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    this.models.set(key, model);
    this.apiKeys.set(key, apiKey);
    
    return model;
  }

  async getUserApiKey(userId, provider) {
    const result = await db.query(
      `SELECT api_key_encrypted FROM user_api_keys 
       WHERE user_id = $1 AND provider = $2 AND is_active = true
       LIMIT 1`,
      [userId, provider]
    );

    if (result.rows.length === 0) {
      throw new Error(`No active API key found for provider: ${provider}`);
    }

    // In production, decrypt the API key here
    return this.decryptApiKey(result.rows[0].api_key_encrypted);
  }

  async complete({ model, prompt, temperature = 0.7, userId }) {
    try {
      // Get model info from database
      const modelResult = await db.query(
        'SELECT * FROM llm_models WHERE model_name = $1',
        [model]
      );

      if (modelResult.rows.length === 0) {
        throw new Error(`Model not found: ${model}`);
      }

      const modelInfo = modelResult.rows[0];
      
      // Get user's API key for this provider
      const apiKey = await this.getUserApiKey(userId, modelInfo.provider);
      
      // Initialize model
      const llm = await this.initializeModel(
        modelInfo.provider,
        apiKey,
        modelInfo.model_name
      );

      // Set temperature
      llm.temperature = temperature;

      // Generate completion
      const response = await llm.invoke(prompt);
      
      // Track token usage
      const usage = {
        prompt_tokens: response._getNumTokens?.() || 0,
        completion_tokens: response.content.length / 4, // Rough estimate
        total_tokens: 0
      };
      usage.total_tokens = usage.prompt_tokens + usage.completion_tokens;

      // Record usage
      await this.recordTokenUsage(userId, modelInfo.id, usage);

      return {
        text: response.content,
        usage
      };
    } catch (error) {
      console.error('LLM completion error:', error);
      throw error;
    }
  }

  async chat({ messages, model, temperature = 0.7, userId, stream = false }) {
    try {
      // Get model info
      const modelResult = await db.query(
        'SELECT * FROM llm_models WHERE model_name = $1',
        [model]
      );

      if (modelResult.rows.length === 0) {
        throw new Error(`Model not found: ${model}`);
      }

      const modelInfo = modelResult.rows[0];
      
      // Get user's API key
      const apiKey = await this.getUserApiKey(userId, modelInfo.provider);
      
      // Initialize model
      const llm = await this.initializeModel(
        modelInfo.provider,
        apiKey,
        modelInfo.model_name
      );

      llm.temperature = temperature;

      if (stream) {
        // Return async generator for streaming
        return this.streamChat(llm, messages, userId, modelInfo.id);
      } else {
        // Non-streaming response
        const response = await llm.invoke(messages);
        
        const usage = {
          prompt_tokens: response._getNumTokens?.() || 0,
          completion_tokens: response.content.length / 4,
          total_tokens: 0
        };
        usage.total_tokens = usage.prompt_tokens + usage.completion_tokens;

        await this.recordTokenUsage(userId, modelInfo.id, usage);

        return {
          content: response.content,
          usage
        };
      }
    } catch (error) {
      console.error('LLM chat error:', error);
      throw error;
    }
  }

  async *streamChat(llm, messages, userId, modelId) {
    try {
      const stream = await llm.stream(messages);
      let totalContent = '';

      for await (const chunk of stream) {
        totalContent += chunk.content;
        yield { content: chunk.content };
      }

      // Record usage after streaming completes
      const usage = {
        prompt_tokens: 0,
        completion_tokens: totalContent.length / 4,
        total_tokens: totalContent.length / 4
      };

      await this.recordTokenUsage(userId, modelId, usage);
    } catch (error) {
      console.error('Stream error:', error);
      yield { error: error.message };
    }
  }

  async recordTokenUsage(userId, modelId, usage) {
    try {
      await db.query(
        `INSERT INTO token_usage 
         (user_id, model_id, prompt_tokens, completion_tokens, total_tokens)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          modelId,
          usage.prompt_tokens || 0,
          usage.completion_tokens || 0,
          usage.total_tokens || 0
        ]
      );

      // Update user's subscription usage
      await db.query(
        `UPDATE user_subscriptions 
         SET tokens_used_this_period = tokens_used_this_period + $1
         WHERE user_id = $2 AND status = 'active'`,
        [usage.total_tokens || 0, userId]
      );
    } catch (error) {
      console.error('Failed to record token usage:', error);
    }
  }

  encryptApiKey(apiKey) {
    // In production, use proper encryption (e.g., crypto.cipher)
    // This is a placeholder
    return Buffer.from(apiKey).toString('base64');
  }

  decryptApiKey(encryptedKey) {
    // In production, use proper decryption
    // This is a placeholder
    return Buffer.from(encryptedKey, 'base64').toString('utf8');
  }

  async validateApiKey(provider, apiKey) {
    try {
      const testModel = await this.initializeModel(
        provider,
        apiKey,
        provider === 'openai' ? 'gpt-3.5-turbo' : 
        provider === 'anthropic' ? 'claude-3-sonnet' : 
        'gemini-pro'
      );

      // Test with a simple prompt
      await testModel.invoke('Hi');
      
      return true;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  }

  async getAvailableModels(userId) {
    // Get all models from database
    const modelsResult = await db.query(
      'SELECT * FROM llm_models WHERE is_active = true ORDER BY provider, model_name'
    );

    // Get user's API keys
    const apiKeysResult = await db.query(
      'SELECT provider FROM user_api_keys WHERE user_id = $1 AND is_active = true',
      [userId]
    );

    const userProviders = new Set(apiKeysResult.rows.map(r => r.provider));

    // Filter models based on user's API keys
    const availableModels = modelsResult.rows.filter(model => 
      userProviders.has(model.provider)
    );

    return availableModels;
  }
}

module.exports = new LLMService();