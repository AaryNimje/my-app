const db = require('../config/database');
const { CronJob } = require('cron');
const EventEmitter = require('events');

class AutonomousAgentService extends EventEmitter {
  constructor() {
    super();
    this.activeJobs = new Map();
    this.initializeAgents();
  }

  async initializeAgents() {
    // Load all autonomous agents on startup
    const result = await db.query(
      `SELECT a.*, t.trigger_type, t.trigger_config 
       FROM ai_agents a
       JOIN autonomous_agent_triggers t ON a.id = t.agent_id
       WHERE a.is_autonomous = true AND t.is_active = true`
    );
    
    for (const agent of result.rows) {
      this.scheduleAgent(agent);
    }
  }

  scheduleAgent(agent) {
    if (agent.trigger_type === 'schedule') {
      const cronExpression = agent.trigger_config.cron;
      
      const job = new CronJob(cronExpression, async () => {
        await this.executeAutonomousAgent(agent.id);
      });
      
      job.start();
      this.activeJobs.set(agent.id, job);
    }
    // Add other trigger types (webhook, event, etc.)
  }

  async executeAutonomousAgent(agentId) {
    try {
      // Create workflow execution
      const execResult = await db.query(
        `INSERT INTO workflow_executions 
         (workflow_id, user_id, trigger_type, trigger_details, status)
         SELECT a.workflow_node_id, a.user_id, 'autonomous', 
                jsonb_build_object('agent_id', a.id), 'running'
         FROM ai_agents a
         WHERE a.id = $1
         RETURNING *`,
        [agentId]
      );
      
      const execution = execResult.rows[0];
      
      // Execute the agent's workflow
      // This would trigger the workflow execution
      this.emit('agent-executed', { agentId, executionId: execution.id });
      
      // Update last triggered time
      await db.query(
        'UPDATE autonomous_agent_triggers SET last_triggered_at = CURRENT_TIMESTAMP WHERE agent_id = $1',
        [agentId]
      );
      
    } catch (error) {
      console.error('Autonomous agent execution error:', error);
      this.emit('agent-error', { agentId, error });
    }
  }

  async createAlert(agentId, userId, alertData) {
    const { alert_type, severity, title, message, data } = alertData;
    
    const result = await db.query(
      `INSERT INTO agent_alerts 
       (agent_id, user_id, alert_type, severity, title, message, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [agentId, userId, alert_type, severity, title, message, data]
    );
    
    // Emit alert event for real-time notifications
    this.emit('alert-created', result.rows[0]);
    
    return result.rows[0];
  }
}

module.exports = new AutonomousAgentService();