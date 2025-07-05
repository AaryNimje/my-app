// backend/src/controllers/qaController.js - Updated with Groq Integration

const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');

class QAController {
  constructor() {
    this.mainPyBaseUrl = process.env.MAIN_PY_URL || 'http://localhost:8000';
    this.setupMulter();
  }

  setupMulter() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = './uploads/pdfs';
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${file.originalname}`;
        cb(null, uniqueName);
      }
    });

    this.upload = multer({
      storage: storage,
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new Error('Only PDF files are allowed'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
      }
    });
  }

  async uploadDocument(req, res) {
    try {
      const teacherId = req.user.id;
      const { originalname, filename, size, path: filePath } = req.file;

      console.log('Starting document upload for teacher:', teacherId);
      console.log('File details:', { originalname, filename, size });

      // Save document record to database
      const documentResult = await db.query(`
        INSERT INTO qa_documents (teacher_id, file_name, file_path, file_size, status)
        VALUES ($1, $2, $3, $4, 'uploaded')
        RETURNING id
      `, [teacherId, originalname, filePath, size]);

      const documentId = documentResult.rows[0].id;

      // Process document with main.py in background
      this.processDocumentAsync(filePath, teacherId, documentId);

      res.json({
        success: true,
        message: 'Document uploaded successfully. Processing will begin shortly.',
        documentId: documentId
      });

    } catch (error) {
      console.error('Document upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload document'
      });
    }
  }

  async processDocumentAsync(filePath, teacherId, documentId) {
    try {
      console.log(`Starting async processing for document ${documentId} using Groq`);

      // Update status to processing
      await db.query(`
        UPDATE qa_documents 
        SET status = 'processing', 
            processing_started_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [documentId]);

      // Step 1: Upload PDF to main.py
      const uploadResult = await this.uploadToMainPy(filePath, teacherId);
      
      if (!uploadResult.success) {
        throw new Error(`Main.py upload failed: ${uploadResult.error}`);
      }

      console.log(`PDF uploaded to main.py. Vector store ID: ${uploadResult.vector_store_id}`);

      // Step 2: Generate MCQ questions using Groq
      const mcqResult = await this.generateMCQQuestionsWithGroq(
        teacherId, 
        uploadResult.vector_store_id,
        10, // number of questions
        'medium' // difficulty
      );

      if (!mcqResult.success) {
        throw new Error(`MCQ generation failed: ${mcqResult.error}`);
      }

      console.log(`Generated ${mcqResult.questions.length} MCQ questions using ${mcqResult.provider}`);

      // Step 3: Save MCQ questions to database
      await this.saveMCQQuestions(documentId, mcqResult.questions);

      // Step 4: Update document status
      await db.query(`
        UPDATE qa_documents 
        SET status = 'processed',
            vector_store_id = $1,
            mcq_questions_count = $2,
            processed_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [uploadResult.vector_store_id, mcqResult.questions.length, documentId]);

      console.log(`Document ${documentId} processed successfully with ${mcqResult.provider}`);

    } catch (error) {
      console.error(`Processing error for document ${documentId}:`, error);
      
      await db.query(`
        UPDATE qa_documents 
        SET status = 'failed',
            error_message = $1
        WHERE id = $2
      `, [error.message, documentId]);
    }
  }

  async uploadToMainPy(filePath, userId) {
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      formData.append('user_id', userId.toString());

      const response = await axios.post(
        `${this.mainPyBaseUrl}/upload_pdf`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 60000 // 60 seconds timeout
        }
      );

      return response.data;
    } catch (error) {
      console.error('Main.py upload error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message
      };
    }
  }

  async generateMCQQuestionsWithGroq(userId, vectorStoreId, numQuestions = 10, difficulty = 'medium') {
    try {
      // Check if Groq API key exists
      if (!process.env.GROQ_API_KEY) {
        throw new Error('Groq API key not configured');
      }

      console.log(`Generating ${numQuestions} MCQ questions using Groq API`);

      const formData = new FormData();
      formData.append('user_id', userId.toString());
      formData.append('vector_store_id', vectorStoreId);
      formData.append('num_questions', numQuestions.toString());
      formData.append('difficulty', difficulty);
      formData.append('llm_provider', 'groq');
      formData.append('api_key', process.env.GROQ_API_KEY);

      const response = await axios.post(
        `${this.mainPyBaseUrl}/generate_mcq`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 90000 // 90 seconds timeout for Groq (still fast but allows for retries)
        }
      );

      return response.data;
    } catch (error) {
      console.error('Groq MCQ generation error:', error);
      
      // Specific error handling for Groq
      if (error.response?.status === 401) {
        return { success: false, error: 'Invalid Groq API key' };
      }
      if (error.response?.status === 429) {
        return { success: false, error: 'Groq rate limit exceeded. Please try again in a moment.' };
      }
      if (error.response?.status === 503) {
        return { success: false, error: 'Groq service temporarily unavailable. Please try again.' };
      }
      
      return {
        success: false,
        error: error.response?.data?.detail || error.message
      };
    }
  }

  async saveMCQQuestions(documentId, questions) {
    try {
      for (const question of questions) {
        await db.query(`
          INSERT INTO mcq_questions 
          (document_id, question, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          documentId,
          question.question,
          question.option_a,
          question.option_b,
          question.option_c,
          question.option_d,
          question.correct_answer,
          question.explanation,
          question.difficulty || 'medium'
        ]);
      }
      console.log(`Saved ${questions.length} MCQ questions for document ${documentId}`);
    } catch (error) {
      console.error('Error saving MCQ questions:', error);
      throw error;
    }
  }

  async generateLink(req, res) {
    try {
      const { documentId, title, description, settings = {} } = req.body;
      const teacherId = req.user.id;

      console.log('Generating study link for document:', documentId);

      // Verify document belongs to teacher and is processed
      const docResult = await db.query(`
        SELECT id, status, mcq_questions_count FROM qa_documents 
        WHERE id = $1 AND teacher_id = $2 AND status = 'processed'
      `, [documentId, teacherId]);

      if (docResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Document not found or not yet processed'
        });
      }

      const questionCount = docResult.rows[0].mcq_questions_count;
      if (questionCount === 0) {
        return res.status(400).json({
          success: false,
          error: 'No MCQ questions available for this document'
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

      // Log the link generation
      await this.logQuizActivity(studyLink.id, null, 'link_generated', null, req.ip, req.get('User-Agent'));

      res.json({
        success: true,
        studyLink: {
          id: studyLink.id,
          link: fullLink,
          linkCode: linkCode,
          questionCount: questionCount
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

  async getDocuments(req, res) {
    try {
      const teacherId = req.user.id;

      const result = await db.query(`
        SELECT 
          id,
          file_name,
          file_size,
          status,
          mcq_questions_count,
          error_message,
          created_at,
          processing_started_at,
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
          qd.mcq_questions_count,
          (SELECT COUNT(*) FROM student_responses sr WHERE sr.study_link_id = sl.id) as response_count,
          (SELECT COUNT(DISTINCT student_email) FROM student_responses sr WHERE sr.study_link_id = sl.id) as unique_students,
          (SELECT ROUND(AVG(score), 1) FROM student_responses sr WHERE sr.study_link_id = sl.id) as average_score
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

  async getStudyContent(req, res) {
    try {
      const { linkCode } = req.params;

      console.log('Fetching study content for link:', linkCode);

      const result = await db.query(`
        SELECT 
          sl.id,
          sl.title,
          sl.description,
          sl.settings,
          qd.file_name,
          qd.mcq_questions_count
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

      // Fetch MCQ questions
      const questionsResult = await db.query(`
        SELECT 
          mq.id,
          mq.question,
          mq.option_a,
          mq.option_b,
          mq.option_c,
          mq.option_d,
          mq.correct_answer,
          mq.explanation,
          mq.difficulty
        FROM mcq_questions mq
        JOIN qa_documents qd ON mq.document_id = qd.id
        JOIN study_links sl ON sl.document_id = qd.id
        WHERE sl.link_code = $1
        ORDER BY mq.created_at
      `, [linkCode]);

      res.json({
        success: true,
        study: {
          id: studyData.id,
          title: studyData.title,
          description: studyData.description,
          settings: studyData.settings,
          fileName: studyData.file_name,
          questions: questionsResult.rows,
          generatedBy: 'Groq AI'
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

  async submitResponses(req, res) {
    try {
      const { linkCode } = req.params;
      const { studentEmail, studentName, responses, timeSpent } = req.body;

      console.log('Submitting responses for link:', linkCode);
      console.log('Student:', studentEmail, 'Responses:', responses.length);

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

      // Calculate score
      const score = this.calculateScore(responses);

      // Save main response record
      const responseResult = await db.query(`
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
        timeSpent || 0,
        req.ip
      ]);

      const responseId = responseResult.rows[0].id;

      // Log individual question responses
      for (const response of responses) {
        await this.logQuizActivity(
          studyLinkId,
          studentEmail,
          'question_answered',
          {
            questionId: response.questionId,
            selectedAnswer: response.selectedAnswer,
            isCorrect: response.isCorrect,
            responseId: responseId
          },
          req.ip,
          req.get('User-Agent')
        );
      }

      // Log quiz completion
      await this.logQuizActivity(
        studyLinkId,
        studentEmail,
        'quiz_completed',
        {
          responseId: responseId,
          score: score,
          timeSpent: timeSpent,
          totalQuestions: responses.length,
          provider: 'groq'
        },
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Responses submitted successfully',
        score: score,
        responseId: responseId,
        totalQuestions: responses.length,
        correctAnswers: responses.filter(r => r.isCorrect).length,
        generatedBy: 'Groq AI'
      });
    } catch (error) {
      console.error('Error submitting responses:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit responses'
      });
    }
  }

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
          time_spent,
          ip_address
        FROM student_responses
        WHERE study_link_id = $1
        ORDER BY completed_at DESC
      `, [linkId]);

      res.json({
        success: true,
        responses: result.rows,
        generatedBy: 'Groq AI'
      });
    } catch (error) {
      console.error('Error fetching responses:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch responses'
      });
    }
  }

  async getQuizHistory(req, res) {
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
          action,
          question_id,
          selected_answer,
          is_correct,
          timestamp,
          ip_address
        FROM quiz_logs
        WHERE study_link_id = $1
        ORDER BY timestamp DESC
        LIMIT 500
      `, [linkId]);

      res.json({
        success: true,
        logs: result.rows,
        generatedBy: 'Groq AI'
      });
    } catch (error) {
      console.error('Error fetching quiz history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch quiz history'
      });
    }
  }

  async getQuizAnalytics(req, res) {
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

      // Get overall analytics
      const analyticsResult = await db.query(`
        SELECT 
          COUNT(DISTINCT student_email) as unique_students,
          COUNT(*) as total_attempts,
          ROUND(AVG(score), 2) as average_score,
          MIN(score) as min_score,
          MAX(score) as max_score,
          COUNT(*) FILTER (WHERE score >= 80) as high_scores,
          COUNT(*) FILTER (WHERE score >= 60 AND score < 80) as medium_scores,
          COUNT(*) FILTER (WHERE score < 60) as low_scores,
          ROUND(AVG(time_spent), 0) as average_time
        FROM student_responses
        WHERE study_link_id = $1
      `, [linkId]);

      // Get question-level statistics using the database function
      const questionStatsResult = await db.query(
        'SELECT * FROM get_question_statistics($1)',
        [linkId]
      );

      res.json({
        success: true,
        analytics: analyticsResult.rows[0],
        questionStats: questionStatsResult.rows,
        generatedBy: 'Groq AI',
        provider: 'groq'
      });
    } catch (error) {
      console.error('Error fetching quiz analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch quiz analytics'
      });
    }
  }

  // Helper method to calculate score
  calculateScore(responses) {
    if (!Array.isArray(responses) || responses.length === 0) return 0;
    
    const correctCount = responses.filter(response => response.isCorrect).length;
    return Math.round((correctCount / responses.length) * 100 * 10) / 10; // Round to 1 decimal
  }

  // Helper method to log quiz activities
  async logQuizActivity(studyLinkId, studentEmail, action, metadata = null, ipAddress = null, userAgent = null) {
    try {
      await db.query(`
        INSERT INTO quiz_logs 
        (study_link_id, student_email, action, question_id, selected_answer, is_correct, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        studyLinkId,
        studentEmail,
        action,
        metadata?.questionId || null,
        metadata?.selectedAnswer || null,
        metadata?.isCorrect || null,
        ipAddress,
        userAgent
      ]);
    } catch (error) {
      console.error('Error logging quiz activity:', error);
      // Don't throw error - logging shouldn't break the main flow
    }
  }

  // Toggle study link active status
  async toggleLinkStatus(req, res) {
    try {
      const { linkId } = req.params;
      const teacherId = req.user.id;

      const linkCheck = await db.query(
        'SELECT id, is_active FROM study_links WHERE id = $1 AND teacher_id = $2',
        [linkId, teacherId]
      );

      if (linkCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const currentStatus = linkCheck.rows[0].is_active;
      const newStatus = !currentStatus;

      await db.query(
        'UPDATE study_links SET is_active = $1 WHERE id = $2',
        [newStatus, linkId]
      );

      res.json({
        success: true,
        message: `Study link ${newStatus ? 'activated' : 'deactivated'} successfully`,
        isActive: newStatus
      });
    } catch (error) {
      console.error('Error toggling link status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update link status'
      });
    }
  }

  // Test Groq connection
  async testGroqConnection(req, res) {
    try {
      if (!process.env.GROQ_API_KEY) {
        return res.status(400).json({
          success: false,
          error: 'Groq API key not configured'
        });
      }

      // Test health check with main.py
      const healthResponse = await axios.get(`${this.mainPyBaseUrl}/health`, {
        timeout: 5000
      });

      // Test models endpoint
      const modelsResponse = await axios.get(`${this.mainPyBaseUrl}/models`, {
        timeout: 5000
      });

      res.json({
        success: true,
        message: 'Groq connection successful',
        mainPyHealth: healthResponse.data,
        availableModels: modelsResponse.data,
        groqConfigured: true
      });
    } catch (error) {
      console.error('Groq connection test failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to connect to Groq service',
        details: error.response?.data || error.message
      });
    }
  }

  // Regenerate questions for a document
  async regenerateQuestions(req, res) {
    try {
      const { documentId } = req.params;
      const { numQuestions = 10, difficulty = 'medium' } = req.body;
      const teacherId = req.user.id;

      // Verify document belongs to teacher
      const docResult = await db.query(`
        SELECT id, vector_store_id FROM qa_documents 
        WHERE id = $1 AND teacher_id = $2 AND status = 'processed'
      `, [documentId, teacherId]);

      if (docResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Document not found or not processed'
        });
      }

      const vectorStoreId = docResult.rows[0].vector_store_id;

      // Delete existing questions
      await db.query('DELETE FROM mcq_questions WHERE document_id = $1', [documentId]);

      // Generate new questions
      const mcqResult = await this.generateMCQQuestionsWithGroq(
        teacherId,
        vectorStoreId,
        numQuestions,
        difficulty
      );

      if (!mcqResult.success) {
        throw new Error(`MCQ generation failed: ${mcqResult.error}`);
      }

      // Save new questions
      await this.saveMCQQuestions(documentId, mcqResult.questions);

      // Update document
      await db.query(`
        UPDATE qa_documents 
        SET mcq_questions_count = $1,
            processed_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [mcqResult.questions.length, documentId]);

      res.json({
        success: true,
        message: `Successfully regenerated ${mcqResult.questions.length} questions`,
        questionCount: mcqResult.questions.length,
        provider: 'groq'
      });
    } catch (error) {
      console.error('Error regenerating questions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to regenerate questions'
      });
    }
  }
}

module.exports = new QAController();