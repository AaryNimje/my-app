// backend/src/controllers/qaController.js
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const pdfParse = require('pdf-parse'); // npm install pdf-parse

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/qa-documents');
    await fs.mkdir(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

class QAController {
  // Upload and process PDF
  async uploadDocument(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const { path: filePath, originalname, size } = req.file;
      const teacherId = req.user.id;

      // Create document record
      const result = await db.query(`
        INSERT INTO qa_documents (teacher_id, file_name, file_path, file_size, status)
        VALUES ($1, $2, $3, $4, 'processing')
        RETURNING id
      `, [teacherId, originalname, filePath, size]);

      const documentId = result.rows[0].id;

      // Process PDF asynchronously
      this.processPDF(documentId, filePath);

      res.json({
        success: true,
        message: 'Document uploaded successfully. Processing will begin shortly.',
        documentId
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload document'
      });
    }
  }

  // Process PDF and extract Q&A pairs
  async processPDF(documentId, filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);
      
      // Extract Q&A pairs from PDF text
      // This is a simplified example - you'll need to implement proper Q&A extraction
      const qaData = this.extractQAPairs(pdfData.text);

      // Update document with processed data
      await db.query(`
        UPDATE qa_documents 
        SET status = 'processed',
            processed_data = $1,
            processed_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [JSON.stringify(qaData), documentId]);

    } catch (error) {
      console.error('PDF processing error:', error);
      await db.query(`
        UPDATE qa_documents 
        SET status = 'failed',
            error_message = $1
        WHERE id = $2
      `, [error.message, documentId]);
    }
  }

  // Extract Q&A pairs from text (simplified implementation)
  extractQAPairs(text) {
    // This is a basic implementation - you should improve this based on your PDF format
    const lines = text.split('\n').filter(line => line.trim());
    const qaPairs = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for Q: or Question: patterns
      if (line.match(/^(Q:|Question:)/i)) {
        const question = line.replace(/^(Q:|Question:)/i, '').trim();
        let answer = '';
        
        // Look for A: or Answer: in next lines
        for (let j = i + 1; j < lines.length; j++) {
          const answerLine = lines[j].trim();
          if (answerLine.match(/^(A:|Answer:)/i)) {
            answer = answerLine.replace(/^(A:|Answer:)/i, '').trim();
            i = j;
            break;
          } else if (answerLine.match(/^(Q:|Question:)/i)) {
            // Next question found
            break;
          } else {
            // Continue collecting answer text
            answer += ' ' + answerLine;
          }
        }
        
        if (question && answer) {
          qaPairs.push({ question, answer });
        }
      }
    }
    
    return qaPairs;
  }

  // Generate study link
  async generateLink(req, res) {
    try {
      const { documentId, title, description, settings = {} } = req.body;
      const teacherId = req.user.id;

      // Verify document belongs to teacher and is processed
      const docResult = await db.query(`
        SELECT id, status FROM qa_documents 
        WHERE id = $1 AND teacher_id = $2 AND status = 'processed'
      `, [documentId, teacherId]);

      if (docResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Document not found or not yet processed'
        });
      }

      // Generate unique link code
      const linkCode = crypto.randomBytes(16).toString('hex');

      // Create study link
      const result = await db.query(`
        INSERT INTO study_links (teacher_id, document_id, link_code, title, description, settings)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, link_code
      `, [teacherId, documentId, linkCode, title, description, JSON.stringify(settings)]);

      const studyLink = result.rows[0];
      const fullLink = `${process.env.FRONTEND_URL}/study/${linkCode}`;

      res.json({
        success: true,
        studyLink: {
          id: studyLink.id,
          link: fullLink,
          linkCode: linkCode
        }
      });
    } catch (error) {
      console.error('Link generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate study link'
      });
    }
  }

  // Get teacher's documents
  async getDocuments(req, res) {
    try {
      const teacherId = req.user.id;

      const result = await db.query(`
        SELECT 
          id,
          file_name,
          file_size,
          status,
          created_at,
          processed_at
        FROM qa_documents
        WHERE teacher_id = $1
        ORDER BY created_at DESC
      `, [teacherId]);

      res.json({
        success: true,
        documents: result.rows
      });
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch documents'
      });
    }
  }

  // Get teacher's study links
  async getStudyLinks(req, res) {
    try {
      const teacherId = req.user.id;

      const result = await db.query(`
        SELECT 
          sl.id,
          sl.link_code,
          sl.title,
          sl.description,
          sl.is_active,
          sl.created_at,
          qd.file_name,
          (SELECT COUNT(*) FROM student_responses sr WHERE sr.study_link_id = sl.id) as response_count
        FROM study_links sl
        JOIN qa_documents qd ON sl.document_id = qd.id
        WHERE sl.teacher_id = $1
        ORDER BY sl.created_at DESC
      `, [teacherId]);

      res.json({
        success: true,
        studyLinks: result.rows.map(link => ({
          ...link,
          fullLink: `${process.env.FRONTEND_URL}/study/${link.link_code}`
        }))
      });
    } catch (error) {
      console.error('Error fetching study links:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch study links'
      });
    }
  }

  // Get responses for a study link
  async getResponses(req, res) {
    try {
      const { linkId } = req.params;
      const teacherId = req.user.id;

      // Verify link belongs to teacher
      const linkCheck = await db.query(
        'SELECT id FROM study_links WHERE id = $1 AND teacher_id = $2',
        [linkId, teacherId]
      );

      if (linkCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const result = await db.query(`
        SELECT 
          id,
          student_email,
          student_name,
          responses,
          score,
          started_at,
          completed_at,
          time_spent
        FROM student_responses
        WHERE study_link_id = $1
        ORDER BY started_at DESC
      `, [linkId]);

      res.json({
        success: true,
        responses: result.rows
      });
    } catch (error) {
      console.error('Error fetching responses:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch responses'
      });
    }
  }

  // Student access - Get Q&A content by link code
  async getStudyContent(req, res) {
    try {
      const { linkCode } = req.params;

      const result = await db.query(`
        SELECT 
          sl.id,
          sl.title,
          sl.description,
          sl.settings,
          qd.processed_data
        FROM study_links sl
        JOIN qa_documents qd ON sl.document_id = qd.id
        WHERE sl.link_code = $1 AND sl.is_active = true
      `, [linkCode]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Study link not found or inactive'
        });
      }

      const studyData = result.rows[0];

      res.json({
        success: true,
        study: {
          id: studyData.id,
          title: studyData.title,
          description: studyData.description,
          settings: studyData.settings,
          questions: studyData.processed_data
        }
      });
    } catch (error) {
      console.error('Error fetching study content:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch study content'
      });
    }
  }

  // Submit student responses
  async submitResponses(req, res) {
    try {
      const { linkCode } = req.params;
      const { studentEmail, studentName, responses } = req.body;

      // Get study link
      const linkResult = await db.query(
        'SELECT id FROM study_links WHERE link_code = $1 AND is_active = true',
        [linkCode]
      );

      if (linkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Study link not found or inactive'
        });
      }

      const studyLinkId = linkResult.rows[0].id;

      // Calculate score (simplified - you can improve this)
      const score = this.calculateScore(responses);

      // Save responses
      const result = await db.query(`
        INSERT INTO student_responses 
        (study_link_id, student_email, student_name, responses, score, completed_at, time_spent, ip_address)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7)
        RETURNING id
      `, [
        studyLinkId,
        studentEmail,
        studentName,
        JSON.stringify(responses),
        score,
        req.body.timeSpent || 0,
        req.ip
      ]);

      res.json({
        success: true,
        message: 'Responses submitted successfully',
        score: score,
        responseId: result.rows[0].id
      });
    } catch (error) {
      console.error('Error submitting responses:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit responses'
      });
    }
  }

  // Calculate score (basic implementation)
  calculateScore(responses) {
    if (!Array.isArray(responses)) return 0;
    
    let correctCount = 0;
    responses.forEach(response => {
      if (response.isCorrect) {
        correctCount++;
      }
    });
    
    return (correctCount / responses.length) * 100;
  }
}

module.exports = new QAController();
module.exports.upload = upload;