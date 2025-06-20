const db = require('../config/database');

class WorkflowNode {
  static async create(workflowId, nodeData) {
    const {
      id,
      name,
      node_type,
      position,
      config,
      ui_config
    } = nodeData;

    const result = await db.query(
      `INSERT INTO workflow_nodes 
       (id, workflow_id, name, node_type, position, config, ui_config)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id,
        workflowId,
        name,
        node_type,
        position,
        config,
        ui_config
      ]
    );

    return result.rows[0];
  }

  static async findById(nodeId) {
    const result = await db.query(
      'SELECT * FROM workflow_nodes WHERE id = $1',
      [nodeId]
    );

    return result.rows[0];
  }

  static async findByWorkflow(workflowId) {
    const result = await db.query(
      'SELECT * FROM workflow_nodes WHERE workflow_id = $1',
      [workflowId]
    );

    return result.rows;
  }

  static async update(nodeId, updates) {
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (['name', 'position', 'config', 'ui_config'].includes(key)) {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(nodeId);
    const query = `
      UPDATE workflow_nodes 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async delete(nodeId) {
    // Delete connections first
    await db.query(
      'DELETE FROM workflow_connections WHERE source_node_id = $1 OR target_node_id = $1',
      [nodeId]
    );

    // Delete node
    const result = await db.query(
      'DELETE FROM workflow_nodes WHERE id = $1 RETURNING id',
      [nodeId]
    );

    return result.rows.length > 0;
  }

  static async getExecutionStats(nodeId) {
    const result = await db.query(
      `SELECT 
         COUNT(*) as total_executions,
         COUNT(*) FILTER (WHERE status = 'completed') as successful_executions,
         COUNT(*) FILTER (WHERE status = 'failed') as failed_executions,
         AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration_seconds
       FROM node_executions
       WHERE node_id = $1`,
      [nodeId]
    );

    return result.rows[0];
  }

  static validateNodeType(nodeType) {
    const validTypes = [
      'trigger',
      'llm',
      'agent',
      'tool',
      'condition',
      'loop',
      'memory',
      'transform',
      'webhook',
      'output'
    ];

    return validTypes.includes(nodeType);
  }

  static getDefaultConfig(nodeType) {
    const defaults = {
      trigger: {
        trigger_type: 'manual',
        schedule: null
      },
      llm: {
        model_id: null,
        prompt: '',
        temperature: 0.7,
        max_tokens: 1000
      },
      agent: {
        agent_id: null,
        timeout: 300
      },
      tool: {
        tool_id: null,
        retry_count: 3
      },
      condition: {
        condition: {
          field: '',
          operator: 'equals',
          value: ''
        }
      },
      loop: {
        loop_type: 'for_each',
        max_iterations: 10
      },
      memory: {
        operation: 'store',
        memory_key: ''
      },
      transform: {
        transformation: 'json',
        template: ''
      },
      webhook: {
        url: '',
        method: 'POST',
        headers: {}
      },
      output: {
        output_format: 'json'
      }
    };

    return defaults[nodeType] || {};
  }
}

module.exports = WorkflowNode;