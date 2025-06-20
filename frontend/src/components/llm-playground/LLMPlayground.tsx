// src/components/llm-playground/LLMPlayground.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { chatApi, agentsApi, llmApi } from '@/lib/api';

// Type definitions
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface ModelSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  streamOutput: boolean;
  agent?: string;
}

interface Agent {
  id: string;
  name: string;
  type: string;
  description?: string;
}

interface LLMModel {
  id: string;
  model_name: string;
  display_name: string;
  provider: string;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

// API response interfaces
interface ApiResponse {
  success: boolean;
  error?: string;
}

interface SessionsResponse extends ApiResponse {
  sessions?: ChatSession[];
}

interface SessionResponse extends ApiResponse {
  session?: ChatSession;
}

interface MessagesResponse extends ApiResponse {
  messages?: any[]; // We'll transform these to our Message type
}

interface MessageResponse extends ApiResponse {
  userMessage?: any;
  assistantMessage?: any;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ModelsResponse extends ApiResponse {
  models?: LLMModel[];
}

interface AgentsResponse extends ApiResponse {
  agents?: Agent[];
}

export function LLMPlayground() {
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  // Model settings
  const [settings, setSettings] = useState<ModelSettings>({
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000,
    streamOutput: true,
    agent: ''
  });

  // Available models and agents
  const [models, setModels] = useState<LLMModel[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  // Show settings panel
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Chat names for multi-chat
  const [chatName, setChatName] = useState<string>('New Chat');

  // Load models and agents on mount
  useEffect(() => {
    loadModels();
    loadAgents();
    loadSessions();
  }, []);

  const loadModels = async () => {
    try {
      const response = await llmApi.models() as ModelsResponse;
      if (response?.success && response?.models) {
        setModels(response.models);
        // Fix for 'response.models' is possibly 'undefined'
        // We've already checked that response.models exists above, so it's safe to use here
        const modelsList = response.models;
        if (modelsList.length > 0 && !settings.model) {
          setSettings(prev => ({ ...prev, model: modelsList[0].id }));
        }
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const loadAgents = async () => {
    try {
      const response = await agentsApi.list() as AgentsResponse;
      if (response?.success && response?.agents) {
        setAgents(response.agents.filter((agent: Agent) => agent.type === 'email'));
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await chatApi.sessions.list() as SessionsResponse;
      if (response?.success && response?.sessions) {
        setSessions(response.sessions);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const response = await chatApi.sessions.create({
        title: chatName,
        agent_id: settings.agent
      }) as SessionResponse;
      
      if (response?.success && response?.session) {
        setSessionId(response.session.id);
        await loadSessions();
        return response.session.id;
      }
      return null;
    } catch (error) {
      console.error('Failed to create session:', error);
      return null;
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const messagesResponse = await chatApi.messages.list(sessionId) as MessagesResponse;
      if (messagesResponse?.success && messagesResponse?.messages) {
        setMessages(messagesResponse.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at)
        })));
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Create session if needed
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = await createNewSession();
      if (!currentSessionId) {
        console.error('Failed to create session');
        return;
      }
    }

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Send message with agent if selected
      const response = await chatApi.messages.send(
        currentSessionId,
        input,
        settings.model,
        settings.agent || undefined
      ) as MessageResponse;

      if (response?.success && response?.assistantMessage) {
        const aiMessage: Message = {
          id: response.assistantMessage.id || `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.assistantMessage.content,
          timestamp: new Date(response.assistantMessage.created_at || Date.now())
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const selectSession = (session: ChatSession) => {
    setSessionId(session.id);
    setChatName(session.title);
    loadSessionMessages(session.id);
  };

  const createNewChat = () => {
    setSessionId(null);
    setChatName('New Chat');
    setMessages([]);
  };

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50">
      {/* Chat List Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">LLM Playground</h2>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <Button
            className="w-full justify-start"
            onClick={createNewChat}
          >
            <span className="mr-2">➕</span> New Chat
          </Button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.map(session => (
            <Card 
              key={session.id}
              className={`mb-2 cursor-pointer ${
                sessionId === session.id 
                  ? 'bg-gray-100 dark:bg-gray-700' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => selectSession(session)}
            >
              <CardContent className="p-3">
                <div className="font-medium text-sm truncate">{session.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(session.updated_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
          <div>
            <input
              type="text"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
              className="text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 px-1 py-0.5 rounded text-gray-900 dark:text-gray-50"
              placeholder="Chat Name"
            />
          </div>
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="text-gray-700 dark:text-gray-300"
            >
              ⚙️ Settings
            </Button>
          </div>
        </div>

        {/* Settings Panel (conditionally rendered) */}
        {showSettings && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 LLMPlayground-settings">
            <h3 className="font-medium mb-2">Model Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Agent (Optional)
                </label>
                <select
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50"
                  value={settings.agent}
                  onChange={(e) => setSettings({...settings, agent: e.target.value})}
                >
                  <option value="">No Agent</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Model
                </label>
                <select
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50"
                  value={settings.model}
                  onChange={(e) => setSettings({...settings, model: e.target.value})}
                  disabled={!!settings.agent}
                >
                  {models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Temperature: {settings.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => setSettings({...settings, temperature: parseFloat(e.target.value)})}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Tokens
                </label>
                <input
                  type="number"
                  value={settings.maxTokens}
                  onChange={(e) => setSettings({...settings, maxTokens: parseInt(e.target.value) || 0})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={settings.streamOutput}
                    onChange={(e) => setSettings({...settings, streamOutput: e.target.checked})}
                    className="mr-2 accent-blue-500 dark:bg-gray-700"
                  />
                  Stream Output
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
          {messages.filter(m => m.role !== 'system').map(message => (
            <div
              key={message.id}
              className={`mb-4 ${
                message.role === 'user' ? 'ml-12' : 'mr-12'
              }`}
            >
              <div
                className={`p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white ml-auto LLMPlayground-userMessage'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 LLMPlayground-message'
                }`}
              >
                {message.content}
              </div>
              <div
                className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${
                  message.role === 'user' ? 'text-right' : ''
                }`}
              >
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}

          {loading && (
            <div className="mb-4 mr-12">
              <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-bounce delay-100"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex">
            <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
              📎
            </button>
            <textarea
              className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 resize-none"
              placeholder="Type your message..."
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button
              className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-r-md"
              onClick={sendMessage}
              disabled={loading}
            >
              📤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}