// src/components/llm-playground/LLMPlayground.tsx
// Updated with better dark mode text visibility

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// Message type for chat
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// Model settings
interface ModelSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  streamOutput: boolean;
}

export function LLMPlayground() {
  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'system-1',
      role: 'system',
      content: 'You are a helpful assistant for academic purposes.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Model settings
  const [settings, setSettings] = useState<ModelSettings>({
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000,
    streamOutput: true
  });

  // Show settings panel
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Chat names for multi-chat
  const [chatName, setChatName] = useState<string>('New Chat');
  
  // Handle sending a message
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `This is a simulated response to: "${input}"`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setLoading(false);
    }, 1000);
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
            onClick={() => {
              setChatName('New Chat');
              setMessages([{
                id: 'system-1',
                role: 'system',
                content: 'You are a helpful assistant for academic purposes.',
                timestamp: new Date()
              }]);
            }}
          >
            <span className="mr-2">➕</span> New Chat
          </Button>
        </div>
        
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-2">
          <Card className="mb-2 cursor-pointer bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700">
            <CardContent className="p-3">
              <div className="font-medium text-sm truncate">{chatName}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Just now</div>
            </CardContent>
          </Card>
          
          {/* Example previous chats */}
          <Card className="mb-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 opacity-50">
            <CardContent className="p-3">
              <div className="font-medium text-sm truncate">Student Data Analysis</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">2 days ago</div>
            </CardContent>
          </Card>
          
          <Card className="mb-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 opacity-50">
            <CardContent className="p-3">
              <div className="font-medium text-sm truncate">Course Planning</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">1 week ago</div>
            </CardContent>
          </Card>
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
                  Model
                </label>
                <select
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50"
                  value={settings.model}
                  onChange={(e) => setSettings({...settings, model: e.target.value})}
                >
                  <option value="gpt-4">GPT-4</option>
                  <option value="claude-3-opus">Claude 3 Opus</option>
                  <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                  <option value="gemini-pro">Gemini Pro</option>
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
            >
              📤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}