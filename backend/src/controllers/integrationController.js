// backend/src/controllers/integrationController.js
const db = require('../config/database');
const crypto = require('crypto');

class IntegrationController {
  // Get all integrations for user
  async getIntegrations(req, res) {
    try {
      const userId = req.user.id;
      
      const result = await db.query(
        `SELECT id, name, type, email, status, connected_at 
         FROM integrations 
         WHERE user_id = $1 
         ORDER BY connected_at DESC`,
        [userId]
      );

      res.json({
        success: true,
        integrations: result.rows
      });
    } catch (error) {
      console.error('Get integrations error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Add email integration
  async addEmailIntegration(req, res) {
    try {
      const { email, password, name } = req.body;
      const userId = req.user.id;

      // Simple encryption (in production, use proper encryption)
      const encryptedCredentials = {
        email,
        password: Buffer.from(password).toString('base64'),
        imap_host: 'imap.gmail.com',
        imap_port: 993,
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587
      };

      const result = await db.query(
        `INSERT INTO integrations (user_id, name, type, email, credentials, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, type, email, status, connected_at`,
        [userId, name, 'email', email, encryptedCredentials, 'active']
      );

      res.json({
        success: true,
        integration: result.rows[0]
      });
    } catch (error) {
      console.error('Add email integration error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Delete integration
  async deleteIntegration(req, res) {
    try {
      const { integrationId } = req.params;
      const userId = req.user.id;

      const result = await db.query(
        `DELETE FROM integrations 
         WHERE id = $1 AND user_id = $2 
         RETURNING id`,
        [integrationId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Integration not found'
        });
      }

      res.json({
        success: true,
        message: 'Integration deleted successfully'
      });
    } catch (error) {
      console.error('Delete integration error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Google OAuth placeholder
  async googleAuth(req, res) {
    try {
      const { integrationType } = req.body;
      
      // In production, implement actual Google OAuth
      res.json({
        success: false,
        error: 'Google OAuth not implemented yet. Please use email integration for now.'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new IntegrationController();