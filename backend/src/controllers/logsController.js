// backend/src/controllers/logsController.js
const db = require('../config/database');

class LogsController {
  // Get execution logs
  async getExecutionLogs(req, res) {
    try {
      const userId = req.user.id;
      const { workflow_id, status, limit = 50, offset = 0 } = req.query;

      let query = `
        SELECT we.*, w.name as workflow_name 
        FROM workflow_executions we
        JOIN workflows w ON we.workflow_id = w.id
        WHERE we.user_id = $1
      `;
      const params = [userId];
      let paramIndex = 2;

      if (workflow_id) {
        query += ` AND we.workflow_id = $${paramIndex}`;
        params.push(workflow_id);
        paramIndex++;
      }

      if (status) {
        query += ` AND we.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      query += ` ORDER BY we.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await db.query(query, params);

      res.json({
        success: true,
        logs: result.rows,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: result.rowCount
        }
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
        `SELECT we.*, w.name as workflow_name, w.config as workflow_config
         FROM workflow_executions we
         JOIN workflows w ON we.workflow_id = w.id
         WHERE we.id = $1 AND we.user_id = $2`,
        [executionId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Execution not found'
        });
      }

      // Get node execution logs
      const nodeLogsResult = await db.query(
        `SELECT * FROM node_execution_logs 
         WHERE execution_id = $1 
         ORDER BY started_at`,
        [executionId]
      );

      res.json({
        success: true,
        execution: {
          ...result.rows[0],
          node_logs: nodeLogsResult.rows
        }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // Get system logs (admin only)
  async getSystemLogs(req, res) {
    try {
      const { level, service, limit = 100, offset = 0 } = req.query;

      let query = 'SELECT * FROM system_logs WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (level) {
        query += ` AND level = $${paramIndex}`;
        params.push(level);
        paramIndex++;
      }

      if (service) {
        query += ` AND service = $${paramIndex}`;
        params.push(service);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await db.query(query, params);

      res.json({
        success: true,
        logs: result.rows
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // Get error logs
  async getErrorLogs(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 50, offset = 0 } = req.query;

      const result = await db.query(
        `SELECT * FROM error_logs 
         WHERE user_id = $1 OR user_id IS NULL
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      res.json({
        success: true,
        errors: result.rows
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // Get activity logs
  async getActivityLogs(req, res) {
    try {
      const userId = req.user.id;
      const { action, limit = 50, offset = 0 } = req.query;

      let query = `
        SELECT * FROM activity_logs 
        WHERE user_id = $1
      `;
      const params = [userId];
      let paramIndex = 2;

      if (action) {
        query += ` AND action = $${paramIndex}`;
        params.push(action);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await db.query(query, params);

      res.json({
        success: true,
        activities: result.rows
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // Get token usage logs
  async getTokenUsageLogs(req, res) {
    try {
      const userId = req.user.id;
      const { model_id, start_date, end_date, limit = 50 } = req.query;

      let query = `
        SELECT tu.*, lm.display_name as model_name, lm.provider
        FROM token_usage tu
        JOIN llm_models lm ON tu.model_id = lm.id
        WHERE tu.user_id = $1
      `;
      const params = [userId];
      let paramIndex = 2;

      if (model_id) {
        query += ` AND tu.model_id = $${paramIndex}`;
        params.push(model_id);
        paramIndex++;
      }

      if (start_date) {
        query += ` AND tu.created_at >= $${paramIndex}`;
        params.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        query += ` AND tu.created_at <= $${paramIndex}`;
        params.push(end_date);
        paramIndex++;
      }

      query += ` ORDER BY tu.created_at DESC LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await db.query(query, params);

      // Calculate totals
      const totalsResult = await db.query(
        `SELECT 
          SUM(prompt_tokens) as total_prompt_tokens,
          SUM(completion_tokens) as total_completion_tokens,
          SUM(total_tokens) as total_tokens,
          COUNT(*) as total_requests
         FROM token_usage
         WHERE user_id = $1`,
        [userId]
      );

      res.json({
        success: true,
        usage: result.rows,
        totals: totalsResult.rows[0]
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // Export logs
  async exportLogs(req, res) {
    try {
      const userId = req.user.id;
      const { type, format = 'json', start_date, end_date } = req.body;

      // TODO: Implement log export functionality
      // This would export logs in CSV or JSON format

      res.json({
        success: true,
        message: 'Export functionality not yet implemented'
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
}

module.exports = new LogsController();