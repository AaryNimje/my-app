const db = require('../config/database');
const fs = require('fs').promises;
const path = require('path');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { OpenAIEmbeddings } = require('@langchain/openai');
const pgvector = require('pgvector/pg');

class KnowledgeController {
  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY
    });
  }

  // Create knowledge base
  async createKnowledgeBase(req, res) {
    try {
      const { name, description } = req.body;
      const userId = req.user.id;

      const result = await db.query(
        `INSERT INTO project_knowledge_bases (user_id, name, description)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, name, description]
      );

      res.status(201).json({
        success: true,
        knowledgeBase: result.rows[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get all knowledge bases
  async getKnowledgeBases(req, res) {
    try {
      const userId = req.user.id;

      const result = await db.query(
        `SELECT kb.*, 
         COUNT(DISTINCT kd.id) as document_count,
         SUM(kd.chunk_count) as total_chunks
         FROM project_knowledge_bases kb
         LEFT JOIN knowledge_documents kd ON kb.id = kd.knowledge_base_id
         WHERE kb.user_id = $1 AND kb.is_active = true
         GROUP BY kb.id
         ORDER BY kb.created_at DESC`,
        [userId]
      );

      res.json({
        success: true,
        knowledgeBases: result.rows
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Upload document to knowledge base
  async uploadDocument(req, res) {
    try {
      const { baseId } = req.params;
      const userId = req.user.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      // Verify knowledge base ownership
      const baseCheck = await db.query(
        'SELECT id FROM project_knowledge_bases WHERE id = $1 AND user_id = $2',
        [baseId, userId]
      );

      if (baseCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Knowledge base not found'
        });
      }

      // Read file content
      const filePath = path.join(process.cwd(), file.path);
      const content = await fs.readFile(filePath, 'utf-8');

      // Split text into chunks
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200
      });

      const chunks = await splitter.splitText(content);

      // Store document
      const docResult = await db.query(
        `INSERT INTO knowledge_documents 
         (knowledge_base_id, title, content, content_type, file_path, chunk_count)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          baseId,
          file.originalname,
          content,
          file.mimetype,
          file.path,
          chunks.length
        ]
      );

      const document = docResult.rows[0];

      // Process chunks and generate embeddings
      await this.processDocumentChunks(document.id, chunks);

      res.json({
        success: true,
        document: {
          ...document,
          chunks: chunks.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Process document chunks with embeddings
  async processDocumentChunks(documentId, chunks) {
    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Generate embedding
        const embedding = await this.embeddings.embedQuery(chunk);
        
        // Store chunk with embedding
        await db.query(
          `INSERT INTO document_chunks 
           (document_id, chunk_index, content, embedding)
           VALUES ($1, $2, $3, $4)`,
          [
            documentId,
            i,
            chunk,
            pgvector.toSql(embedding)
          ]
        );
      }
    } catch (error) {
      console.error('Chunk processing error:', error);
      throw error;
    }
  }

  // Search knowledge base
  async searchKnowledge(req, res) {
    try {
      const { baseId } = req.params;
      const { query, limit = 5 } = req.body;
      const userId = req.user.id;

      // Verify ownership
      const baseCheck = await db.query(
        'SELECT id FROM project_knowledge_bases WHERE id = $1 AND user_id = $2',
        [baseId, userId]
      );

      if (baseCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Knowledge base not found'
        });
      }

      // Generate query embedding
      const queryEmbedding = await this.embeddings.embedQuery(query);

      // Vector similarity search
      const result = await db.query(
        `SELECT 
           dc.content,
           dc.chunk_index,
           kd.title as document_title,
           kd.id as document_id,
           1 - (dc.embedding <=> $1) as similarity
         FROM document_chunks dc
         JOIN knowledge_documents kd ON dc.document_id = kd.id
         WHERE kd.knowledge_base_id = $2
         ORDER BY dc.embedding <=> $1
         LIMIT $3`,
        [pgvector.toSql(queryEmbedding), baseId, limit]
      );

      res.json({
        success: true,
        results: result.rows
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Query knowledge with LLM
  async queryKnowledge(req, res) {
    try {
      const { baseId } = req.params;
      const { question, model_id } = req.body;
      const userId = req.user.id;

      // Search for relevant context
      const searchResults = await this.searchKnowledge(
        { params: { baseId }, body: { query: question, limit: 5 }, user: { id: userId } },
        { json: () => {} }
      );

      // Build context from search results
      const context = searchResults.results
        .map(r => r.content)
        .join('\n\n');

      // Get LLM model
      const langchainService = require('../services/langchainService');
      const model = await langchainService.getModel(model_id || 'gpt-3.5-turbo');

      // Generate answer
      const prompt = `Based on the following context, answer the question.
      
Context:
${context}

Question: ${question}

Answer:`;

      const response = await model.invoke(prompt);

      res.json({
        success: true,
        answer: response.content,
        sources: searchResults.results.map(r => ({
          document: r.document_title,
          chunk: r.chunk_index,
          similarity: r.similarity
        }))
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get documents in knowledge base
  async getDocuments(req, res) {
    try {
      const { baseId } = req.params;
      const userId = req.user.id;

      const result = await db.query(
        `SELECT kd.* FROM knowledge_documents kd
         JOIN project_knowledge_bases kb ON kd.knowledge_base_id = kb.id
         WHERE kb.id = $1 AND kb.user_id = $2
         ORDER BY kd.created_at DESC`,
        [baseId, userId]
      );

      res.json({
        success: true,
        documents: result.rows
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Delete document
  async deleteDocument(req, res) {
    try {
      const { documentId } = req.params;
      const userId = req.user.id;

      // Verify ownership through knowledge base
      const docCheck = await db.query(
        `SELECT kd.id, kd.file_path FROM knowledge_documents kd
         JOIN project_knowledge_bases kb ON kd.knowledge_base_id = kb.id
         WHERE kd.id = $1 AND kb.user_id = $2`,
        [documentId, userId]
      );

      if (docCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Document not found'
        });
      }

      const doc = docCheck.rows[0];

      // Delete file
      if (doc.file_path) {
        try {
          await fs.unlink(path.join(process.cwd(), doc.file_path));
        } catch (error) {
          console.error('File deletion error:', error);
        }
      }

      // Delete from database (chunks will cascade delete)
      await db.query('DELETE FROM knowledge_documents WHERE id = $1', [documentId]);

      res.json({
        success: true,
        message: 'Document deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Other methods (getKnowledgeBase, updateKnowledgeBase, deleteKnowledgeBase, getDocument, generateEmbeddings)
  // would follow similar patterns...
}

module.exports = new KnowledgeController();