"use client";
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  Clock, 
  User, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  XCircle,
  FileText,
  Workflow,
  MessageSquare,
  Database,
  Settings,
  Eye,
  Trash2,
  RefreshCw,
  BarChart3,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  category: 'workflow' | 'chat' | 'system' | 'auth' | 'api' | 'file';
  action: string;
  description: string;
  user?: string;
  metadata?: Record<string, any>;
  duration?: number;
  tokens?: number;
  cost?: number;
}

interface ChatHistory {
  id: string;
  name: string;
  model: string;
  workflow?: string;
  messageCount: number;
  tokens: number;
  cost: number;
  createdAt: Date;
  lastMessageAt: Date;
  status: 'active' | 'archived' | 'deleted';
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  user: string;
  nodeExecutions: Array<{
    nodeId: string;
    nodeName: string;
    status: 'completed' | 'failed' | 'skipped';
    duration: number;
    tokens?: number;
    error?: string;
  }>;
  totalTokens: number;
  totalCost: number;
}

interface SystemMetrics {
  period: '24h' | '7d' | '30d';
  totalWorkflows: number;
  totalChats: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  errorRate: number;
  activeUsers: number;
}

const LOG_LEVELS = {
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-900' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-900' },
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-900' },
  success: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900' }
};

const CATEGORIES = {
  workflow: { icon: Workflow, label: 'Workflows' },
  chat: { icon: MessageSquare, label: 'Chats' },
  system: { icon: Settings, label: 'System' },
  auth: { icon: User, label: 'Authentication' },
  api: { icon: Database, label: 'API' },
  file: { icon: FileText, label: 'Files' }
};

// Mock data generators (same as before)
const generateMockLogs = (): LogEntry[] => {
  const logs: LogEntry[] = [];
  const now = new Date();
  
  for (let i = 0; i < 100; i++) {
    const timestamp = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    const categories = Object.keys(CATEGORIES) as Array<keyof typeof CATEGORIES>;
    const levels = Object.keys(LOG_LEVELS) as Array<keyof typeof LOG_LEVELS>;
    const category = categories[Math.floor(Math.random() * categories.length)];
    const level = levels[Math.floor(Math.random() * levels.length)];
    
    logs.push({
      id: `log-${i}`,
      timestamp,
      level,
      category,
      action: getActionForCategory(category),
      description: getDescriptionForCategory(category, level),
      user: Math.random() > 0.3 ? ['Dr. Smith', 'Prof. Johnson', 'Admin', 'Student123'][Math.floor(Math.random() * 4)] : undefined,
      duration: Math.random() > 0.5 ? Math.floor(Math.random() * 5000) + 100 : undefined,
      tokens: category === 'chat' || category === 'workflow' ? Math.floor(Math.random() * 1000) + 50 : undefined,
      cost: category === 'chat' || category === 'workflow' ? Math.random() * 0.5 : undefined
    });
  }
  
  return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

const getActionForCategory = (category: string): string => {
  const actions = {
    workflow: ['Workflow Created', 'Workflow Executed', 'Workflow Failed', 'Workflow Deleted'],
    chat: ['Chat Started', 'Message Sent', 'Model Changed', 'Chat Exported'],
    system: ['System Startup', 'Database Backup', 'Cache Clear', 'Service Restart'],
    auth: ['User Login', 'User Logout', 'Password Changed', 'API Key Generated'],
    api: ['API Call', 'Rate Limit Hit', 'Authentication Failed', 'Webhook Received'],
    file: ['File Uploaded', 'File Processed', 'File Deleted', 'File Downloaded']
  };
  
  const categoryActions = actions[category as keyof typeof actions] || ['Unknown Action'];
  return categoryActions[Math.floor(Math.random() * categoryActions.length)];
};

const getDescriptionForCategory = (category: string, level: string): string => {
  const descriptions = {
    workflow: {
      info: 'Document analysis workflow completed successfully',
      warning: 'Workflow execution took longer than expected',
      error: 'Workflow failed due to missing API key',
      success: 'Student grade analysis workflow generated 25 reports'
    },
    chat: {
      info: 'New chat session started with GPT-4',
      warning: 'Approaching token limit for current session',
      error: 'Chat message failed to send due to API error',
      success: 'Research query completed with comprehensive results'
    },
    system: {
      info: 'Daily backup completed successfully',
      warning: 'High memory usage detected',
      error: 'Database connection failed',
      success: 'System update installed successfully'
    }
  };
  
  return descriptions[category as keyof typeof descriptions]?.[level as keyof typeof descriptions['workflow']] || 
         'System activity logged';
};

const generateMockChatHistory = (): ChatHistory[] => {
  const chats: ChatHistory[] = [];
  const now = new Date();
  
  for (let i = 0; i < 50; i++) {
    const createdAt = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const lastMessageAt = new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000);
    
    chats.push({
      id: `chat-${i}`,
      name: `Research Session ${i + 1}`,
      model: ['gpt-4-turbo', 'claude-3-opus', 'gemini-pro'][Math.floor(Math.random() * 3)],
      workflow: Math.random() > 0.5 ? ['document-analysis', 'data-processing', 'research-assistant'][Math.floor(Math.random() * 3)] : undefined,
      messageCount: Math.floor(Math.random() * 50) + 5,
      tokens: Math.floor(Math.random() * 10000) + 1000,
      cost: Math.random() * 5 + 0.5,
      createdAt,
      lastMessageAt,
      status: ['active', 'archived'][Math.floor(Math.random() * 2)] as 'active' | 'archived'
    });
  }
  
  return chats.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
};

const generateMockWorkflowExecutions = (): WorkflowExecution[] => {
  const executions: WorkflowExecution[] = [];
  const now = new Date();
  
  for (let i = 0; i < 30; i++) {
    const startTime = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    const duration = Math.floor(Math.random() * 300000) + 5000; // 5s to 5m
    const endTime = new Date(startTime.getTime() + duration);
    const status = ['completed', 'failed', 'running'][Math.floor(Math.random() * 3)] as 'completed' | 'failed' | 'running';
    
    executions.push({
      id: `exec-${i}`,
      workflowId: `workflow-${Math.floor(Math.random() * 10)}`,
      workflowName: ['Document Analysis', 'Student Grade Processing', 'Research Assistant', 'Resume Screening'][Math.floor(Math.random() * 4)],
      status,
      startTime,
      endTime: status !== 'running' ? endTime : undefined,
      duration: status !== 'running' ? duration : undefined,
      user: ['Dr. Smith', 'Prof. Johnson', 'Admin'][Math.floor(Math.random() * 3)],
      nodeExecutions: Array.from({ length: Math.floor(Math.random() * 5) + 2 }, (_, j) => ({
        nodeId: `node-${j}`,
        nodeName: ['File Input', 'LLM Processing', 'Data Analysis', 'Output'][j] || `Node ${j}`,
        status: status === 'failed' && j === 2 ? 'failed' : 'completed' as 'completed' | 'failed',
        duration: Math.floor(Math.random() * 30000) + 1000,
        tokens: Math.random() > 0.5 ? Math.floor(Math.random() * 1000) + 100 : undefined,
        error: status === 'failed' && j === 2 ? 'API rate limit exceeded' : undefined
      })),
      totalTokens: Math.floor(Math.random() * 5000) + 500,
      totalCost: Math.random() * 2 + 0.1
    });
  }
  
  return executions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
};

export default function LogsAndHistory() {
  const [activeTab, setActiveTab] = useState<'logs' | 'chats' | 'workflows' | 'analytics'>('logs');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [workflowExecutions, setWorkflowExecutions] = useState<WorkflowExecution[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'all'>('7days');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecution | null>(null);

  // Initialize data
  useEffect(() => {
    setLogs(generateMockLogs());
    setChatHistory(generateMockChatHistory());
    setWorkflowExecutions(generateMockWorkflowExecutions());
  }, []);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLevel = selectedLevel === 'all' || log.level === selectedLevel;
    const matchesCategory = selectedCategory === 'all' || log.category === selectedCategory;
    
    const now = new Date();
    let matchesDate = true;
    
    if (dateRange === 'today') {
      matchesDate = log.timestamp.toDateString() === now.toDateString();
    } else if (dateRange === '7days') {
      matchesDate = (now.getTime() - log.timestamp.getTime()) <= 7 * 24 * 60 * 60 * 1000;
    } else if (dateRange === '30days') {
      matchesDate = (now.getTime() - log.timestamp.getTime()) <= 30 * 24 * 60 * 60 * 1000;
    }
    
    return matchesSearch && matchesLevel && matchesCategory && matchesDate;
  });

  // Analytics Component
  const Analytics = () => {
    const metrics: SystemMetrics = {
      period: '7d',
      totalWorkflows: workflowExecutions.length,
      totalChats: chatHistory.length,
      totalTokens: chatHistory.reduce((sum, chat) => sum + chat.tokens, 0),
      totalCost: chatHistory.reduce((sum, chat) => sum + chat.cost, 0),
      averageResponseTime: 2.3,
      errorRate: (logs.filter(l => l.level === 'error').length / logs.length) * 100,
      activeUsers: 12
    };

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Workflows</p>
                <p className="text-2xl font-bold text-white">{metrics.totalWorkflows}</p>
                <p className="text-xs text-green-400 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +15% from last week
                </p>
              </div>
              <Workflow className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Active Chats</p>
                <p className="text-2xl font-bold text-white">{metrics.totalChats}</p>
                <p className="text-xs text-green-400 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +8% from last week
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Tokens</p>
                <p className="text-2xl font-bold text-white">{(metrics.totalTokens / 1000000).toFixed(1)}M</p>
                <p className="text-xs text-red-400 flex items-center mt-1">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  -3% from last week
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Cost</p>
                <p className="text-2xl font-bold text-white">${metrics.totalCost.toFixed(2)}</p>
                <p className="text-xs text-yellow-400 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +12% from last week
                </p>
              </div>
              <Activity className="w-8 h-8 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Usage Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">System Performance</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Average Response Time</span>
                <span className="text-sm font-medium text-white">{metrics.averageResponseTime}s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Error Rate</span>
                <span className="text-sm font-medium text-white">{metrics.errorRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Active Users</span>
                <span className="text-sm font-medium text-white">{metrics.activeUsers}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Top Models by Usage</h3>
            <div className="space-y-3">
              {[
                { model: 'GPT-4 Turbo', usage: 45, cost: '$124.50' },
                { model: 'Claude 3 Opus', usage: 30, cost: '$89.20' },
                { model: 'Gemini Pro', usage: 25, cost: '$34.80' }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-white">{item.model}</span>
                      <span className="text-gray-400">{item.cost}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${item.usage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Logs & History</h1>
            <p className="text-gray-400">Monitor system activity and chat history</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-md flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-md flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mt-6">
          {[
            { id: 'logs', label: 'System Logs', icon: Activity },
            { id: 'chats', label: 'Chat History', icon: MessageSquare },
            { id: 'workflows', label: 'Workflow Executions', icon: Workflow },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                  activeTab === tab.id 
                    ? 'bg-blue-900 text-blue-100' 
                    : 'text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'analytics' ? (
          <div className="p-6">
            <Analytics />
          </div>
        ) : (
          <div className="flex h-full">
            {/* Main Content */}
            <div className="flex-1 flex flex-col">
              {/* Filters */}
              {(activeTab === 'logs') && (
                <div className="bg-gray-800 border-b border-gray-700 p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Search logs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                      />
                    </div>
                    
                    <select
                      value={selectedLevel}
                      onChange={(e) => setSelectedLevel(e.target.value)}
                      className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    >
                      <option value="all">All Levels</option>
                      {Object.keys(LOG_LEVELS).map(level => (
                        <option key={level} value={level}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </option>
                      ))}
                    </select>
                    
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    >
                      <option value="all">All Categories</option>
                      {Object.entries(CATEGORIES).map(([key, category]) => (
                        <option key={key} value={key}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                    
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value as any)}
                      className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    >
                      <option value="today">Today</option>
                      <option value="7days">Last 7 Days</option>
                      <option value="30days">Last 30 Days</option>
                      <option value="all">All Time</option>
                    </select>
                  </div>
                </div>
              )}

              {/* List */}
              <div className="flex-1 overflow-y-auto bg-gray-900">
                {activeTab === 'logs' && (
                  <div className="divide-y divide-gray-800">
                    {filteredLogs.map(log => {
                      const LevelIcon = LOG_LEVELS[log.level].icon;
                      const CategoryIcon = CATEGORIES[log.category].icon;
                      
                      return (
                        <div
                          key={log.id}
                          className="p-4 hover:bg-gray-800 cursor-pointer"
                          onClick={() => setSelectedLog(log)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${LOG_LEVELS[log.level].bg}`}>
                              <LevelIcon className={`w-4 h-4 ${LOG_LEVELS[log.level].color}`} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <CategoryIcon className="w-4 h-4 text-gray-500" />
                                <span className="font-medium text-white">{log.action}</span>
                                {log.user && (
                                  <span className="text-sm text-gray-400">by {log.user}</span>
                                )}
                              </div>
                              
                              <p className="text-sm text-gray-300 line-clamp-2">{log.description}</p>
                              
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {log.timestamp.toLocaleString()}
                                </span>
                                {log.duration && (
                                  <span>{log.duration}ms</span>
                                )}
                                {log.tokens && (
                                  <span>{log.tokens} tokens</span>
                                )}
                                {log.cost && (
                                  <span>${log.cost.toFixed(3)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeTab === 'chats' && (
                  <div className="divide-y divide-gray-800">
                    {chatHistory.map(chat => (
                      <div key={chat.id} className="p-4 hover:bg-gray-800">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <MessageSquare className="w-4 h-4 text-blue-400" />
                              <span className="font-medium text-white">{chat.name}</span>
                              <span className={`px-2 py-1 text-xs rounded ${
                                chat.status === 'active' ? 'bg-green-900 text-green-400' : 'bg-gray-700 text-gray-400'
                              }`}>
                                {chat.status}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-400 mb-2">
                              {chat.model} • {chat.messageCount} messages • {chat.tokens} tokens • ${chat.cost.toFixed(2)}
                            </div>
                            
                            {chat.workflow && (
                              <div className="text-sm text-blue-400 mb-2">
                                🔗 Workflow: {chat.workflow}
                              </div>
                            )}
                            
                            <div className="text-xs text-gray-500">
                              Created: {chat.createdAt.toLocaleDateString()} • 
                              Last message: {chat.lastMessageAt.toLocaleString()}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button className="p-2 text-gray-500 hover:text-blue-400">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-gray-500 hover:text-green-400">
                              <Download className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-gray-500 hover:text-red-400">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'workflows' && (
                  <div className="divide-y divide-gray-800">
                    {workflowExecutions.map(execution => (
                      <div
                        key={execution.id}
                        className="p-4 hover:bg-gray-800 cursor-pointer"
                        onClick={() => setSelectedExecution(execution)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Workflow className="w-4 h-4 text-purple-400" />
                              <span className="font-medium text-white">{execution.workflowName}</span>
                              <span className={`px-2 py-1 text-xs rounded ${
                                execution.status === 'completed' ? 'bg-green-900 text-green-400' :
                                execution.status === 'failed' ? 'bg-red-900 text-red-400' :
                                execution.status === 'running' ? 'bg-blue-900 text-blue-400' :
                                'bg-gray-700 text-gray-400'
                              }`}>
                                {execution.status}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-400 mb-2">
                              {execution.user} • {execution.nodeExecutions.length} nodes • 
                              {execution.totalTokens} tokens • ${execution.totalCost.toFixed(2)}
                            </div>
                            
                            <div className="text-xs text-gray-500">
                              Started: {execution.startTime.toLocaleString()}
                              {execution.duration && ` • Duration: ${(execution.duration / 1000).toFixed(1)}s`}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            {execution.status === 'running' && (
                              <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Detail Panel */}
            {(selectedLog || selectedExecution) && (
              <div className="w-96 bg-gray-800 border-l border-gray-700 p-6 overflow-y-auto">
                {selectedLog && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Log Details</h3>
                      <button
                        onClick={() => setSelectedLog(null)}
                        className="text-gray-400 hover:text-gray-200"
                      >
                        ×
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400">Level</label>
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-md ${LOG_LEVELS[selectedLog.level].bg}`}>
                          {React.createElement(LOG_LEVELS[selectedLog.level].icon, { 
                            className: `w-4 h-4 ${LOG_LEVELS[selectedLog.level].color}` 
                          })}
                          <span className={`${LOG_LEVELS[selectedLog.level].color}`}>
                            {selectedLog.level.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-400">Category</label>
                        <p className="text-sm text-white">{CATEGORIES[selectedLog.category].label}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-400">Action</label>
                        <p className="text-sm text-white">{selectedLog.action}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-400">Description</label>
                        <p className="text-sm text-white">{selectedLog.description}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-400">Timestamp</label>
                        <p className="text-sm text-white">{selectedLog.timestamp.toLocaleString()}</p>
                      </div>
                      
                      {selectedLog.user && (
                        <div>
                          <label className="block text-sm font-medium text-gray-400">User</label>
                          <p className="text-sm text-white">{selectedLog.user}</p>
                        </div>
                      )}
                      
                      {selectedLog.duration && (
                        <div>
                          <label className="block text-sm font-medium text-gray-400">Duration</label>
                          <p className="text-sm text-white">{selectedLog.duration}ms</p>
                        </div>
                      )}
                      
                      {selectedLog.tokens && (
                        <div>
                          <label className="block text-sm font-medium text-gray-400">Tokens</label>
                          <p className="text-sm text-white">{selectedLog.tokens}</p>
                        </div>
                      )}
                      
                      {selectedLog.cost && (
                        <div>
                          <label className="block text-sm font-medium text-gray-400">Cost</label>
                          <p className="text-sm text-white">${selectedLog.cost.toFixed(4)}</p>
                        </div>
                      )}
                      
                      {selectedLog.metadata && (
                        <div>
                          <label className="block text-sm font-medium text-gray-400">Metadata</label>
                          <pre className="text-xs text-white bg-gray-900 p-2 rounded overflow-x-auto">
                            {JSON.stringify(selectedLog.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedExecution && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Execution Details</h3>
                      <button
                        onClick={() => setSelectedExecution(null)}
                        className="text-gray-400 hover:text-gray-200"
                      >
                        ×
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400">Workflow</label>
                        <p className="text-sm text-white">{selectedExecution.workflowName}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-400">Status</label>
                        <span className={`inline-block px-2 py-1 text-xs rounded ${
                          selectedExecution.status === 'completed' ? 'bg-green-900 text-green-400' :
                          selectedExecution.status === 'failed' ? 'bg-red-900 text-red-400' :
                          selectedExecution.status === 'running' ? 'bg-blue-900 text-blue-400' :
                          'bg-gray-700 text-gray-400'
                        }`}>
                          {selectedExecution.status}
                        </span>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-400">User</label>
                        <p className="text-sm text-white">{selectedExecution.user}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-400">Duration</label>
                        <p className="text-sm text-white">
                          {selectedExecution.duration ? `${(selectedExecution.duration / 1000).toFixed(1)}s` : 'Running...'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-400">Total Tokens</label>
                        <p className="text-sm text-white">{selectedExecution.totalTokens}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-400">Total Cost</label>
                        <p className="text-sm text-white">${selectedExecution.totalCost.toFixed(4)}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Node Executions</label>
                        <div className="space-y-2">
                          {selectedExecution.nodeExecutions.map((node, index) => (
                            <div key={index} className="p-3 bg-gray-900 rounded">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-white">{node.nodeName}</span>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  node.status === 'completed' ? 'bg-green-900 text-green-400' :
                                  node.status === 'failed' ? 'bg-red-900 text-red-400' :
                                  'bg-gray-700 text-gray-400'
                                }`}>
                                  {node.status}
                                </span>
                              </div>
                              <div className="text-xs text-gray-400">
                                Duration: {(node.duration / 1000).toFixed(1)}s
                                {node.tokens && ` • Tokens: ${node.tokens}`}
                              </div>
                              {node.error && (
                                <div className="text-xs text-red-400 mt-1">{node.error}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}