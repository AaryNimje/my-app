// backend/scripts/fix-agent-schema.js
const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function fixAgentSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Fixing AI Agents Schema...\n');
    await client.connect();

    // Drop existing CHECK constraints using pg_constraint
    const checkConstraints = await client.query(`
      SELECT con.conname AS constraint_name
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'ai_agents' AND con.contype = 'c';
    `);

    if (checkConstraints.rows.length > 0) {
      console.log('Removing existing CHECK constraints...');
      for (const constraint of checkConstraints.rows) {
        const name = constraint.constraint_name;
        try {
          await client.query(`ALTER TABLE ai_agents DROP CONSTRAINT "${name}"`);
        } catch (err) {
          console.warn(`⚠️ Could not drop constraint "${name}": ${err.message}`);
        }
      }
    }

    // Drop any foreign key constraint before altering model_id type
    const fkConstraints = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'ai_agents' AND constraint_type = 'FOREIGN KEY';
    `);

    if (fkConstraints.rows.length > 0) {
      console.log('Dropping foreign key constraints...');
      for (const fk of fkConstraints.rows) {
        const name = fk.constraint_name;
        await client.query(`ALTER TABLE ai_agents DROP CONSTRAINT "${name}"`);
      }
    }

    // Check which columns exist
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ai_agents' 
      AND column_name IN ('system_prompt', 'custom_prompt', 'llm_model_id', 'model_id')
    `);

    const columns = columnCheck.rows.map(row => row.column_name);

    // Rename system_prompt to custom_prompt if needed
    if (columns.includes('system_prompt') && !columns.includes('custom_prompt')) {
      console.log('Renaming system_prompt to custom_prompt...');
      await client.query('ALTER TABLE ai_agents RENAME COLUMN system_prompt TO custom_prompt');
    }

    // Rename llm_model_id to model_id if needed
    if (columns.includes('llm_model_id') && !columns.includes('model_id')) {
      console.log('Renaming llm_model_id to model_id...');
      await client.query('ALTER TABLE ai_agents RENAME COLUMN llm_model_id TO model_id');
    }

    // Change model_id type if it's UUID
    const modelIdType = await client.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ai_agents' 
      AND column_name = 'model_id'
    `);

    if (modelIdType.rows[0] && modelIdType.rows[0].data_type === 'uuid') {
      console.log('Changing model_id from UUID to VARCHAR...');
      await client.query('ALTER TABLE ai_agents ALTER COLUMN model_id TYPE VARCHAR(255) USING model_id::text');
    }

    // Add missing columns if they don't exist
    const addColumnIfNotExists = async (columnName, columnDef) => {
      const exists = await client.query(
        `SELECT 1 FROM information_schema.columns 
         WHERE table_name = 'ai_agents' AND column_name = $1`,
        [columnName]
      );
      if (exists.rows.length === 0) {
        console.log(`Adding column ${columnName}...`);
        await client.query(`ALTER TABLE ai_agents ADD COLUMN ${columnName} ${columnDef}`);
      }
    };

    await addColumnIfNotExists('custom_prompt', 'TEXT');
    await addColumnIfNotExists('model_id', 'VARCHAR(255)');
    await addColumnIfNotExists('temperature', 'DECIMAL(3,2) DEFAULT 0.7');
    await addColumnIfNotExists('max_tokens', 'INTEGER DEFAULT 1000');

    console.log('\n✅ Schema fixed successfully!');
    console.log('Your ai_agents table now has the correct structure for the controller.');

  } catch (error) {
    console.error('Error fixing schema:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await client.end();
  }
}

fixAgentSchema();
