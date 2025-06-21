// backend/scripts/setup-gemini-models.js
const db = require('../src/config/database');
const { v4: uuidv4 } = require('uuid');

async function setupGeminiModels() {
  try {
    console.log('Setting up Gemini models in database...');

    // Generate UUIDs for the models
    const geminiProId = uuidv4();
    const geminiProVisionId = uuidv4();
    
    // Insert Gemini models with UUID ids
    await db.query(`
      INSERT INTO llm_models (id, model_name, display_name, provider) VALUES
        ($1, 'gemini-pro', 'Gemini Pro', 'google'),
        ($2, 'gemini-pro-vision', 'Gemini Pro Vision', 'google')
      ON CONFLICT (model_name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        provider = EXCLUDED.provider;
    `, [geminiProId, geminiProVisionId]);

    console.log('✓ Gemini models added successfully');

    // Check if models were added
    const result = await db.query('SELECT * FROM llm_models WHERE provider = $1', ['google']);
    console.log('Gemini models in database:', result.rows);

    // Store model IDs for reference (you might want to use these somewhere)
    console.log('Model IDs for reference:');
    console.log('Gemini Pro ID:', geminiProId);
    console.log('Gemini Pro Vision ID:', geminiProVisionId);

    process.exit(0);
  } catch (error) {
    console.error('Error setting up Gemini models:', error);
    process.exit(1);
  }
}

setupGeminiModels();