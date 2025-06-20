'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { agentsApi } from '@/lib/api';

interface Agent {
  id: string;
  name: string;
  agent_type: string;
  description?: string;
  model_id: string;
  temperature: number;
  max_tokens: number;
  created_at: string;
}

interface AgentFormData {
  name: string;
  agent_type: string;
  description: string;
  custom_prompt: string;
  model_id: string;
  temperature: number;
  max_tokens: number;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    agent_type: 'general',
    description: '',
    custom_prompt: '',
    model_id: 'gemini-pro',
    temperature: 0.7,
    max_tokens: 1000
  });

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const response = await agentsApi.list() as { success: boolean; agents: Agent[] };
      if (response?.success && response?.agents) {
        setAgents(response.agents);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await agentsApi.create(formData) as { success: boolean };
      if (response?.success) {
        setShowForm(false);
        setFormData({
          name: '',
          agent_type: 'general',
          description: '',
          custom_prompt: '',
          model_id: 'gemini-pro',
          temperature: 0.7,
          max_tokens: 1000
        });
        await loadAgents();
      }
    } catch (error) {
      console.error('Failed to create agent:', error);
      alert('Failed to create agent. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      const response = await agentsApi.delete(id) as { success: boolean };
      if (response?.success) {
        await loadAgents();
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Agents</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Create and manage your AI agents
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Create Agent'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6 bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle>Create New Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Agent Name
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Email Assistant"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Agent Type
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                    value={formData.agent_type}
                    onChange={(e) => setFormData({ ...formData, agent_type: e.target.value })}
                  >
                    <option value="general">General</option>
                    <option value="email">Email</option>
                    <option value="data">Data Analysis</option>
                    <option value="content">Content Creation</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <Input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Helps manage and respond to emails"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Custom Prompt
                  </label>
                  <textarea
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                    rows={3}
                    value={formData.custom_prompt}
                    onChange={(e) => setFormData({ ...formData, custom_prompt: e.target.value })}
                    placeholder="You are a helpful email assistant. Be professional and concise..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Model
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                    value={formData.model_id}
                    onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
                  >
                    <option value="gemini-pro">Gemini Pro</option>
                    <option value="gemini-pro-vision">Gemini Pro Vision</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="gpt-4">GPT-4</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Temperature: {formData.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Create Agent
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(agent => (
          <Card key={agent.id} className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{agent.name}</span>
                <span className="text-sm font-normal text-gray-500">
                  {agent.agent_type}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {agent.description || 'No description'}
              </p>
              <div className="text-sm text-gray-500 dark:text-gray-500 space-y-1">
                <p>Model: {agent.model_id}</p>
                <p>Temperature: {agent.temperature}</p>
                <p>Max Tokens: {agent.max_tokens}</p>
                <p>Created: {new Date(agent.created_at).toLocaleDateString()}</p>
              </div>
              <div className="mt-4 flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(agent.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {agents.length === 0 && !showForm && (
        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No agents created yet. Create your first AI agent to get started.
            </p>
            <Button onClick={() => setShowForm(true)}>
              Create Your First Agent
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
