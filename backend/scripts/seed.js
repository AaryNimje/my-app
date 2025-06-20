// backend/src/scripts/seed.js

require('dotenv').config();
const db = require('../config/database');

async function seed() {
  try {
    console.log('Seeding database...');

    // Create default purchase plans
    await db.query(`
      INSERT INTO purchase_plans (name, token_limit_monthly, price_monthly, features)
      VALUES 
        ('Free', 10000, 0, '{"basic_models": true, "api_access": false}'),
        ('Pro', 100000, 29.99, '{"all_models": true, "api_access": true, "priority_support": true}'),
        ('Enterprise', 1000000, 299.99, '{"all_models": true, "api_access": true, "priority_support": true, "custom_models": true}')
      ON CONFLICT (name) DO NOTHING
    `);

    // Create default LLM providers
    await db.query(`
      INSERT INTO llm_providers (name, base_url, api_version)
      VALUES 
        ('OpenAI', 'https://api.openai.com/v1', 'v1'),
        ('Anthropic', 'https://api.anthropic.com/v1', 'v1'),
        ('Google', 'https://generativelanguage.googleapis.com/v1', 'v1'),
        ('Local', 'http://localhost:11434', 'v1')
      ON CONFLICT (name) DO NOTHING
    `);

    // Create default LLM models
    const providers = await db.query('SELECT id, name FROM llm_providers');
    
    for (const provider of providers.rows) {
      if (provider.name === 'OpenAI') {
        await db.query(`
          INSERT INTO llm_models (provider_id, model_id, display_name, max_tokens, supports_streaming, supports_functions, cost_per_1k_input, cost_per_1k_output)
          VALUES 
            ($1, 'gpt-4-turbo', 'GPT-4 Turbo', 128000, true, true, 0.01, 0.03),
            ($1, 'gpt-4', 'GPT-4', 8192, true, true, 0.03, 0.06),
            ($1, 'gpt-3.5-turbo', 'GPT-3.5 Turbo', 16385, true, true, 0.0005, 0.0015)
          ON CONFLICT (provider_id, model_id) DO NOTHING
        `, [provider.id]);
      } else if (provider.name === 'Anthropic') {
        await db.query(`
          INSERT INTO llm_models (provider_id, model_id, display_name, max_tokens, supports_streaming, supports_functions, cost_per_1k_input, cost_per_1k_output)
          VALUES 
            ($1, 'claude-3-opus', 'Claude 3 Opus', 200000, true, false, 0.015, 0.075),
            ($1, 'claude-3-sonnet', 'Claude 3 Sonnet', 200000, true, false, 0.003, 0.015),
            ($1, 'claude-3-haiku', 'Claude 3 Haiku', 200000, true, false, 0.00025, 0.00125)
          ON CONFLICT (provider_id, model_id) DO NOTHING
        `, [provider.id]);
      }
    }

    // Create default MCP server
    await db.query(`
      INSERT INTO mcp_servers (name, url, api_key, description)
      VALUES ('Default Tools Server', 'http://localhost:8080', 'default-key', 'Default MCP server for academic tools')
      ON CONFLICT (name) DO NOTHING
    `);

    // Create a demo admin user
    const bcrypt = require('bcrypt');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    const userResult = await db.query(`
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ('admin@example.com', $1, 'Admin User', 'admin')
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `, [passwordHash]);

    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      
      // Give the admin user a free plan
      const planResult = await db.query(
        'SELECT id FROM purchase_plans WHERE name = $1',
        ['Free']
      );
      
      if (planResult.rows.length > 0) {
        await db.query(`
          INSERT INTO user_subscriptions 
          (user_id, plan_id, status, billing_cycle, current_period_start, current_period_end)
          VALUES ($1, $2, 'active', 'monthly', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month')
          ON CONFLICT (user_id) DO NOTHING
        `, [userId, planResult.rows[0].id]);
      }
    }

    console.log('✅ Database seeded successfully!');
    console.log('\nDemo credentials:');
    console.log('Email: admin@example.com');
    console.log('Password: password123');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await db.end();
  }
}

seed();