'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { chatApi, agentsApi, llmApi, knowledgeApi, workflowsApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { 
  Paperclip, 
  Send, 
  Download, 
  Share2, 
  Trash2, 
  Edit2, 
  Eye,
  Save,
  FolderOpen,
  Brain,
  FileText,
  Settings
} from 'lucide-react';

// Type definitions
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokens?: number;
  model?: string;
  attachments?: Attachment[];
  outputFiles?: OutputFile[];
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
}

interface OutputFile {
  id: string;
  name: string;
  type: string;
  content: string;
  downloadUrl?: string;
}

interface ChatSession {
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

interface TokenUsage {
  used: number;
  limit: number;
  model: string;
}

interface LLMModel {
  id: string;
  model_name: string;
  display_name: string;
  provider: string;
}

interface Agent {
  id: string;
  name: string;
  type: string;
  description?: string;
}

interface Workflow {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

interface KnowledgeDocument {
  id: string;
  name: string;
  content?: string;
  file_type?: string;
}

export function EnhancedLLMPlayground() {
  // State Management
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<string | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({ used: 0, limit: 100000, model: 'gpt-3.5-turbo' });
  const [showSettings, setShowSettings] = useState(false);
  const [shareMode, setShareMode] = useState<'view' | 'edit'>('view');
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Model settings
  const [settings, setSettings] = useState({
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000,
    streamOutput: true,
    agent: ''
  });

  // Available resources
  const [models, setModels] = useState<LLMModel[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeDocument[]>([]);

  // Load initial data
  useEffect(() => {
    loadSessions();
    loadModels();
    loadAgents();
    loadWorkflows();
    loadKnowledgeBases();
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSessions = async () => {
    try {
      const response = await chatApi.sessions.list();
      if (response && response.success && response.sessions) {
        setSessions(response.sessions);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const loadModels = async () => {
    try {
      const response = await llmApi.models();
      if (response && response.success && response.models) {
        setModels(response.models);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const loadAgents = async () => {
    try {
      const response = await agentsApi.list();
      if (response && response.success && response.agents) {
        setAgents(response.agents);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const loadWorkflows = async () => {
    try {
      const response = await workflowsApi.list();
      if (response && response.success && response.workflows) {
        setWorkflows(response.workflows);
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  };

  const loadKnowledgeBases = async () => {
    try {
      const response = await knowledgeApi.documents.list();
      if (response && response.success && response.documents) {
        setKnowledgeBases(response.documents);
      }
    } catch (error) {
      console.error('Failed to load knowledge bases:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const response = await chatApi.sessions.create({
        title: `Chat ${new Date().toLocaleString()}`,
      });
      
      if (response && response.success && response.session) {
        await loadSessions();
        selectSession(response.session);
      }
    } catch (error) {
      toast.error('Failed to create session');
    }
  };

  const selectSession = async (session: ChatSession) => {
    setCurrentSession(session);
    
    try {
      const response = await chatApi.messages.list(session.id);
      if (response && response.success && response.messages) {
        const formattedMessages: Message[] = response.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          tokens: msg.tokens_used,
          model: msg.llm_model_id,
          attachments: msg.attachments,
          outputFiles: msg.output_files,
        }));
        setMessages(formattedMessages);
        
        // Calculate token usage
        const totalTokens = formattedMessages.reduce((sum, msg) => sum + (msg.tokens || 0), 0);
        setTokenUsage(prev => ({ ...prev, used: totalTokens }));
      }
    } catch (error) {
      toast.error('Failed to load messages');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !currentSession) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
      attachments: attachments.map(file => ({
        id: `attach-${Date.now()}`,
        name: file.name,
        type: file.type,
        size: file.size,
      })),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Upload attachments if any
      const uploadedFiles = await Promise.all(
        attachments.map(file => knowledgeApi.documents.upload(file))
      );

      const response = await chatApi.messages.send(
        currentSession.id,
        userMessage.content,
        settings.model,
        settings.agent || undefined
      );

      if (response && response.success && response.assistantMessage) {
        const assistantMessage: Message = {
          id: response.assistantMessage.id,
          role: 'assistant',
          content: response.assistantMessage.content,
          timestamp: new Date(response.assistantMessage.created_at),
          tokens: response.usage?.total_tokens,
          model: settings.model,
          outputFiles: response.output_files,
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        // Update token usage
        if (response.usage) {
          setTokenUsage(prev => ({
            ...prev,
            used: prev.used + (response.usage?.total_tokens || 0),
          }));
        }
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
      setAttachments([]);
    }
  };

  const handleFileAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const downloadOutput = async (file: OutputFile) => {
    try {
      if (chatApi.downloadOutput) {
        await chatApi.downloadOutput(file.id);
      } else {
        // Fallback to direct download
        const response = await fetch(file.downloadUrl || '');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  const shareChat = async () => {
    if (!currentSession) return;

    try {
      // Generate share link
      const shareLink = `${window.location.origin}/shared/chat/${currentSession.id}?mode=${shareMode}`;
      
      await navigator.clipboard.writeText(shareLink);
      toast.success('Share link copied to clipboard!');
      
      // Update session sharing status if API method exists
      if (chatApi.updateSharing) {
        await chatApi.updateSharing(currentSession.id, { is_shared: true, share_mode: shareMode });
      }
    } catch (error) {
      toast.error('Failed to share chat');
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this chat?')) return;

    try {
      await chatApi.sessions.delete(sessionId);
      await loadSessions();
      
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }
      
      toast.success('Chat deleted successfully');
    } catch (error) {
      toast.error('Failed to delete chat');
    }
  };

  const TokenDisplay = () => (
    <div className="flex items-center gap-2 text-sm">
      <Brain className="w-4 h-4" />
      <span className="font-medium">{tokenUsage.used.toLocaleString()}</span>
      <span className="text-gray-500">/ {tokenUsage.limit.toLocaleString()} tokens</span>
      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 transition-all"
          style={{ width: `${(tokenUsage.used / tokenUsage.limit) * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - Chat Sessions */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Button onClick={createNewSession} className="w-full">
            New Chat
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                currentSession?.id === session.id ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
              onClick={() => selectSession(session)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium truncate">{session.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(session.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-1">
                  {session.is_shared && <Share2 className="w-4 h-4 text-blue-500" />}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold">
                {currentSession?.title || 'Select a chat'}
              </h2>
              <TokenDisplay />
            </div>
            
            <div className="flex items-center gap-2">
              {currentSession && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={shareChat}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  
                  <select
                    value={shareMode}
                    onChange={(e) => setShareMode(e.target.value as 'view' | 'edit')}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    <option value="view">View Only</option>
                    <option value="edit">Can Edit</option>
                  </select>
                </>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <select
                  value={settings.model}
                  onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full p-2 border rounded"
                >
                  {models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.display_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Agent</label>
                <select
                  value={settings.agent}
                  onChange={(e) => setSettings(prev => ({ ...prev, agent: e.target.value }))}
                  className="w-full p-2 border rounded"
                >
                  <option value="">None</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Workflow</label>
                <select
                  value={selectedWorkflow || ''}
                  onChange={(e) => setSelectedWorkflow(e.target.value || null)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">None</option>
                  {workflows.map(workflow => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Knowledge Base</label>
                <select
                  value={selectedKnowledgeBase || ''}
                  onChange={(e) => setSelectedKnowledgeBase(e.target.value || null)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">None</option>
                  {knowledgeBases.map(kb => (
                    <option key={kb.id} value={kb.id}>
                      {kb.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 ${
                message.role === 'user' ? 'ml-12' : 'mr-12'
              }`}
            >
              <div
                className={`p-4 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white ml-auto'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                
                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.attachments.map(attachment => (
                      <div key={attachment.id} className="flex items-center gap-2 text-sm opacity-75">
                        <Paperclip className="w-3 h-3" />
                        <span>{attachment.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Output Files */}
                {message.outputFiles && message.outputFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.outputFiles.map(file => (
                      <button
                        key={file.id}
                        onClick={() => downloadOutput(file)}
                        className="flex items-center gap-2 text-sm hover:underline"
                      >
                        <Download className="w-3 h-3" />
                        <span>{file.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${
                message.role === 'user' ? 'text-right' : ''
              }`}>
                {message.timestamp.toLocaleTimeString()}
                {message.tokens && ` • ${message.tokens} tokens`}
                {message.model && ` • ${message.model}`}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="mr-12">
              <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-sm"
                >
                  <FileText className="w-3 h-3" />
                  <span>{file.name}</span>
                  <button
                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                    className="hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileAttachment}
              multiple
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            <textarea
              className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
              className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}