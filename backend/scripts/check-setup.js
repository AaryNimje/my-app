// backend/scripts/check-setup.js
const db = require('../src/config/database');
const langchainService = require('../src/services/langchainService');

async function checkSetup() {
  console.log('=== Academic AI Setup Check ===\n');

  // 1. Check environment variables
  console.log('1. Environment Variables:');
  console.log(`   GOOGLE_API_KEY: ${process.env.GOOGLE_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`   ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✓ Set' : '✗ Missing'}`);
  console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✓ Set' : '✗ Missing'}`);

  // 2. Check database connection
  console.log('\n2. Database Connection:');
  try {
    const result = await db.query('SELECT NOW()');
    console.log(`   ✓ Connected to database at ${result.rows[0].now}`);
  } catch (error) {
    console.log(`   ✗ Database connection failed: ${error.message}`);
  }

  // 3. Check LLM models in database
  console.log('\n3. LLM Models in Database:');
  try {
    const models = await db.query('SELECT * FROM llm_models ORDER BY provider, model_name');
    if (models.rows.length === 0) {
      console.log('   ✗ No models found in database');
    } else {
      models.rows.forEach(model => {
        console.log(`   ✓ ${model.display_name} (${model.provider})`);
      });
    }
  } catch (error) {
    console.log(`   ✗ Error querying models: ${error.message}`);
  }

  // 4. Check LangChain service initialization
  console.log('\n4. LangChain Service:');
  try {
    // Check if models are initialized
    const geminiModel = langchainService.models.get('gemini-pro');
    console.log(`   Gemini Pro: ${geminiModel ? '✓ Initialized' : '✗ Not initialized'}`);
    
    // Test Gemini model if available
    if (geminiModel && process.env.GOOGLE_API_KEY) {
      try {
        const response = await geminiModel.invoke('Say "Hello, I am working!"');
        console.log(`   ✓ Gemini test successful: ${response.content.substring(0, 50)}...`);
      } catch (error) {
        console.log(`   ✗ Gemini test failed: ${error.message}`);
      }
    }
  } catch (error) {
    console.log(`   ✗ LangChain check failed: ${error.message}`);
  }

  // 5. Check integrations
  console.log('\n5. Email Integration Requirements:');
  console.log(`   Gmail App Password: Should be 16 characters without spaces`);
  console.log(`   Example format: abcdabcdabcdabcd`);

  // 6. Check agents
  console.log('\n6. Agents in Database:');
  try {
    const agents = await db.query('SELECT * FROM agents');
    if (agents.rows.length === 0) {
      console.log('   ✗ No agents found');
    } else {
      agents.rows.forEach(agent => {
        console.log(`   ✓ ${agent.name} (${agent.type})`);
      });
    }
  } catch (error) {
    console.log(`   ✗ Error querying agents: ${error.message}`);
  }

  console.log('\n=== Setup Check Complete ===');
  console.log('\nNext Steps:');
  
  if (!process.env.GOOGLE_API_KEY) {
    console.log('1. Add GOOGLE_API_KEY to your .env file');
  }
  
  console.log('2. Run: node scripts/setup-gemini-models.js');
  console.log('3. Restart your backend server');
  console.log('4. For Gmail integration, use App Password without spaces');
  
  process.exit(0);
}

checkSetup();