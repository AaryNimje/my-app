// backend/src/controllers/adminController.js
const db = require('../config/database');

class AdminController {
  async getPendingRegistrations(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          rr.id,
          rr.email,
          rr.full_name,
          rr.requested_role,
          rr.requested_at,
          rr.user_id
        FROM registration_requests rr
        WHERE rr.status = 'pending'
        ORDER BY rr.requested_at DESC
      `);

      res.json({
        success: true,
        requests: result.rows
      });
    } catch (error) {
      console.error('Error fetching pending registrations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pending registrations'
      });
    }
  }

  async approveRegistration(req, res) {
    const client = await db.connect();
    
    try {
      const { requestId } = req.params;
      const { role } = req.body;
      const adminId = req.user.id;

      await client.query('BEGIN');

      // Get the registration request
      const requestResult = await client.query(
        'SELECT * FROM registration_requests WHERE id = $1 AND status = $2',
        [requestId, 'pending']
      );

      if (requestResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Registration request not found or already processed'
        });
      }

      const request = requestResult.rows[0];

      // Update user status and role
      await client.query(`
        UPDATE users 
        SET status = 'approved', 
            role = $1, 
            approved_by = $2, 
            approved_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [role || request.requested_role, adminId, request.user_id]);

      // Update registration request
      await client.query(`
        UPDATE registration_requests 
        SET status = 'approved', 
            reviewed_by = $1, 
            reviewed_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [adminId, requestId]);

      await client.query('COMMIT');

      // Send approval email to user
      // await sendApprovalEmail(request.email, role);

      res.json({
        success: true,
        message: 'Registration approved successfully'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error approving registration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve registration'
      });
    } finally {
      client.release();
    }
  }

  async rejectRegistration(req, res) {
    const client = await db.connect();
    
    try {
      const { requestId } = req.params;
      const { reason } = req.body;
      const adminId = req.user.id;

      await client.query('BEGIN');

      // Update registration request
      const requestResult = await client.query(`
        UPDATE registration_requests 
        SET status = 'rejected', 
            reviewed_by = $1, 
            reviewed_at = CURRENT_TIMESTAMP,
            rejection_reason = $2
        WHERE id = $3 AND status = 'pending'
        RETURNING user_id, email
      `, [adminId, reason, requestId]);

      if (requestResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Registration request not found or already processed'
        });
      }

      const { user_id, email } = requestResult.rows[0];

      // Update user status
      await client.query(`
        UPDATE users 
        SET status = 'rejected'
        WHERE id = $1
      `, [user_id]);

      await client.query('COMMIT');

      // Send rejection email to user
      // await sendRejectionEmail(email, reason);

      res.json({
        success: true,
        message: 'Registration rejected'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error rejecting registration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reject registration'
      });
    } finally {
      client.release();
    }
  }

  async getAllUsers(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          id,
          email,
          full_name,
          role,
          status,
          created_at,
          last_login
        FROM users
        ORDER BY created_at DESC
      `);

      res.json({
        success: true,
        users: result.rows
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users'
      });
    }
  }
}

module.exports = new AdminController();