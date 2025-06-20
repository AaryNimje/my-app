-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default LLM models
INSERT INTO llm_models (provider, model_name, display_name, description, model_type, context_window, max_tokens, supports_functions, supports_vision, cost_per_1k_input_tokens, cost_per_1k_output_tokens) VALUES
-- OpenAI Models
('openai', 'gpt-4-turbo-preview', 'GPT-4 Turbo', 'Latest GPT-4 Turbo with vision', 'chat', 128000, 4096, true, true, 0.01, 0.03),
('openai', 'gpt-4', 'GPT-4', 'Standard GPT-4 model', 'chat', 8192, 4096, true, false, 0.03, 0.06),
('openai', 'gpt-3.5-turbo', 'GPT-3.5 Turbo', 'Fast and efficient model', 'chat', 16385, 4096, true, false, 0.0005, 0.0015),
-- Anthropic Models
('anthropic', 'claude-3-opus', 'Claude 3 Opus', 'Most capable Claude model', 'chat', 200000, 4096, true, true, 0.015, 0.075),
('anthropic', 'claude-3-sonnet', 'Claude 3 Sonnet', 'Balanced Claude model', 'chat', 200000, 4096, true, true, 0.003, 0.015),
('anthropic', 'claude-3-haiku', 'Claude 3 Haiku', 'Fast Claude model', 'chat', 200000, 4096, true, true, 0.00025, 0.00125),
-- Google Models
('google', 'gemini-pro', 'Gemini Pro', 'Google''s advanced model', 'chat', 32768, 8192, true, false, 0.00025, 0.0005),
('google', 'gemini-pro-vision', 'Gemini Pro Vision', 'Gemini with vision capabilities', 'chat', 32768, 8192, true, true, 0.00025, 0.0005),
-- Groq Models
('groq', 'llama-3.3-70b-versatile', 'Llama 3.3 70B', 'Fast open-source model on Groq', 'chat', 8192, 4096, true, false, 0.0, 0.0),
('groq', 'mixtral-8x7b', 'Mixtral 8x7B', 'MoE model on Groq', 'chat', 32768, 4096, true, false, 0.0, 0.0);

-- Insert default MCP server
INSERT INTO mcp_servers (name, description, is_public) VALUES
('Default Tools Server', 'Built-in tools for common operations', true);

-- Insert some default tools (you'll add more based on your needs)
INSERT INTO mcp_tools (mcp_server_id, tool_name, display_name, description, category, input_schema) 
SELECT 
    id,
    'web_search',
    'Web Search',
    'Search the web for information',
    'research',
    '{"type": "object", "properties": {"query": {"type": "string", "description": "Search query"}}, "required": ["query"]}'::jsonb
FROM mcp_servers WHERE name = 'Default Tools Server';

-- Add more default tools as needed...