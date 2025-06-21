// Common API response types
export interface ApiResponse {
  success: boolean;
  error?: string;
}

// Session types
export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  is_shared?: boolean;
  share_mode?: 'view' | 'edit';
  workflow_id?: string;
  knowledge_base_id?: string;
}

export interface SessionsResponse extends ApiResponse {
  sessions?: ChatSession[];
}

export interface SessionResponse extends ApiResponse {
  session?: ChatSession;
}

// Message types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  tokens_used?: number;
  llm_model_id?: string;
  attachments?: any[];
  output_files?: OutputFile[];
}

export interface MessagesResponse extends ApiResponse {
  messages?: ChatMessage[];
}

export interface MessageResponse extends ApiResponse {
  userMessage?: ChatMessage;
  assistantMessage?: ChatMessage;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  output_files?: OutputFile[];
}

// Model types
export interface LLMModel {
  id: string;
  model_name: string;
  display_name: string;
  provider: string;
}

export interface ModelsResponse extends ApiResponse {
  models?: LLMModel[];
}

// Agent types
export interface Agent {
  id: string;
  name: string;
  type: string;
  description?: string;
}

export interface AgentsResponse extends ApiResponse {
  agents?: Agent[];
}

// Workflow types
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  canvas_state?: any;
}

export interface WorkflowsResponse extends ApiResponse {
  workflows?: Workflow[];
}

// Knowledge base types
export interface KnowledgeDocument {
  id: string;
  name: string;
  content?: string;
  file_type?: string;
}

export interface KnowledgeResponse extends ApiResponse {
  documents?: KnowledgeDocument[];
}

// Output file types
export interface OutputFile {
  id: string;
  name: string;
  type: string;
  content: string;
  downloadUrl?: string;
}

// Token usage types
export interface TokenUsage {
  used: number;
  limit: number;
  model: string;
}