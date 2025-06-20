// backend/scripts/setup-neon-database.js
const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function setupNeonDatabase() {
  console.log('=== Neon Database Setup Script ===\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env file!');
    console.error('\nPlease add your Neon connection string to .env:');
    console.error('DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('1. Connecting to Neon database...');
    console.log('   Connection string:', process.env.DATABASE_URL.replace(/:[^:@]*@/, ':****@'));
    
    await client.connect();
    console.log('   ✓ Connected to Neon successfully!');

    // Create tables
    console.log('\n2. Creating tables...');
    
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ Users table ready');

    // AI Agents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_agents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        agent_type VARCHAR(50) NOT NULL,
        description TEXT,
        custom_prompt TEXT,
        model_id VARCHAR(255),
        temperature DECIMAL(3,2) DEFAULT 0.7,
        max_tokens INTEGER DEFAULT 1000,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ AI Agents table ready');

    // Integrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        credentials JSONB,
        status VARCHAR(50) DEFAULT 'active',
        connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ Integrations table ready');

    // Chat sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        workflow_id UUID,
        autonomous_agent_id UUID REFERENCES ai_agents(id),
        knowledge_base_id UUID,
        session_type VARCHAR(50) DEFAULT 'interactive',
        context JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP
      )
    `);
    console.log('   ✓ Chat Sessions table ready');

    // Chat messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB,
        tokens_used INTEGER DEFAULT 0,
        model_used VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ Chat Messages table ready');

    // LLM Models table
    await client.query(`
      CREATE TABLE IF NOT EXISTS llm_models (
        id VARCHAR(255) PRIMARY KEY,
        model_name VARCHAR(255) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ LLM Models table ready');

    // Insert default models
    const modelsResult = await client.query(`
      INSERT INTO llm_models (id, model_name, display_name, provider) VALUES
        ('gpt-3.5-turbo', 'gpt-3.5-turbo', 'GPT-3.5 Turbo', 'openai'),
        ('gpt-4', 'gpt-4', 'GPT-4', 'openai'),
        ('gemini-pro', 'gemini-pro', 'Gemini Pro', 'google'),
        ('gemini-pro-vision', 'gemini-pro-vision', 'Gemini Pro Vision', 'google')
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `);
    console.log(`   ✓ Models ready (${modelsResult.rowCount} new models added)`);

    // Workflows table
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(50),
        tags TEXT[],
        canvas_state JSONB,
        global_variables JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ Workflows table ready');

    // Token usage table
    await client.query(`
      CREATE TABLE IF NOT EXISTS token_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        model_id VARCHAR(255),
        prompt_tokens INTEGER DEFAULT 0,
        completion_tokens INTEGER DEFAULT 0,
        session_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ Token Usage table ready');

    // Check if we have any users
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    console.log(`\n3. Current users in database: ${userCount.rows[0].count}`);

    await client.end();
    
    console.log('\n✅ Neon database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: node scripts/create-test-user.js');
    console.log('2. Start your backend: npm run dev');
    console.log('3. Login with: admin@example.com / password123');
    
  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    
    if (error.message.includes('timeout')) {
      console.error('\nConnection timeout! Please check:');
      console.error('1. Your internet connection');
      console.error('2. Neon service status at: https://status.neon.tech/');
      console.error('3. Your connection string is correct');
    } else if (error.message.includes('authentication')) {
      console.error('\nAuthentication failed! Please check:');
      console.error('1. Your password in the connection string');
      console.error('2. Connection string format in Neon dashboard');
    } else if (error.message.includes('SSL')) {
      console.error('\nSSL connection issue!');
      console.error('Make sure your connection string ends with: ?sslmode=require');
    }
    
    process.exit(1);
  }
}

setupNeonDatabase();