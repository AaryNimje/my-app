// backend/src/services/workflowService.js
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');
const llmService = require('./llmService');
const emailAgent = require('../agents/emailAgent');

class WorkflowService extends EventEmitter {
  constructor() {
    super();
    this.executionQueue = [];
    this.activeExecutions = new Map();
  }

  async createWorkflow(userId, workflowData) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create workflow
      const workflowResult = await client.query(
        `INSERT INTO workflows (user_id, name, description, config, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          userId,
          workflowData.name,
          workflowData.description,
          JSON.stringify(workflowData.config || {}),
          true
        ]
      );

      const workflow = workflowResult.rows[0];

      // Create workflow nodes
      if (workflowData.nodes && workflowData.nodes.length > 0) {
        for (const node of workflowData.nodes) {
          await client.query(
            `INSERT INTO workflow_nodes 
             (workflow_id, node_id, node_type, position, data, config)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              workflow.id,
              node.id,
              node.type,
              JSON.stringify(node.position),
              JSON.stringify(node.data || {}),
              JSON.stringify(node.config || {})
            ]
          );
        }
      }

      // Create workflow connections
      if (workflowData.edges && workflowData.edges.length > 0) {
        for (const edge of workflowData.edges) {
          await client.query(
            `INSERT INTO workflow_connections 
             (workflow_id, source_node_id, source_handle, target_node_id, target_handle)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              workflow.id,
              edge.source,
              edge.sourceHandle || 'default',
              edge.target,
              edge.targetHandle || 'default'
            ]
          );
        }
      }

      await client.query('COMMIT');
      return workflow;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateWorkflow(workflowId, userId, workflowData) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update workflow
      const workflowResult = await client.query(
        `UPDATE workflows 
         SET name = $1, description = $2, config = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 AND user_id = $5
         RETURNING *`,
        [
          workflowData.name,
          workflowData.description,
          JSON.stringify(workflowData.config || {}),
          workflowId,
          userId
        ]
      );

      if (workflowResult.rows.length === 0) {
        throw new Error('Workflow not found or access denied');
      }

      // Delete existing nodes and connections
      await client.query('DELETE FROM workflow_connections WHERE workflow_id = $1', [workflowId]);
      await client.query('DELETE FROM workflow_nodes WHERE workflow_id = $1', [workflowId]);

      // Recreate nodes
      if (workflowData.nodes && workflowData.nodes.length > 0) {
        for (const node of workflowData.nodes) {
          await client.query(
            `INSERT INTO workflow_nodes 
             (workflow_id, node_id, node_type, position, data, config)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              workflowId,
              node.id,
              node.type,
              JSON.stringify(node.position),
              JSON.stringify(node.data || {}),
              JSON.stringify(node.config || {})
            ]
          );
        }
      }

      // Recreate connections
      if (workflowData.edges && workflowData.edges.length > 0) {
        for (const edge of workflowData.edges) {
          await client.query(
            `INSERT INTO workflow_connections 
             (workflow_id, source_node_id, source_handle, target_node_id, target_handle)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              workflowId,
              edge.source,
              edge.sourceHandle || 'default',
              edge.target,
              edge.targetHandle || 'default'
            ]
          );
        }
      }

      await client.query('COMMIT');
      return workflowResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async executeWorkflow(workflowId, userId, inputData = {}) {
    // Create execution record
    const executionResult = await db.query(
      `INSERT INTO workflow_executions 
       (workflow_id, user_id, status, input_data, started_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [workflowId, userId, 'running', JSON.stringify(inputData)]
    );

    const execution = executionResult.rows[0];
    
    // Start async execution
    this.processWorkflow(execution.id, workflowId, userId, inputData)
      .catch(error => {
        console.error('Workflow execution error:', error);
        this.updateExecutionStatus(execution.id, 'failed', null, error.message);
      });

    return execution;
  }

  async processWorkflow(executionId, workflowId, userId, inputData) {
    try {
      // Get workflow details
      const workflowResult = await db.query(
        'SELECT * FROM workflows WHERE id = $1 AND user_id = $2',
        [workflowId, userId]
      );

      if (workflowResult.rows.length === 0) {
        throw new Error('Workflow not found');
      }

      const workflow = workflowResult.rows[0];

      // Get nodes and connections
      const nodesResult = await db.query(
        'SELECT * FROM workflow_nodes WHERE workflow_id = $1',
        [workflowId]
      );

      const connectionsResult = await db.query(
        'SELECT * FROM workflow_connections WHERE workflow_id = $1',
        [workflowId]
      );

      const nodes = nodesResult.rows;
      const connections = connectionsResult.rows;

      // Build execution graph
      const graph = this.buildExecutionGraph(nodes, connections);
      
      // Execute nodes in order
      const results = {};
      const executedNodes = new Set();
      
      // Find start nodes (nodes with no incoming connections)
      const startNodes = nodes.filter(node => 
        !connections.some(conn => conn.target_node_id === node.node_id)
      );

      // Process nodes
      for (const startNode of startNodes) {
        await this.executeNode(
          startNode, 
          graph, 
          results, 
          executedNodes, 
          userId,
          inputData
        );
      }

      // Update execution status
      await this.updateExecutionStatus(executionId, 'completed', results);

    } catch (error) {
      await this.updateExecutionStatus(executionId, 'failed', null, error.message);
      throw error;
    }
  }

  buildExecutionGraph(nodes, connections) {
    const graph = new Map();

    // Initialize graph
    nodes.forEach(node => {
      graph.set(node.node_id, {
        node,
        inputs: [],
        outputs: []
      });
    });

    // Build connections
    connections.forEach(conn => {
      const source = graph.get(conn.source_node_id);
      const target = graph.get(conn.target_node_id);
      
      if (source && target) {
        source.outputs.push({
          targetId: conn.target_node_id,
          sourceHandle: conn.source_handle,
          targetHandle: conn.target_handle
        });
        
        target.inputs.push({
          sourceId: conn.source_node_id,
          sourceHandle: conn.source_handle,
          targetHandle: conn.target_handle
        });
      }
    });

    return graph;
  }

  async executeNode(node, graph, results, executedNodes, userId, initialInput) {
    if (executedNodes.has(node.node_id)) {
      return results[node.node_id];
    }

    const nodeInfo = graph.get(node.node_id);
    if (!nodeInfo) return null;

    // Wait for input nodes to complete
    const inputData = {};
    for (const input of nodeInfo.inputs) {
      const sourceNode = graph.get(input.sourceId);
      if (sourceNode && !executedNodes.has(input.sourceId)) {
        await this.executeNode(
          sourceNode.node, 
          graph, 
          results, 
          executedNodes, 
          userId,
          initialInput
        );
      }
      
      if (results[input.sourceId]) {
        inputData[input.targetHandle] = results[input.sourceId];
      }
    }

    // Execute node based on type
    let result = null;
    try {
      result = await this.executeNodeByType(
        node, 
        Object.keys(inputData).length > 0 ? inputData : initialInput,
        userId
      );
    } catch (error) {
      console.error(`Error executing node ${node.node_id}:`, error);
      result = { error: error.message };
    }

    results[node.node_id] = result;
    executedNodes.add(node.node_id);

    // Execute output nodes
    for (const output of nodeInfo.outputs) {
      const targetNode = graph.get(output.targetId);
      if (targetNode) {
        await this.executeNode(
          targetNode.node,
          graph,
          results,
          executedNodes,
          userId,
          initialInput
        );
      }
    }

    return result;
  }

  async executeNodeByType(node, inputData, userId) {
    const { node_type, data, config } = node;

    switch (node_type) {
      case 'input':
        return inputData;

      case 'output':
        return inputData;

      case 'llm':
        return await this.executeLLMNode(data, config, inputData, userId);

      case 'email':
        return await this.executeEmailNode(data, config, inputData, userId);

      case 'condition':
        return await this.executeConditionNode(data, config, inputData);

      case 'transform':
        return await this.executeTransformNode(data, config, inputData);

      case 'http':
        return await this.executeHTTPNode(data, config, inputData);

      default:
        throw new Error(`Unknown node type: ${node_type}`);
    }
  }

  async executeLLMNode(data, config, inputData, userId) {
    const prompt = config.prompt || data.prompt || '';
    const model = config.model || 'gpt-3.5-turbo';
    const temperature = config.temperature || 0.7;

    const processedPrompt = this.processTemplate(prompt, inputData);

    const response = await llmService.complete({
      model,
      prompt: processedPrompt,
      temperature,
      userId
    });

    return {
      text: response.text,
      usage: response.usage
    };
  }

  async executeEmailNode(data, config, inputData, userId) {
    // Get user's email integration
    const integrationResult = await db.query(
      `SELECT * FROM integrations 
       WHERE user_id = $1 AND type = 'email' AND is_active = true
       LIMIT 1`,
      [userId]
    );

    if (integrationResult.rows.length === 0) {
      throw new Error('No active email integration found');
    }

    const integration = integrationResult.rows[0];
    const action = config.action || data.action || 'read';

    // Create email agent instance
    const agent = new emailAgent(integration.config, null);

    switch (action) {
      case 'read':
        return await agent.readEmails();
      
      case 'send':
        const recipient = config.recipient || inputData.recipient;
        const subject = config.subject || inputData.subject;
        const body = config.body || inputData.body;
        
        if (!recipient || !subject || !body) {
          throw new Error('Missing required email fields');
        }
        
        return await agent.sendEmail(`${recipient}|${subject}|${body}`);
      
      case 'search':
        const query = config.query || inputData.query || '';
        return await agent.searchEmails(query);
      
      default:
        throw new Error(`Unknown email action: ${action}`);
    }
  }

  async executeConditionNode(data, config, inputData) {
    const condition = config.condition || data.condition;
    if (!condition) {
      throw new Error('No condition specified');
    }

    const result = this.evaluateCondition(condition, inputData);
    return { result, branch: result ? 'true' : 'false' };
  }

  async executeTransformNode(data, config, inputData) {
    const transformation = config.transformation || data.transformation;
    if (!transformation) {
      return inputData;
    }

    try {
      // Simple JSON path extraction
      if (transformation.startsWith('$.')) {
        const path = transformation.substring(2).split('.');
        let result = inputData;
        for (const key of path) {
          result = result[key];
        }
        return result;
      }

      // JavaScript expression (careful with security!)
      const func = new Function('data', `return ${transformation}`);
      return func(inputData);
    } catch (error) {
      throw new Error(`Transform error: ${error.message}`);
    }
  }

  async executeHTTPNode(data, config, inputData) {
    const axios = require('axios');
    
    const url = this.processTemplate(config.url || data.url, inputData);
    const method = (config.method || data.method || 'GET').toUpperCase();
    const headers = config.headers || data.headers || {};
    const body = config.body || data.body || inputData;

    try {
      const response = await axios({
        method,
        url,
        headers,
        data: method !== 'GET' ? body : undefined
      });

      return {
        status: response.status,
        data: response.data,
        headers: response.headers
      };
    } catch (error) {
      return {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      };
    }
  }

  processTemplate(template, data) {
    if (!template || typeof template !== 'string') {
      return template;
    }

    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const keys = key.trim().split('.');
      let value = data;
      
      for (const k of keys) {
        value = value?.[k];
      }
      
      return value !== undefined ? value : match;
    });
  }

  evaluateCondition(condition, data) {
    try {
      // Simple equality check
      if (condition.includes('==')) {
        const [left, right] = condition.split('==').map(s => s.trim());
        const leftValue = this.extractValue(left, data);
        const rightValue = this.extractValue(right, data);
        return leftValue == rightValue;
      }

      // JavaScript expression (careful with security!)
      const func = new Function('data', `return ${condition}`);
      return func(data);
    } catch (error) {
      console.error('Condition evaluation error:', error);
      return false;
    }
  }

  extractValue(expression, data) {
    if (expression.startsWith('"') && expression.endsWith('"')) {
      return expression.slice(1, -1);
    }
    
    if (expression.startsWith("'") && expression.endsWith("'")) {
      return expression.slice(1, -1);
    }
    
    if (!isNaN(expression)) {
      return Number(expression);
    }
    
    // Variable reference
    const keys = expression.split('.');
    let value = data;
    
    for (const key of keys) {
      value = value?.[key];
    }
    
    return value;
  }

  async updateExecutionStatus(executionId, status, outputData = null, error = null) {
    await db.query(
      `UPDATE workflow_executions 
       SET status = $1, output_data = $2, error = $3, 
           completed_at = CASE WHEN $1 IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE NULL END
       WHERE id = $4`,
      [status, outputData ? JSON.stringify(outputData) : null, error, executionId]
    );

    this.emit('execution:status', { executionId, status, outputData, error });
  }
}

module.exports = new WorkflowService();