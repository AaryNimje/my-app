const db = require('../config/database');
const WorkflowNode = require('../models/WorkflowNode');
const workflowService = require('../services/workflowService');

class WorkflowController {
  // Create new workflow
  async createWorkflow(req, res) {
    try {
      const { name, description, category, tags } = req.body;
      const userId = req.user.id;

      const result = await db.query(
        `INSERT INTO workflows (user_id, name, description, category, tags)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, name, description, category, tags]
      );

      res.status(201).json({
        success: true,
        workflow: result.rows[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get all workflows for user
  async getWorkflows(req, res) {
    try {
      const userId = req.user.id;
      const result = await db.query(
        `SELECT * FROM workflows WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      );

      res.json({
        success: true,
        workflows: result.rows
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get single workflow
  async getWorkflow(req, res) {
    try {
      const { workflowId } = req.params;
      const userId = req.user.id;

      const result = await db.query(
        `SELECT * FROM workflows WHERE id = $1 AND user_id = $2`,
        [workflowId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
      }

      res.json({
        success: true,
        workflow: result.rows[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Save workflow with nodes and connections
  async saveWorkflow(req, res) {
    try {
      const { workflowId } = req.params;
      const { nodes, connections, canvas_state, global_variables } = req.body;
      const userId = req.user.id;

      // Start transaction
      await db.query('BEGIN');

      // Update workflow
      await db.query(
        `UPDATE workflows 
         SET canvas_state = $1, global_variables = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND user_id = $4`,
        [canvas_state, global_variables, workflowId, userId]
      );

      // Delete existing nodes and connections
      await db.query('DELETE FROM workflow_connections WHERE workflow_id = $1', [workflowId]);
      await db.query('DELETE FROM workflow_nodes WHERE workflow_id = $1', [workflowId]);

      // Insert new nodes
      for (const node of nodes) {
        await WorkflowNode.create(workflowId, node);
      }

      // Insert connections
      for (const connection of connections) {
        await db.query(
          `INSERT INTO workflow_connections 
           (workflow_id, source_node_id, source_handle, target_node_id, target_handle, transform_config)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            workflowId,
            connection.source,
            connection.sourceHandle || 'output',
            connection.target,
            connection.targetHandle || 'input',
            connection.transform_config
          ]
        );
      }

      await db.query('COMMIT');

      res.json({
        success: true,
        message: 'Workflow saved successfully'
      });
    } catch (error) {
      await db.query('ROLLBACK');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Delete workflow
  async deleteWorkflow(req, res) {
    try {
      const { workflowId } = req.params;
      const userId = req.user.id;

      const result = await db.query(
        `DELETE FROM workflows WHERE id = $1 AND user_id = $2 RETURNING id`,
        [workflowId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
      }

      res.json({
        success: true,
        message: 'Workflow deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Execute workflow
  async executeWorkflow(req, res) {
    try {
      const { workflowId } = req.params;
      const { input_data } = req.body;
      const userId = req.user.id;

      const execution = await workflowService.executeWorkflow(
        workflowId,
        userId,
        input_data
      );

      res.json({
        success: true,
        execution
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get workflow executions
  async getExecutions(req, res) {
    try {
      const { workflowId } = req.params;
      const userId = req.user.id;

      const result = await db.query(
        `SELECT * FROM workflow_executions 
         WHERE workflow_id = $1 AND user_id = $2
         ORDER BY created_at DESC
         LIMIT 50`,
        [workflowId, userId]
      );

      res.json({
        success: true,
        executions: result.rows
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get execution details
  async getExecutionDetails(req, res) {
    try {
      const { executionId } = req.params;
      const userId = req.user.id;

      const result = await db.query(
        `SELECT we.*, w.name as workflow_name 
         FROM workflow_executions we
         JOIN workflows w ON we.workflow_id = w.id
         WHERE we.id = $1 AND w.user_id = $2`,
        [executionId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Execution not found'
        });
      }

      res.json({
        success: true,
        execution: result.rows[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get workflow templates (NEW METHOD)
  async getTemplates(req, res) {
    try {
      // Define some basic templates
      const templates = [
        {
          id: 'email-assistant',
          name: 'Email Assistant',
          description: 'Automated email handling and response generation',
          category: 'communication',
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: {
                label: 'Email Trigger',
                config: { type: 'email_received' }
              }
            },
            {
              id: 'agent-1',
              type: 'agent',
              position: { x: 300, y: 100 },
              data: {
                label: 'Email Processor',
                config: { agentType: 'email' }
              }
            }
          ],
          connections: [
            {
              source: 'trigger-1',
              target: 'agent-1',
              sourceHandle: 'output',
              targetHandle: 'input'
            }
          ]
        },
        {
          id: 'data-analysis',
          name: 'Data Analysis Pipeline',
          description: 'Process and analyze data from various sources',
          category: 'analytics',
          nodes: [
            {
              id: 'file-1',
              type: 'file',
              position: { x: 100, y: 100 },
              data: {
                label: 'Data Input',
                config: { fileType: 'csv' }
              }
            },
            {
              id: 'llm-1',
              type: 'llm',
              position: { x: 300, y: 100 },
              data: {
                label: 'Data Analyzer',
                config: { model: 'gpt-4' }
              }
            }
          ],
          connections: [
            {
              source: 'file-1',
              target: 'llm-1',
              sourceHandle: 'output',
              targetHandle: 'input'
            }
          ]
        }
      ];

      res.json({
        success: true,
        templates
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Use workflow template (NEW METHOD)
  async useTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const { name, description } = req.body;
      const userId = req.user.id;

      // Get template (in real app, this would come from database)
      const templates = {
        'email-assistant': {
          name: 'Email Assistant',
          description: 'Automated email handling and response generation',
          category: 'communication',
          canvas_state: {
            nodes: [
              {
                id: 'trigger-1',
                type: 'trigger',
                position: { x: 100, y: 100 },
                data: {
                  label: 'Email Trigger',
                  config: { type: 'email_received' }
                }
              },
              {
                id: 'agent-1',
                type: 'agent',
                position: { x: 300, y: 100 },
                data: {
                  label: 'Email Processor',
                  config: { agentType: 'email' }
                }
              }
            ],
            connections: [
              {
                source: 'trigger-1',
                target: 'agent-1',
                sourceHandle: 'output',
                targetHandle: 'input'
              }
            ]
          }
        }
      };

      const template = templates[templateId];
      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }

      // Create new workflow from template
      const result = await db.query(
        `INSERT INTO workflows (user_id, name, description, category, canvas_state)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          userId,
          name || template.name,
          description || template.description,
          template.category,
          template.canvas_state
        ]
      );

      res.json({
        success: true,
        workflow: result.rows[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new WorkflowController();