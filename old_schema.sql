-- AI Agent Platform Database Schema for Neon PostgreSQL
-- This schema supports LLM agents, workflows, prompts, and token management

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication and role management
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'designer', 'user')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- API Keys for service authentication
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google', 'groq', 'custom')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- LLM Models configuration
CREATE TABLE llm_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    context_window INTEGER,
    max_tokens INTEGER,
    cost_per_1k_input_tokens DECIMAL(10, 6),
    cost_per_1k_output_tokens DECIMAL(10, 6),
    is_active BOOLEAN DEFAULT true,
    capabilities JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, model_name)
);

-- Agent Templates
CREATE TABLE agent_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sheets', 'calendar', 'drive', 'custom')),
    description TEXT,
    icon VARCHAR(50),
    base_prompt TEXT,
    system_prompt TEXT,
    tools_required JSONB DEFAULT '[]',
    default_model_id UUID REFERENCES llm_models(id),
    created_by UUID REFERENCES users(id),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User's AI Agents
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES agent_templates(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    llm_model_id UUID REFERENCES llm_models(id),
    custom_prompt TEXT,
    system_prompt TEXT,
    temperature DECIMAL(3, 2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
    max_tokens INTEGER DEFAULT 2000,
    tools_config JSONB DEFAULT '{}',
    memory_enabled BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_agent_name_per_user UNIQUE(user_id, name)
);

-- Workflow definitions (n8n-style)
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,
    workflow_data JSONB NOT NULL, -- Stores the n8n-style workflow JSON
    trigger_type VARCHAR(50) CHECK (trigger_type IN ('manual', 'schedule', 'webhook', 'event')),
    schedule_config JSONB,
    tags TEXT[],
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Workflow executions
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    execution_time_ms INTEGER,
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    tokens_used INTEGER DEFAULT 0,
    cost DECIMAL(10, 6) DEFAULT 0
);

-- Prompt templates
CREATE TABLE prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) CHECK (category IN ('email', 'sheets', 'general', 'analysis', 'creative')),
    prompt_text TEXT NOT NULL,
    variables JSONB DEFAULT '[]', -- Array of variable definitions
    examples JSONB DEFAULT '[]',
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat sessions for LLM playground
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
    title VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'function')),
    content TEXT NOT NULL,
    function_name VARCHAR(100),
    function_args JSONB,
    tokens_used INTEGER,
    model_used VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tool/Integration configurations
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('gmail', 'google_sheets', 'google_drive', 'google_calendar', 'slack', 'custom')),
    name VARCHAR(255) NOT NULL,
    config JSONB NOT NULL, -- Encrypted credentials and settings
    is_active BOOLEAN DEFAULT true,
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_integration_per_user UNIQUE(user_id, type, name)
);

-- Token usage tracking
CREATE TABLE token_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE SET NULL,
    chat_session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
    model_id UUID REFERENCES llm_models(id),
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
    cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Purchase plans and subscriptions
CREATE TABLE purchase_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2),
    price_yearly DECIMAL(10, 2),
    token_limit_monthly INTEGER,
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User subscriptions
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES purchase_plans(id),
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'paused')),
    billing_cycle VARCHAR(20) CHECK (billing_cycle IN ('monthly', 'yearly')),
    current_period_start DATE NOT NULL,
    current_period_end DATE NOT NULL,
    tokens_used_this_period INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Workflow templates library
CREATE TABLE workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    workflow_data JSONB NOT NULL,
    required_integrations TEXT[],
    preview_image_url TEXT,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role) WHERE is_active = true;
CREATE INDEX idx_agents_user_id ON agents(user_id) WHERE is_active = true;
CREATE INDEX idx_workflows_user_id ON workflows(user_id) WHERE is_active = true;
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id) WHERE is_active = true;
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_token_usage_user_id ON token_usage(user_id);
CREATE INDEX idx_token_usage_created_at ON token_usage(created_at);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Functions for updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompts_updated_at BEFORE UPDATE ON prompts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for user token usage summary
CREATE VIEW user_token_summary AS
SELECT 
    u.id as user_id,
    u.email,
    us.plan_id,
    us.tokens_used_this_period,
    pp.token_limit_monthly,
    COUNT(DISTINCT tu.id) as total_requests,
    SUM(tu.total_tokens) as total_tokens_used,
    SUM(tu.cost) as total_cost,
    DATE_TRUNC('month', CURRENT_DATE) as current_month
FROM users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
LEFT JOIN purchase_plans pp ON us.plan_id = pp.id
LEFT JOIN token_usage tu ON u.id = tu.user_id 
    AND tu.created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY u.id, u.email, us.plan_id, us.tokens_used_this_period, pp.token_limit_monthly;

-- Insert default LLM models
INSERT INTO llm_models (provider, model_name, display_name, description, context_window, max_tokens, cost_per_1k_input_tokens, cost_per_1k_output_tokens, capabilities) VALUES
('openai', 'gpt-4-turbo', 'GPT-4 Turbo', 'Latest GPT-4 Turbo with vision', 128000, 4096, 0.01, 0.03, '{"vision": true, "functions": true, "json_mode": true}'),
('openai', 'gpt-3.5-turbo', 'GPT-3.5 Turbo', 'Fast and efficient model', 16385, 4096, 0.0005, 0.0015, '{"functions": true, "json_mode": true}'),
('anthropic', 'claude-3-opus', 'Claude 3 Opus', 'Most capable Claude model', 200000, 4096, 0.015, 0.075, '{"vision": true}'),
('anthropic', 'claude-3-sonnet', 'Claude 3 Sonnet', 'Balanced Claude model', 200000, 4096, 0.003, 0.015, '{"vision": true}'),
('google', 'gemini-pro', 'Gemini Pro', 'Google''s advanced model', 32768, 8192, 0.00025, 0.0005, '{"vision": true, "functions": true}'),
('groq', 'llama-3.3-70b-versatile', 'Llama 3.3 70B', 'Fast open-source model', 8192, 4096, 0.0, 0.0, '{"functions": true}');

-- Insert default purchase plans
INSERT INTO purchase_plans (name, description, price_monthly, price_yearly, token_limit_monthly, features) VALUES
('Free', 'Perfect for getting started', 0, 0, 10000, '{"agents": 3, "workflows": 5, "integrations": 2}'),
('Pro', 'For professionals and small teams', 20, 200, 100000, '{"agents": 10, "workflows": 20, "integrations": 5, "priority_support": true}'),
('Business', 'For growing businesses', 50, 500, 500000, '{"agents": -1, "workflows": -1, "integrations": -1, "priority_support": true, "custom_models": true}');

-- Insert default agent templates
INSERT INTO agent_templates (name, type, description, icon, base_prompt, system_prompt, tools_required) VALUES
('Email Assistant', 'email', 'Read, compose, and manage emails', 'mail', 
'You are an intelligent email assistant. Help users read, compose, and manage their emails effectively.',
'Always be professional and concise in email communications. Respect privacy and confidentiality.', 
'["gmail_read", "gmail_send", "gmail_search"]'),

('Sheets Analyst', 'sheets', 'Analyze and manipulate Google Sheets data', 'table', 
'You are a data analyst specialized in Google Sheets. Help users analyze, visualize, and manipulate spreadsheet data.',
'Provide clear explanations of data insights. Suggest best practices for data organization.',
'["sheets_read", "sheets_write", "sheets_create"]'),

('Calendar Manager', 'calendar', 'Manage schedules and appointments', 'calendar', 
'You are a calendar management assistant. Help users schedule meetings, manage appointments, and organize their time.',
'Be mindful of time zones. Suggest optimal meeting times based on availability.',
'["calendar_read", "calendar_create", "calendar_update"]');

-- Sample data for testing (optional)
-- Insert a test user (password: 'testpassword123' - you should hash this properly)
-- INSERT INTO users (email, password_hash, full_name, role) VALUES
-- ('test@example.com', '$2b$10$YourHashedPasswordHere', 'Test User', 'user');