-- Add Gemini models to llm_models table
INSERT INTO llm_models (id, model_name, display_name, provider) VALUES
  ('gemini-pro', 'gemini-pro', 'Gemini Pro', 'google'),
  ('gemini-pro-vision', 'gemini-pro-vision', 'Gemini Pro Vision', 'google')
ON CONFLICT (id) DO UPDATE SET
  model_name = EXCLUDED.model_name,
  display_name = EXCLUDED.display_name,
  provider = EXCLUDED.provider;

-- Add API keys table if not exists
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, provider)
);