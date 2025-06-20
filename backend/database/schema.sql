-- Advanced AI Platform Database Schema
-- Supports visual workflow builder, MCP tools, autonomous agents, and complete workflow execution

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- For embeddings in knowledge base
CREATE EXTENSION IF NOT EXISTS "pg_cron"; -- For scheduled autonomous agents
-- updated schema
-- =====================================================
-- CORE USER AND AUTHENTICATION
-- =====================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'designer', 'user', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}', -- User preferences
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- API Keys per provider per user
CREATE TABLE user_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google', 'groq', 'cohere', 'huggingface')),
    api_key_encrypted TEXT NOT NULL, -- Encrypted API key
    key_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_valid BOOLEAN DEFAULT true, -- Set to false if key validation fails
    usage_limit DECIMAL(10, 2), -- Dollar limit if applicable
    usage_current DECIMAL(10, 2) DEFAULT 0,
    tokens_remaining INTEGER, -- For providers that provide token counts
    last_validated TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider, key_name)
);

-- =====================================================
-- PROJECT KNOWLEDGE LIBRARY
-- =====================================================

CREATE TABLE project_knowledge_bases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE knowledge_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    knowledge_base_id UUID NOT NULL REFERENCES project_knowledge_bases(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50), -- pdf, doc, txt, md, etc
    file_path TEXT, -- Original file location
    metadata JSONB DEFAULT '{}',
    embedding VECTOR(1536), -- For semantic search
    chunk_index INTEGER, -- If document is chunked
    parent_document_id UUID REFERENCES knowledge_documents(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- LLM MODELS AND CONFIGURATIONS
-- =====================================================

CREATE TABLE llm_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    model_type VARCHAR(50) CHECK (model_type IN ('chat', 'completion', 'embedding', 'image', 'audio')),
    context_window INTEGER,
    max_tokens INTEGER,
    supports_functions BOOLEAN DEFAULT false,
    supports_vision BOOLEAN DEFAULT false,
    supports_streaming BOOLEAN DEFAULT true,
    cost_per_1k_input_tokens DECIMAL(10, 6),
    cost_per_1k_output_tokens DECIMAL(10, 6),
    default_temperature DECIMAL(3, 2) DEFAULT 0.7,
    is_active BOOLEAN DEFAULT true,
    capabilities JSONB DEFAULT '{}',
    parameter_schema JSONB, -- Schema for model-specific parameters
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, model_name)
);

-- =====================================================
-- WORKFLOW SYSTEM
-- =====================================================

CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,
    is_template BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    canvas_state JSONB, -- Stores visual positions of nodes
    global_variables JSONB DEFAULT '{}',
    trigger_config JSONB, -- For autonomous/scheduled workflows
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_workflow_name_per_user UNIQUE(user_id, name, version)
);

-- Workflow nodes (components in the visual builder)
CREATE TABLE workflow_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    node_type VARCHAR(50) NOT NULL CHECK (node_type IN (
        'file_input', 'text_input', 'api_input',
        'ai_agent', 'llm', 'tool', 'function',
        'condition', 'loop', 'transform',
        'output', 'webhook', 'email', 'storage'
    )),
    name VARCHAR(255) NOT NULL,
    position_x INTEGER NOT NULL DEFAULT 0,
    position_y INTEGER NOT NULL DEFAULT 0,
    config JSONB NOT NULL DEFAULT '{}', -- Node-specific configuration
    input_schema JSONB, -- Expected input format
    output_schema JSONB, -- Output format this node produces
    error_handling JSONB DEFAULT '{"retry": 3, "on_error": "stop"}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Connections between nodes
CREATE TABLE workflow_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    source_node_id UUID NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
    source_handle VARCHAR(50) DEFAULT 'output', -- For nodes with multiple outputs
    target_node_id UUID NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
    target_handle VARCHAR(50) DEFAULT 'input', -- For nodes with multiple inputs
    transform_config JSONB, -- Optional data transformation between nodes
    condition_config JSONB, -- For conditional connections
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_node_id, source_handle, target_node_id, target_handle)
);

-- =====================================================
-- AI AGENTS SYSTEM
-- =====================================================

CREATE TABLE ai_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workflow_node_id UUID REFERENCES workflow_nodes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    agent_type VARCHAR(50) CHECK (agent_type IN ('task', 'conversational', 'autonomous', 'reactive')),
    llm_model_id UUID REFERENCES llm_models(id),
    system_prompt TEXT,
    prompt_template TEXT,
    temperature DECIMAL(3, 2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2000,
    tool_selection_strategy VARCHAR(50) DEFAULT 'auto', -- auto, manual, required
    memory_type VARCHAR(50) DEFAULT 'buffer', -- buffer, summary, kg, vector
    memory_config JSONB DEFAULT '{}',
    is_autonomous BOOLEAN DEFAULT false,
    autonomous_config JSONB, -- Trigger conditions, schedules, etc.
    mcp_server_id UUID, -- Reference to MCP server config
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MCP (Model Context Protocol) TOOLS SYSTEM
-- =====================================================

CREATE TABLE mcp_servers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    server_url TEXT,
    is_public BOOLEAN DEFAULT false,
    owner_id UUID REFERENCES users(id),
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mcp_tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mcp_server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE,
    tool_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    description TEXT,
    category VARCHAR(50),
    input_schema JSONB NOT NULL, -- JSON Schema for tool inputs
    output_schema JSONB, -- JSON Schema for tool outputs
    requires_auth BOOLEAN DEFAULT false,
    auth_config JSONB,
    rate_limit INTEGER, -- Calls per minute
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mcp_server_id, tool_name)
);

-- Agent tool selections
CREATE TABLE agent_tool_selections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    tool_id UUID NOT NULL REFERENCES mcp_tools(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT false,
    custom_config JSONB, -- Override tool config for this agent
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, tool_id)
);

-- =====================================================
-- WORKFLOW EXECUTION
-- =====================================================

CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id),
    user_id UUID NOT NULL REFERENCES users(id),
    parent_execution_id UUID REFERENCES workflow_executions(id), -- For sub-workflows
    trigger_type VARCHAR(50) CHECK (trigger_type IN ('manual', 'scheduled', 'webhook', 'event', 'autonomous')),
    trigger_details JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'initializing', 'running', 'paused', 'completed', 'failed', 'cancelled'
    )),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    execution_time_ms INTEGER,
    total_tokens_used INTEGER DEFAULT 0,
    total_cost DECIMAL(10, 6) DEFAULT 0,
    error_message TEXT,
    error_details JSONB,
    execution_context JSONB DEFAULT '{}', -- Global context for the execution
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Node execution states
CREATE TABLE node_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    node_id UUID NOT NULL REFERENCES workflow_nodes(id),
    agent_id UUID REFERENCES ai_agents(id), -- If node uses an agent
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'running', 'completed', 'failed', 'skipped'
    )),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    execution_time_ms INTEGER,
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    tokens_used INTEGER,
    llm_model_used VARCHAR(100),
    tools_used TEXT[], -- Array of tool names used
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CHAT SESSIONS WITH WORKFLOW INTEGRATION
-- =====================================================

CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES workflows(id),
    workflow_execution_id UUID REFERENCES workflow_executions(id),
    autonomous_agent_id UUID REFERENCES ai_agents(id), -- For autonomous agent sessions
    title VARCHAR(255),
    session_type VARCHAR(50) DEFAULT 'interactive' CHECK (session_type IN ('interactive', 'autonomous', 'workflow')),
    knowledge_base_id UUID REFERENCES project_knowledge_bases(id), -- Attached knowledge base
    context JSONB DEFAULT '{}', -- Session context/memory
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    workflow_execution_id UUID REFERENCES workflow_executions(id),
    node_execution_id UUID REFERENCES node_executions(id),
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'function', 'tool')),
    content TEXT,
    tool_calls JSONB, -- For function/tool calls
    tool_call_id VARCHAR(255), -- For matching tool responses
    metadata JSONB DEFAULT '{}', -- Additional message metadata
    llm_model_id UUID REFERENCES llm_models(id),
    tokens_used INTEGER,
    attachments JSONB, -- File attachments
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- FILE MANAGEMENT
-- =====================================================

CREATE TABLE user_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workflow_execution_id UUID REFERENCES workflow_executions(id),
    chat_session_id UUID REFERENCES chat_sessions(id),
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    mime_type VARCHAR(100),
    file_size_bytes BIGINT,
    storage_path TEXT NOT NULL, -- S3 key or local path
    file_hash VARCHAR(64), -- SHA-256 hash for deduplication
    metadata JSONB DEFAULT '{}',
    processing_status VARCHAR(50) DEFAULT 'uploaded',
    processed_data JSONB, -- Extracted/processed content
    is_temporary BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- AUTONOMOUS AGENTS AND EVENTS
-- =====================================================

CREATE TABLE autonomous_agent_triggers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN (
        'schedule', 'webhook', 'event', 'condition', 'file_change', 'api_poll'
    )),
    trigger_config JSONB NOT NULL, -- Cron expression, webhook URL, event name, etc.
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    next_trigger_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE agent_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    workflow_execution_id UUID REFERENCES workflow_executions(id),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PROMPTS AND TEMPLATES
-- =====================================================

CREATE TABLE prompt_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    template_type VARCHAR(50) CHECK (template_type IN ('system', 'user', 'assistant', 'function')),
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]', -- Variable definitions with types
    examples JSONB DEFAULT '[]',
    context_requirements JSONB, -- Required context fields
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- LOGS AND HISTORY
-- =====================================================

CREATE TABLE execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    workflow_execution_id UUID REFERENCES workflow_executions(id),
    node_execution_id UUID REFERENCES node_executions(id),
    log_level VARCHAR(20) CHECK (log_level IN ('debug', 'info', 'warning', 'error', 'critical')),
    source VARCHAR(100), -- Component that generated the log
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Comprehensive audit log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    changes JSONB, -- Before/after for updates
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TOKEN USAGE AND BILLING
-- =====================================================

CREATE TABLE token_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workflow_execution_id UUID REFERENCES workflow_executions(id),
    node_execution_id UUID REFERENCES node_executions(id),
    chat_session_id UUID REFERENCES chat_sessions(id),
    llm_model_id UUID REFERENCES llm_models(id),
    api_key_id UUID REFERENCES user_api_keys(id),
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
    cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- WORKFLOW MARKETPLACE
-- =====================================================

CREATE TABLE workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_workflow_id UUID REFERENCES workflows(id),
    creator_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    tags TEXT[],
    preview_image_url TEXT,
    workflow_definition JSONB NOT NULL, -- Complete workflow export
    required_tools TEXT[], -- List of required MCP tools
    estimated_cost_per_run DECIMAL(10, 4),
    usage_count INTEGER DEFAULT 0,
    rating DECIMAL(3, 2),
    is_featured BOOLEAN DEFAULT false,
    price DECIMAL(10, 2) DEFAULT 0, -- 0 for free templates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- COMPONENT LIBRARIES (For custom components)
-- =====================================================

CREATE TABLE custom_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    component_type VARCHAR(50),
    description TEXT,
    code TEXT, -- JavaScript/Python code for the component
    language VARCHAR(20) CHECK (language IN ('javascript', 'python')),
    input_schema JSONB,
    output_schema JSONB,
    dependencies JSONB, -- Required libraries
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User and auth indexes
CREATE INDEX idx_users_email ON users(email) WHERE is_active = true;
CREATE INDEX idx_users_role ON users(role) WHERE is_active = true;
CREATE INDEX idx_user_api_keys_user_provider ON user_api_keys(user_id, provider) WHERE is_active = true;

-- Workflow indexes
CREATE INDEX idx_workflows_user_id ON workflows(user_id) WHERE is_active = true;
CREATE INDEX idx_workflows_public ON workflows(is_public) WHERE is_public = true AND is_active = true;
CREATE INDEX idx_workflow_nodes_workflow ON workflow_nodes(workflow_id);
CREATE INDEX idx_workflow_nodes_type ON workflow_nodes(node_type);
CREATE INDEX idx_workflow_connections_workflow ON workflow_connections(workflow_id);

-- Execution indexes
CREATE INDEX idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_user ON workflow_executions(user_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_node_executions_workflow_exec ON node_executions(workflow_execution_id);
CREATE INDEX idx_node_executions_status ON node_executions(status);

-- Chat indexes
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id) WHERE is_active = true;
CREATE INDEX idx_chat_sessions_workflow ON chat_sessions(workflow_id);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);

-- Knowledge base indexes
CREATE INDEX idx_knowledge_docs_kb ON knowledge_documents(knowledge_base_id);
CREATE INDEX idx_knowledge_docs_embedding ON knowledge_documents USING ivfflat (embedding vector_cosine_ops);

-- Agent indexes
CREATE INDEX idx_ai_agents_user ON ai_agents(user_id);
CREATE INDEX idx_ai_agents_autonomous ON ai_agents(is_autonomous) WHERE is_autonomous = true;
CREATE INDEX idx_agent_alerts_user ON agent_alerts(user_id) WHERE is_read = false;

-- Token usage indexes
CREATE INDEX idx_token_usage_user ON token_usage(user_id);
CREATE INDEX idx_token_usage_created ON token_usage(created_at);
CREATE INDEX idx_token_usage_workflow_exec ON token_usage(workflow_execution_id);

-- Log indexes
CREATE INDEX idx_execution_logs_workflow ON execution_logs(workflow_execution_id);
CREATE INDEX idx_execution_logs_level ON execution_logs(log_level);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON ai_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate workflow execution costs
CREATE OR REPLACE FUNCTION calculate_workflow_cost(exec_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    total_cost DECIMAL(10, 6) := 0;
BEGIN
    SELECT COALESCE(SUM(tu.cost), 0) INTO total_cost
    FROM token_usage tu
    WHERE tu.workflow_execution_id = exec_id;
    
    RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR EASIER QUERYING
-- =====================================================

-- Active workflows with stats
CREATE VIEW workflow_stats AS
SELECT 
    w.id,
    w.user_id,
    w.name,
    w.description,
    w.is_active,
    COUNT(DISTINCT we.id) as execution_count,
    COUNT(DISTINCT we.id) FILTER (WHERE we.status = 'completed') as successful_runs,
    COUNT(DISTINCT we.id) FILTER (WHERE we.status = 'failed') as failed_runs,
    AVG(we.execution_time_ms) as avg_execution_time_ms,
    SUM(we.total_cost) as total_cost
FROM workflows w
LEFT JOIN workflow_executions we ON w.id = we.workflow_id
GROUP BY w.id;

-- User token usage summary
CREATE VIEW user_token_summary AS
SELECT 
    u.id as user_id,
    u.email,
    DATE_TRUNC('month', tu.created_at) as month,
    lm.provider,
    SUM(tu.total_tokens) as total_tokens,
    SUM(tu.cost) as total_cost,
    COUNT(DISTINCT tu.workflow_execution_id) as workflow_runs,
    COUNT(DISTINCT tu.chat_session_id) as chat_sessions
FROM users u
LEFT JOIN token_usage tu ON u.id = tu.user_id
LEFT JOIN llm_models lm ON tu.llm_model_id = lm.id
GROUP BY u.id, u.email, DATE_TRUNC('month', tu.created_at), lm.provider;

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