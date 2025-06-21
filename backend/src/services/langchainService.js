// backend/src/services/langchainService.js
const { ChatOpenAI } = require('@langchain/openai');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { ChatAnthropic } = require('@langchain/anthropic');
const { BufferMemory, ConversationSummaryMemory } = require('langchain/memory');
const { initializeAgentExecutorWithOptions } = require('langchain/agents');
const db = require('../config/database');

class LangChainService {
  constructor() {
    this.models = new Map();
    this.memories = new Map();
    this.initializeModels();
  }

  initializeModels() {
    // Initialize Gemini models
    if (process.env.GOOGLE_API_KEY) {
      this.models.set('gemini-pro', new ChatGoogleGenerativeAI({
        model: 'gemini-pro',
        apiKey: process.env.GOOGLE_API_KEY,
        temperature: 0.7,
        maxOutputTokens: 2048,
      }));

      this.models.set('gemini-pro-vision', new ChatGoogleGenerativeAI({
        model: 'gemini-pro-vision',
        apiKey: process.env.GOOGLE_API_KEY,
        temperature: 0.7,
        maxOutputTokens: 2048,
      }));
    }

    // Initialize OpenAI models
    if (process.env.OPENAI_API_KEY) {
      this.models.set('gpt-3.5-turbo', new ChatOpenAI({
        modelName: 'gpt-3.5-turbo',
        openAIApiKey: process.env.OPENAI_API_KEY,
        temperature: 0.7,
      }));

      this.models.set('gpt-4', new ChatOpenAI({
        modelName: 'gpt-4',
        openAIApiKey: process.env.OPENAI_API_KEY,
        temperature: 0.7,
      }));
    }

    // Initialize Anthropic models
    if (process.env.ANTHROPIC_API_KEY) {
      this.models.set('claude-3-sonnet', new ChatAnthropic({
        modelName: 'claude-3-sonnet-20240229',
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        temperature: 0.7,
      }));
    }
  }

  async getModel(modelName) {
    if (this.models.has(modelName)) {
      return this.models.get(modelName);
    }

    const userApiKeys = await this.getUserApiKeys();

    if (modelName.startsWith('gemini') && userApiKeys.google) {
      const model = new ChatGoogleGenerativeAI({
        model: modelName,
        apiKey: userApiKeys.google,
        temperature: 0.7,
        maxOutputTokens: 2048,
      });
      this.models.set(modelName, model);
      return model;
    }

    if (modelName.startsWith('gpt') && userApiKeys.openai) {
      const model = new ChatOpenAI({
        modelName: modelName,
        openAIApiKey: userApiKeys.openai,
        temperature: 0.7,
      });
      this.models.set(modelName, model);
      return model;
    }

    if (this.models.has('gemini-pro')) {
      return this.models.get('gemini-pro');
    }

    throw new Error(`Model ${modelName} not available. Please add your API key.`);
  }

  async getUserApiKeys() {
    return {
      google: process.env.GOOGLE_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY
    };
  }

  getMemory(sessionId, type = 'buffer') {
    if (this.memories.has(sessionId)) {
      return this.memories.get(sessionId);
    }

    let memory;
    switch (type) {
      case 'summary':
        memory = new ConversationSummaryMemory({
          llm: this.models.get('gemini-pro') || this.models.values().next().value,
          memoryKey: 'chat_history',
        });
        break;
      case 'buffer':
      default:
        memory = new BufferMemory({
          memoryKey: 'chat_history',
          returnMessages: true,
        });
        break;
    }

    this.memories.set(sessionId, memory);
    return memory;
  }

  async createAgentExecutor(model, tools, options = {}) {
    const {
      systemPrompt,
      temperature,
      maxTokens,
      memory
    } = options;

    if (temperature !== undefined) {
      model.temperature = temperature;
    }
    if (maxTokens !== undefined && model.maxTokens !== undefined) {
      model.maxTokens = maxTokens;
    }

    const executor = await initializeAgentExecutorWithOptions(
      tools,
      model,
      {
        agentType: 'chat-conversational-react-description',
        memory: memory || new BufferMemory({
          memoryKey: 'chat_history',
          returnMessages: true,
        }),
        systemMessage: systemPrompt,
        verbose: process.env.NODE_ENV === 'development',
      }
    );

    return executor;
  }

  async safeModelCall(model, messages) {
    const validMessages = Array.isArray(messages) && messages.length > 0
      ? messages
      : [{ role: 'user', content: 'Hello!' }];

    return await model.call(validMessages);
  }

  async trackTokenUsage(userId, modelId, promptTokens, completionTokens, sessionId = null) {
    try {
      await db.query(
        `INSERT INTO token_usage 
         (user_id, model_id, prompt_tokens, completion_tokens, session_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, modelId, promptTokens, completionTokens, sessionId]
      );
    } catch (error) {
      console.error('Error tracking token usage:', error);
    }
  }

  clearMemory(sessionId) {
    if (this.memories.has(sessionId)) {
      this.memories.delete(sessionId);
    }
  }
}

module.exports = new LangChainService();
