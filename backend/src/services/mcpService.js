const axios = require('axios');
const { DynamicTool } = require('@langchain/core/tools');
const db = require('../config/database');

class MCPService {
  constructor() {
    this.mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:8080';
    this.apiKey = process.env.MCP_SERVER_API_KEY;
  }

  // Execute tool via MCP server
  async executeTool(toolName, inputs) {
    try {
      const response = await axios.post(
        `${this.mcpServerUrl}/tools/${toolName}/execute`,
        {
          inputs,
          apiKey: this.apiKey
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error(`MCP tool execution error for ${toolName}:`, error);
      throw new Error(`Failed to execute tool ${toolName}: ${error.message}`);
    }
  }

  // List available tools from MCP server
  async listTools() {
    try {
      const response = await axios.get(
        `${this.mcpServerUrl}/tools`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      return response.data.tools;
    } catch (error) {
      console.error('Failed to list MCP tools:', error);
      return [];
    }
  }

  // Sync tools from MCP server to database
  async syncTools() {
    try {
      const tools = await this.listTools();
      
      // Get default MCP server
      const serverResult = await db.query(
        'SELECT id FROM mcp_servers WHERE name = $1',
        ['Default Tools Server']
      );

      if (serverResult.rows.length === 0) {
        throw new Error('Default MCP server not found');
      }

      const serverId = serverResult.rows[0].id;

      // Sync each tool
      for (const tool of tools) {
        await db.query(
          `INSERT INTO mcp_tools 
           (mcp_server_id, tool_name, display_name, description, category, input_schema, output_schema)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (mcp_server_id, tool_name) 
           DO UPDATE SET 
             display_name = $3,
             description = $4,
             category = $5,
             input_schema = $6,
             output_schema = $7,
             updated_at = CURRENT_TIMESTAMP`,
          [
            serverId,
            tool.name,
            tool.displayName || tool.name,
            tool.description,
            tool.category || 'general',
            tool.inputSchema,
            tool.outputSchema
          ]
        );
      }

      return tools.length;
    } catch (error) {
      console.error('Tool sync error:', error);
      throw error;
    }
  }

  // Create LangChain tools from MCP tools
  async createLangChainTools(mcpTools) {
    const langchainTools = [];

    for (const tool of mcpTools) {
      const langchainTool = new DynamicTool({
        name: tool.tool_name,
        description: tool.description,
        func: async (input) => {
          try {
            // Parse input if it's a string
            const parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
            
            // Execute via MCP
            const result = await this.executeTool(tool.tool_name, parsedInput);
            
            // Return result as string for LangChain
            return typeof result === 'object' ? JSON.stringify(result) : String(result);
          } catch (error) {
            return `Error executing ${tool.tool_name}: ${error.message}`;
          }
        }
      });

      langchainTools.push(langchainTool);
    }

    return langchainTools;
  }

  // Register custom tool
  async registerCustomTool(toolDefinition) {
    try {
      const response = await axios.post(
        `${this.mcpServerUrl}/tools/register`,
        {
          ...toolDefinition,
          apiKey: this.apiKey
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Store in database
      const serverResult = await db.query(
        'SELECT id FROM mcp_servers WHERE name = $1',
        ['Default Tools Server']
      );

      if (serverResult.rows.length > 0) {
        await db.query(
          `INSERT INTO mcp_tools 
           (mcp_server_id, tool_name, display_name, description, category, input_schema, output_schema)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            serverResult.rows[0].id,
            toolDefinition.name,
            toolDefinition.displayName || toolDefinition.name,
            toolDefinition.description,
            toolDefinition.category || 'custom',
            toolDefinition.inputSchema,
            toolDefinition.outputSchema
          ]
        );
      }

      return response.data;
    } catch (error) {
      console.error('Failed to register custom tool:', error);
      throw error;
    }
  }

  // Get tool details
  async getToolDetails(toolName) {
    try {
      const result = await db.query(
        'SELECT * FROM mcp_tools WHERE tool_name = $1',
        [toolName]
      );

      if (result.rows.length === 0) {
        throw new Error(`Tool ${toolName} not found`);
      }

      return result.rows[0];
    } catch (error) {
      console.error(`Failed to get tool details for ${toolName}:`, error);
      throw error;
    }
  }

  // Validate tool inputs
  validateToolInputs(inputSchema, inputs) {
    // Basic JSON schema validation
    // In production, use a proper JSON schema validator
    const required = inputSchema.required || [];
    const properties = inputSchema.properties || {};

    for (const field of required) {
      if (!(field in inputs)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    for (const [field, value] of Object.entries(inputs)) {
      if (properties[field]) {
        const expectedType = properties[field].type;
        const actualType = Array.isArray(value) ? 'array' : typeof value;

        if (expectedType && actualType !== expectedType) {
          throw new Error(`Invalid type for field ${field}: expected ${expectedType}, got ${actualType}`);
        }
      }
    }

    return true;
  }

  // Execute batch tools
  async executeBatch(toolExecutions) {
    const results = [];

    for (const execution of toolExecutions) {
      try {
        const result = await this.executeTool(execution.toolName, execution.inputs);
        results.push({
          toolName: execution.toolName,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          toolName: execution.toolName,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }
}

module.exports = new MCPService();