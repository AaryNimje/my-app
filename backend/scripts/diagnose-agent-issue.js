// backend/scripts/diagnose-agent-issue.js
const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function diagnoseAgentIssue() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Diagnosing AI Agent Creation Issue...\n');
    await client.connect();

    // 1. Check table structure
    console.log('1. Checking ai_agents table structure:');
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'ai_agents'
      ORDER BY ordinal_position
    `);
    
    console.log('\nColumns in ai_agents table:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
    });

    // 2. Check constraints
    console.log('\n2. Checking constraints:');
    const constraints = await client.query(`
      SELECT tc.constraint_name, tc.constraint_type, cc.check_clause
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.check_constraints cc 
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_name = 'ai_agents'
    `);
    
    if (constraints.rows.length > 0) {
      constraints.rows.forEach(con => {
        console.log(`   - ${con.constraint_name}: ${con.constraint_type}`);
        if (con.check_clause) {
          console.log(`     Check: ${con.check_clause}`);
        }
      });
    } else {
      console.log('   No constraints found.');
    }

    // 3. Test insert with sample data
    console.log('\n3. Testing agent creation with sample data:');
    const testUserId = await client.query(`
      SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1
    `);

    if (testUserId.rows.length === 0) {
      console.log('   ❌ No test user found. Please run create-test-user.js first.');
      return;
    }

    const userId = testUserId.rows[0].id;
    console.log(`   Using user ID: ${userId}`);

    // Try to insert
    try {
      const testAgent = await client.query(`
        INSERT INTO ai_agents (
          user_id, name, agent_type, description, custom_prompt,
          model_id, temperature, max_tokens
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, name
      `, [
        userId,
        'Test Agent',
        'email',
        'Test description',
        'You are a test agent',
        'gemini-pro',
        0.7,
        1000
      ]);

      console.log(`   ✅ Test agent created successfully! ID: ${testAgent.rows[0].id}`);
      
      // Clean up
      await client.query('DELETE FROM ai_agents WHERE id = $1', [testAgent.rows[0].id]);
      console.log('   🧹 Test agent cleaned up.');
      
    } catch (insertError) {
      console.log('   ❌ Test insert failed with error:');
      console.log(`      Code: ${insertError.code}`);
      console.log(`      Message: ${insertError.message}`);
      console.log(`      Detail: ${insertError.detail || 'No details'}`);
      console.log(`      Hint: ${insertError.hint || 'No hint'}`);
    }

    // 4. Recommendations
    console.log('\n4. Recommendations:');
    const columnNames = columns.rows.map(c => c.column_name);
    
    if (!columnNames.includes('custom_prompt')) {
      console.log('   ⚠️  Missing "custom_prompt" column - run fix-agent-schema.js');
    }
    if (!columnNames.includes('model_id')) {
      console.log('   ⚠️  Missing "model_id" column - run fix-agent-schema.js');
    }
    
    const agentTypeConstraint = constraints.rows.find(c => 
      c.check_clause && c.check_clause.includes('agent_type')
    );
    
    if (agentTypeConstraint && !agentTypeConstraint.check_clause.includes('email')) {
      console.log('   ⚠️  agent_type CHECK constraint doesn\'t allow "email" - run fix-agent-schema.js');
    }

    console.log('\n✅ Diagnosis complete!');

  } catch (error) {
    console.error('Diagnosis error:', error.message);
  } finally {
    await client.end();
  }
}

diagnoseAgentIssue();