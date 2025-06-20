// frontend/src/lib/api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface RequestOptions extends RequestInit {
  token?: string;
}

class APIClient {
  private baseURL: string;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const token = localStorage.getItem('token');
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, config);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Request failed');
    }

    return response.json();
  }

  // Auth endpoints
  auth = {
    login: async (credentials: { email: string; password: string }) => {
  const response = await this.request<{
    success: boolean;
    token: string;
    user: { id: string; email: string; full_name: string; role: string };
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  
  if (response.token) {
    localStorage.setItem('token', response.token);
  }
  
  // IMPORTANT: Also store user data
  if (response.user) {
    localStorage.setItem('user', JSON.stringify(response.user));
  }
  
  return response;
},

    register: async (data: { email: string; password: string; full_name: string }) => {
      const response = await this.request<{
        success: boolean;
        token: string;
        user: { id: string; email: string; full_name: string; role: string };
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      if (response.token) {
        localStorage.setItem('token', response.token);
      }
      
      return response;
    },

    getProfile: async () => {
      return this.request<{
        success: boolean;
        user: any;
      }>('/auth/profile');
    },

    logout: () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');  // Also remove user data
  window.location.href = '/login';
},
  };

  // In the agents block:
agents = {
  list: async () => {
    return this.request<{ success: boolean; agents: any[] }>('/agents');
  },

  create: async (data: any) => {
    return this.request<{ success: boolean }>('/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  get: async (id: string) => {
    return this.request<{ success: boolean; agent: any }>(`/agents/${id}`);
  },

  update: async (id: string, data: any) => {
    return this.request<{ success: boolean }>(`/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return this.request<{ success: boolean }>(`/agents/${id}`, {
      method: 'DELETE',
    });
  },

  execute: async (id: string, input: any) => {
    return this.request<{ success: boolean; result: any }>(`/agents/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify({ input }),
    });
  },
}


  // Workflows endpoints
  workflows = {
    list: async () => {
      return this.request<{ success: boolean; workflows: any[] }>('/workflows');
    },

    create: async (data: any) => {
      return this.request('/workflows', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    get: async (id: string) => {
      return this.request(`/workflows/${id}`);
    },

    update: async (id: string, data: any) => {
      return this.request(`/workflows/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: string) => {
      return this.request(`/workflows/${id}`, {
        method: 'DELETE',
      });
    },

    execute: async (id: string) => {
      return this.request(`/workflows/${id}/execute`, {
        method: 'POST',
      });
    },
  };

  // Chat endpoints
  chat = {
    sessions: {
      list: async () => {
        return this.request<{ success: boolean; sessions: any[] }>('/chat/sessions');
      },

      create: async (data: { title: string; agent_id?: string }) => {
        return this.request('/chat/sessions', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },

      get: async (id: string) => {
        return this.request(`/chat/sessions/${id}`);
      },

      delete: async (id: string) => {
        return this.request(`/chat/sessions/${id}`, {
          method: 'DELETE',
        });
      },
    },

    messages: {
      send: async (sessionId: string, message: string, model_id?: string, agent_id?: string) => {
        return this.request(`/chat/sessions/${sessionId}/messages`, {
          method: 'POST',
          body: JSON.stringify({ message, model_id, agent_id }),
        });
      },

      list: async (sessionId: string) => {
        return this.request(`/chat/sessions/${sessionId}/messages`);
      },
    },

    // Direct chat without session (for LLM Playground)
    sendMessage: async (message: string, agent_id?: string, model_id?: string) => {
      return this.request('/chat/messages', {
        method: 'POST',
        body: JSON.stringify({ message, agent_id, model_id }),
      });
    },
  };

  // LLM endpoints
  llm = {
    models: async () => {
      return this.request<{ success: boolean; models: any[] }>('/llm/models');
    },

    complete: async (data: { prompt: string; model_id: string; options?: any }) => {
      return this.request('/llm/complete', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    chat: async (data: { messages: any[]; model_id: string; options?: any }) => {
      return this.request('/llm/chat', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    apiKeys: {
      list: async () => {
        return this.request<{ success: boolean; apiKeys: any[] }>('/llm/api-keys');
      },

      upsert: async (provider: string, apiKey: string) => {
        return this.request('/llm/api-keys', {
          method: 'POST',
          body: JSON.stringify({ provider, api_key: apiKey }),
        });
      },

      delete: async (provider: string) => {
        return this.request(`/llm/api-keys/${provider}`, {
          method: 'DELETE',
        });
      },
    },
  };

  // Integration endpoints
  integrations = {
    list: async () => {
      return this.request<{ success: boolean; integrations: any[] }>('/integrations');
    },

    google: {
      auth: async (integrationType: string) => {
        return this.request<{ success: boolean; authUrl: string }>('/integrations/google/auth', {
          method: 'POST',
          body: JSON.stringify({ integrationType }),
        });
      },
    },

    email: {
      add: async (data: { email: string; password: string; name: string }) => {
        return this.request('/integrations/email', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },
    },

    delete: async (id: string) => {
      return this.request(`/integrations/${id}`, {
        method: 'DELETE',
      });
    },
  };

  // Knowledge base endpoints
  knowledge = {
    documents: {
      list: async () => {
        return this.request<{ success: boolean; documents: any[] }>('/knowledge/documents');
      },

      upload: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${this.baseURL}/knowledge/documents/upload`, {
          method: 'POST',
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        
        return response.json();
      },

      delete: async (id: string) => {
        return this.request(`/knowledge/documents/${id}`, {
          method: 'DELETE',
        });
      },
    },

    search: async (query: string) => {
      return this.request('/knowledge/search', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });
    },
  };

  // Dashboard endpoints
  dashboard = {
    stats: async () => {
      return this.request<{ success: boolean; stats: any }>('/dashboard/stats');
    },
  };
}

// Create and export API instance
const api = new APIClient(API_BASE_URL);

// Export individual APIs for convenience
export const authApi = api.auth;
export const agentsApi = api.agents;
export const workflowsApi = api.workflows;
export const chatApi = api.chat;
export const llmApi = api.llm;
export const integrationsApi = api.integrations;
export const knowledgeApi = api.knowledge;
export const dashboardApi = api.dashboard;

// Export the full API client
export default api;