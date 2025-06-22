// backend/src/controllers/authController.js
const bcrypt = require('bcrypt');
const db = require('../config/database');
const { generateToken } = require('../middleware/auth');
const { sendEmail } = require('../utils/emailService'); // You'll need to implement this

class AuthController {
  async register(req, res) {
    try {
      const { email, password, full_name, requested_role = 'student' } = req.body;

      // Check if user exists
      const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'User already exists' 
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Create user with pending status
      const result = await db.query(
        `INSERT INTO users (email, password_hash, full_name, role, requested_role, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         RETURNING id, email, full_name`,
        [email, passwordHash, full_name, requested_role, requested_role]
      );

      const user = result.rows[0];

      // Create registration request record
      await db.query(
        `INSERT INTO registration_requests (email, full_name, requested_role, user_id)
         VALUES ($1, $2, $3, $4)`,
        [email, full_name, requested_role, user.id]
      );

      // Notify admins (implement email/notification service)
      await this.notifyAdminsOfNewRegistration(user);

      res.status(201).json({
        success: true,
        message: 'Your signup request has been sent to admin. Please wait for approval.',
        requiresApproval: true
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Registration failed' 
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      const result = await db.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      const user = result.rows[0];

      // Check if user is approved
      if (user.status !== 'approved') {
        return res.status(403).json({
          success: false,
          error: 'Your account is pending approval. Please wait for admin approval.',
          status: user.status
        });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Update last login
      await db.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Generate token
      const token = generateToken(user.id);

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Login failed' 
      });
    }
  }

  async notifyAdminsOfNewRegistration(user) {
    // Get all admin users
    const admins = await db.query(
      'SELECT email FROM users WHERE role = $1 AND status = $2',
      ['admin', 'approved']
    );

    // Send notification to each admin
    for (const admin of admins.rows) {
      // Implement email notification or in-app notification
      console.log(`Notifying admin ${admin.email} of new registration from ${user.email}`);
    }
  }
}

module.exports = new AuthController();