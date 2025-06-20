// Configuration for LangChain and AI models
const { ChatOpenAI } = require('@langchain/openai');
const { ChatAnthropic } = require('@langchain/anthropic');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { ChatGroq } = require('@langchain/groq');

class LangChainConfig {
  constructor() {
    this.models = new Map();
    this.initializeModels();
  }

  initializeModels() {
    // Copy the initializeModels function from LangChainService
  }

  getModelConfig(provider, modelName) {
    return {
      provider,
      modelName,
      apiKey: process.env[`${provider.toUpperCase()}_API_KEY`]
    };
  }
}

module.exports = new LangChainConfig();