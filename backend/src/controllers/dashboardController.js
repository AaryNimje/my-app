// backend/src/controllers/dashboardController.js
const db = require('../config/database');

class DashboardController {
  async getStats(req, res) {
    try {
      const userId = req.user.id;
      
      // Get user stats
      const [
        agentCount,
        workflowCount,
        chatCount,
        integrationCount
      ] = await Promise.all([
        // Count agents
        db.query(
          'SELECT COUNT(*) as count FROM ai_agents WHERE user_id = $1',
          [userId]
        ),
        // Count workflows
        db.query(
          'SELECT COUNT(*) as count FROM workflows WHERE user_id = $1',
          [userId]
        ),
        // Count active chats
        db.query(
          'SELECT COUNT(*) as count FROM chat_sessions WHERE user_id = $1 AND is_active = true',
          [userId]
        ),
        // Count integrations
        db.query(
          'SELECT COUNT(*) as count FROM integrations WHERE user_id = $1',
          [userId]
        )
      ]);

      // Get recent activity
      const recentActivity = await db.query(
        `SELECT 
           'chat' as type,
           cs.title as description,
           cs.created_at,
           cs.id
         FROM chat_sessions cs
         WHERE cs.user_id = $1
         UNION ALL
         SELECT 
           'workflow' as type,
           w.name as description,
           w.created_at,
           w.id
         FROM workflows w
         WHERE w.user_id = $1
         UNION ALL
         SELECT 
           'agent' as type,
           aa.name as description,
           aa.created_at,
           aa.id
         FROM ai_agents aa
         WHERE aa.user_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [userId]
      );

      // Get token usage for today
      const tokenUsage = await db.query(
        `SELECT 
           SUM(prompt_tokens + completion_tokens) as total_tokens,
           COUNT(*) as request_count
         FROM token_usage
         WHERE user_id = $1 
         AND created_at >= CURRENT_DATE`,
        [userId]
      );

      res.json({
        success: true,
        stats: {
          agents: parseInt(agentCount.rows[0].count),
          workflows: parseInt(workflowCount.rows[0].count),
          activeChats: parseInt(chatCount.rows[0].count),
          integrations: parseInt(integrationCount.rows[0].count),
          tokensToday: parseInt(tokenUsage.rows[0].total_tokens || 0),
          requestsToday: parseInt(tokenUsage.rows[0].request_count || 0),
          recentActivity: recentActivity.rows
        }
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new DashboardController();