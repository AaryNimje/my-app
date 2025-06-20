// backend/src/controllers/authController.js
const bcrypt = require('bcrypt');
const db = require('../config/database');
const { generateToken } = require('../middleware/auth');

class AuthController {
  async register(req, res) {
    try {
      const { email, password, full_name } = req.body;

      console.log('Registration attempt for:', email);

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

      // Create user
      const result = await db.query(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, full_name, role`,
        [email, passwordHash, full_name, 'user']
      );

      const user = result.rows[0];

      // Generate token
      const token = generateToken(user.id);

      res.status(201).json({
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
      
      console.log('Login attempt for:', email);

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      // Get user - removed is_active check for now
      const result = await db.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      console.log('User query result:', result.rows.length > 0 ? 'User found' : 'User not found');

      if (result.rows.length === 0) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid credentials' 
        });
      }

      const user = result.rows[0];

      // Check password
      const isMatch = await bcrypt.compare(password, user.password_hash);
      console.log('Password match:', isMatch);
      
      if (!isMatch) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid credentials' 
        });
      }

      // Update last login (optional)
      await db.query(
        'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Generate token
      const token = generateToken(user.id);

      console.log('Login successful for:', email);

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

  async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const result = await db.query(
        `SELECT id, email, full_name, role, created_at, updated_at
         FROM users
         WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
      }

      const user = result.rows[0];

      res.json({
        success: true,
        user
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch profile' 
      });
    }
  }
}

module.exports = new AuthController();