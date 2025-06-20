const db = require('../config/database');

class KnowledgeBase {
  static async create(userId, name, description) {
    const result = await db.query(
      `INSERT INTO project_knowledge_bases (user_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, name, description]
    );
    return result.rows[0];
  }

  static async addDocument(knowledgeBaseId, document) {
    const { title, content, content_type, file_path, metadata, embedding } = document;
    
    const result = await db.query(
      `INSERT INTO knowledge_documents 
       (knowledge_base_id, title, content, content_type, file_path, metadata, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [knowledgeBaseId, title, content, content_type, file_path, metadata, embedding]
    );
    
    return result.rows[0];
  }

  static async searchDocuments(knowledgeBaseId, query, limit = 5) {
    // This would use vector similarity search in production
    const result = await db.query(
      `SELECT * FROM knowledge_documents 
       WHERE knowledge_base_id = $1 
       AND content ILIKE $2
       LIMIT $3`,
      [knowledgeBaseId, `%${query}%`, limit]
    );
    
    return result.rows;
  }
}

module.exports = KnowledgeBase;