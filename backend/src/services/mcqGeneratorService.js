const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class MCQGeneratorService {
  constructor() {
    this.mainPyBaseUrl = process.env.MAIN_PY_URL || 'http://localhost:8000';
  }

  async processPDFForMCQ(filePath, userId, documentId) {
    try {
      // 1. Upload PDF to main.py
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      formData.append('user_id', userId);

      const uploadResponse = await axios.post(
        `${this.mainPyBaseUrl}/upload_pdf`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000
        }
      );

      const vectorStoreId = uploadResponse.data.vector_store_id;

      // 2. Generate MCQ questions using the vector store
      const mcqQuestions = await this.generateMCQQuestions(vectorStoreId, userId);

      return {
        vectorStoreId,
        questions: mcqQuestions
      };
    } catch (error) {
      console.error('MCQ generation error:', error);
      throw new Error(`Failed to process PDF for MCQ: ${error.message}`);
    }
  }

  async generateMCQQuestions(vectorStoreId, userId, numQuestions = 10) {
    const questions = [];
    
    // Prompts for different types of MCQ questions
    const questionPrompts = [
      "Generate a multiple choice question about the main concepts in this document.",
      "Create a question testing understanding of key definitions from the text.",
      "Make a question about important facts or figures mentioned in the document.",
      "Generate a question about the relationships between different concepts.",
      "Create an application-based question using the document content."
    ];

    for (let i = 0; i < numQuestions; i++) {
      try {
        const prompt = questionPrompts[i % questionPrompts.length];
        const mcqPrompt = `${prompt}

Please format your response as JSON with this exact structure:
{
  "question": "The question text here",
  "options": {
    "A": "First option",
    "B": "Second option", 
    "C": "Third option",
    "D": "Fourth option"
  },
  "correct_answer": "A",
  "explanation": "Brief explanation of why this is correct"
}`;

        const response = await axios.post(
          `${this.mainPyBaseUrl}/query`,
          {
            user_id: userId,
            vector_store_id: vectorStoreId,
            query: mcqPrompt
          }
        );

        const mcqData = this.parseMCQResponse(response.data.answer);
        if (mcqData) {
          questions.push(mcqData);
        }
      } catch (error) {
        console.error(`Error generating question ${i + 1}:`, error);
      }
    }

    return questions;
  }

  parseMCQResponse(aiResponse) {
    try {
      // Extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const mcqData = JSON.parse(jsonMatch[0]);
      
      // Validate structure
      if (!mcqData.question || !mcqData.options || !mcqData.correct_answer) {
        return null;
      }

      return {
        question: mcqData.question,
        option_a: mcqData.options.A,
        option_b: mcqData.options.B,
        option_c: mcqData.options.C,
        option_d: mcqData.options.D,
        correct_answer: mcqData.correct_answer,
        explanation: mcqData.explanation || ""
      };
    } catch (error) {
      console.error('Error parsing MCQ response:', error);
      return null;
    }
  }
}

module.exports = new MCQGeneratorService();