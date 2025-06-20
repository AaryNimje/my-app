const db = require('../config/database');
const { google } = require('googleapis');
const { OAuth2 } = google.auth;

class IntegrationController {
  constructor() {
    this.oauth2Client = new OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  // Get all integrations for user
  async getIntegrations(req, res) {
    try {
      const userId = req.user.id;

      const result = await db.query(
        `SELECT id, type, name, is_active, last_sync, created_at
         FROM integrations 
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      res.json({
        success: true,
        integrations: result.rows
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Initialize Google OAuth
  async initGoogleAuth(req, res) {
    try {
      const { integrationType } = req.body; // gmail, google_sheets, etc.

      const scopes = this.getGoogleScopes(integrationType);
      
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: JSON.stringify({
          userId: req.user.id,
          integrationType
        })
      });

      res.json({
        success: true,
        authUrl
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Google OAuth callback
  async googleCallback(req, res) {
    try {
      const { code, state } = req.query;
      const { userId, integrationType } = JSON.parse(state);

      // Exchange code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      // Get user info
      const oauth2 = google.oauth2({
        auth: this.oauth2Client,
        version: 'v2'
      });

      const { data } = await oauth2.userinfo.get();

      // Store integration
      const config = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type,
        expiry_date: tokens.expiry_date,
        email: data.email
      };

      await db.query(
        `INSERT INTO integrations (user_id, type, name, config)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, type, name) 
         DO UPDATE SET config = $4, is_active = true, updated_at = CURRENT_TIMESTAMP`,
        [userId, integrationType, data.email, JSON.stringify(config)]
      );

      // Redirect to frontend success page
      res.redirect(`${process.env.FRONTEND_URL}/integrations?success=true`);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/integrations?error=true`);
    }
  }

  // Add manual email integration (for email/password)
  async addEmailIntegration(req, res) {
    try {
      const { email, password, name } = req.body;
      const userId = req.user.id;

      const config = {
        email,
        password, // In production, encrypt this!
        name: name || email
      };

      const result = await db.query(
        `INSERT INTO integrations (user_id, type, name, config)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, type, name) 
         DO UPDATE SET config = $4, is_active = true, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [userId, 'gmail', email, JSON.stringify(config)]
      );

      res.json({
        success: true,
        integration: {
          id: result.rows[0].id,
          type: result.rows[0].type,
          name: result.rows[0].name,
          is_active: result.rows[0].is_active
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  getGoogleScopes(integrationType) {
    const scopeMap = {
      gmail: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify'
      ],
      google_sheets: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
      ],
      google_drive: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.readonly'
      ],
      google_calendar: [
        'https://www.googleapis.com/auth/calendar'
      ]
    };

    return scopeMap[integrationType] || [];
  }

  // Delete integration
  async deleteIntegration(req, res) {
    try {
      const { integrationId } = req.params;
      const userId = req.user.id;

      await db.query(
        'DELETE FROM integrations WHERE id = $1 AND user_id = $2',
        [integrationId, userId]
      );

      res.json({
        success: true,
        message: 'Integration deleted successfully'
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