// MCP Server configuration
module.exports = {
  defaultServer: {
    url: process.env.MCP_SERVER_URL || 'http://localhost:8080',
    apiKey: process.env.MCP_SERVER_API_KEY
  },
  
  toolCategories: [
    'research',
    'data_processing',
    'communication',
    'file_management',
    'academic',
    'administrative'
  ]
};