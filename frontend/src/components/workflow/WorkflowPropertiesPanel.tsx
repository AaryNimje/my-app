// src/components/workflow/WorkflowPropertiesPanel.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Settings, 
  Bot, 
  Brain, 
  Target, 
  Sliders,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Info
} from 'lucide-react';

interface WorkflowProperties {
  // Agent Configuration
  agent: {
    name: string;
    description: string;
    type: 'assistant' | 'analyzer' | 'generator' | 'processor' | 'custom';
    personality?: string;
    instructions?: string;
  };
  
  // LLM Configuration
  llm: {
    provider: 'openai' | 'anthropic' | 'google' | 'groq' | 'ollama';
    model: string;
    temperature: number;
    maxTokens: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    systemPrompt: string;
  };
  
  // Output Configuration
  output: {
    destination: 'ui-playground' | 'llm-playground' | 'file-download' | 'multiple';
    defaultFormat: 'text' | 'json' | 'markdown' | 'csv' | 'xlsx' | 'pdf';
    autoSave?: boolean;
    fileName?: string;
  };
  
  // Workflow Metadata
  metadata: {
    name: string;
    description: string;
    category: string;
    tags: string[];
    version: string;
    isPublic: boolean;
  };
}

interface WorkflowPropertiesPanelProps {
  isOpen: boolean;
  onCloseAction: () => void;
  properties: Partial<WorkflowProperties>;
  onSaveAction: (properties: WorkflowProperties) => void;
  onPropertiesChangeAction?: (properties: Partial<WorkflowProperties>) => void;
}

const defaultProperties: WorkflowProperties = {
  agent: {
    name: 'Academic Assistant',
    description: 'An intelligent agent for academic tasks',
    type: 'assistant',
    personality: 'helpful, accurate, and educational',
    instructions: 'You are an academic assistant focused on helping with educational tasks. Be precise, informative, and supportive.'
  },
  llm: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1.0,
    frequencyPenalty: 0,
    presencePenalty: 0,
    systemPrompt: 'You are a helpful academic assistant. Provide accurate, well-structured responses.'
  },
  output: {
    destination: 'ui-playground',
    defaultFormat: 'text',
    autoSave: false,
    fileName: 'workflow_output'
  },
  metadata: {
    name: 'New Workflow',
    description: '',
    category: 'general',
    tags: [],
    version: '1.0.0',
    isPublic: false
  }
};

export function WorkflowPropertiesPanel({
  isOpen,
  onCloseAction,
  properties: initialProperties,
  onSaveAction,
  onPropertiesChangeAction
}: WorkflowPropertiesPanelProps) {
  const [properties, setProperties] = useState<WorkflowProperties>({
    ...defaultProperties,
    ...initialProperties
  });
  const [activeSection, setActiveSection] = useState<string>('metadata');
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['metadata', 'agent', 'llm', 'output'])
  );

  // Available models for each provider
  const modelOptions = {
    openai: [
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
    ],
    anthropic: [
      { value: 'claude-3-opus', label: 'Claude 3 Opus' },
      { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
      { value: 'claude-3-haiku', label: 'Claude 3 Haiku' }
    ],
    google: [
      { value: 'gemini-pro', label: 'Gemini Pro' },
      { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' }
    ],
    groq: [
      { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
      { value: 'llama2-70b-4096', label: 'LLaMA 2 70B' }
    ],
    ollama: [
      { value: 'llama2', label: 'LLaMA 2' },
      { value: 'codellama', label: 'Code Llama' },
      { value: 'mistral', label: 'Mistral' }
    ]
  };

  // Agent types
  const agentTypes = [
    { value: 'assistant', label: 'Assistant', description: 'General-purpose helpful agent' },
    { value: 'analyzer', label: 'Analyzer', description: 'Specializes in data analysis and insights' },
    { value: 'generator', label: 'Generator', description: 'Creates content and documents' },
    { value: 'processor', label: 'Processor', description: 'Processes and transforms data' },
    { value: 'custom', label: 'Custom', description: 'Custom-configured agent' }
  ];

  // Categories
  const categories = [
    'general', 'education', 'research', 'analysis', 'content-creation', 
    'data-processing', 'assessment', 'administrative'
  ];

  useEffect(() => {
    if (onPropertiesChangeAction) {
      onPropertiesChangeAction(properties);
    }
    setHasChanges(true);
  }, [properties, onPropertiesChangeAction]);

  const updateProperty = (section: keyof WorkflowProperties, field: string, value: any) => {
    setProperties(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const handleSave = () => {
    onSaveAction(properties);
    setHasChanges(false);
  };

  const addTag = (tag: string) => {
    if (tag && !properties.metadata.tags.includes(tag)) {
      updateProperty('metadata', 'tags', [...properties.metadata.tags, tag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    updateProperty('metadata', 'tags', properties.metadata.tags.filter(tag => tag !== tagToRemove));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-blue-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Workflow Properties
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure your workflow's agent, LLM, and output settings
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
              >
                <Save size={16} />
                <span>Save</span>
              </button>
            )}
            <button
              onClick={onCloseAction}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Sidebar Navigation */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
            <nav className="space-y-2">
              {[
                { id: 'metadata', label: 'Workflow Info', icon: Info },
                { id: 'agent', label: 'Agent Config', icon: Bot },
                { id: 'llm', label: 'LLM Settings', icon: Brain },
                { id: 'output', label: 'Output Config', icon: Target }
              ].map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <section.icon size={18} />
                  <span className="font-medium">{section.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Workflow Metadata Section */}
            {activeSection === 'metadata' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Workflow Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Workflow Name *
                      </label>
                      <input
                        type="text"
                        value={properties.metadata.name}
                        onChange={(e) => updateProperty('metadata', 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter workflow name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Category
                      </label>
                      <select
                        value={properties.metadata.category}
                        onChange={(e) => updateProperty('metadata', 'category', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {categories.map(category => (
                          <option key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={properties.metadata.description}
                        onChange={(e) => updateProperty('metadata', 'description', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Describe what this workflow does"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Version
                      </label>
                      <input
                        type="text"
                        value={properties.metadata.version}
                        onChange={(e) => updateProperty('metadata', 'version', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="1.0.0"
                      />
                    </div>

                    <div className="flex items-center">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={properties.metadata.isPublic}
                          onChange={(e) => updateProperty('metadata', 'isPublic', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Make workflow public</span>
                      </label>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {properties.metadata.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Add a tag and press Enter"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addTag(e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Agent Configuration Section */}
            {activeSection === 'agent' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Agent Configuration
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Agent Name *
                        </label>
                        <input
                          type="text"
                          value={properties.agent.name}
                          onChange={(e) => updateProperty('agent', 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter agent name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Agent Type
                        </label>
                        <select
                          value={properties.agent.type}
                          onChange={(e) => updateProperty('agent', 'type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {agentTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          {agentTypes.find(t => t.value === properties.agent.type)?.description}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={properties.agent.description}
                        onChange={(e) => updateProperty('agent', 'description', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Describe the agent's purpose and capabilities"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Personality
                      </label>
                      <input
                        type="text"
                        value={properties.agent.personality || ''}
                        onChange={(e) => updateProperty('agent', 'personality', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., helpful, professional, creative"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Instructions
                      </label>
                      <textarea
                        value={properties.agent.instructions || ''}
                        onChange={(e) => updateProperty('agent', 'instructions', e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Specific instructions for how the agent should behave and respond"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* LLM Configuration Section */}
            {activeSection === 'llm' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    LLM Settings
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Provider
                        </label>
                        <select
                          value={properties.llm.provider}
                          onChange={(e) => {
                            const provider = e.target.value as keyof typeof modelOptions;
                            updateProperty('llm', 'provider', provider);
                            // Reset model to first available for new provider
                            const firstModel = modelOptions[provider]?.[0]?.value;
                            if (firstModel) {
                              updateProperty('llm', 'model', firstModel);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="openai">OpenAI</option>
                          <option value="anthropic">Anthropic</option>
                          <option value="google">Google</option>
                          <option value="groq">Groq (Free)</option>
                          <option value="ollama">Ollama (Local)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Model
                        </label>
                        <select
                          value={properties.llm.model}
                          onChange={(e) => updateProperty('llm', 'model', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {modelOptions[properties.llm.provider]?.map(model => (
                            <option key={model.value} value={model.value}>
                              {model.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        System Prompt
                      </label>
                      <textarea
                        value={properties.llm.systemPrompt}
                        onChange={(e) => updateProperty('llm', 'systemPrompt', e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="System instructions for the LLM"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Temperature: {properties.llm.temperature}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={properties.llm.temperature}
                          onChange={(e) => updateProperty('llm', 'temperature', parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Focused</span>
                          <span>Creative</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Max Tokens
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="8192"
                          value={properties.llm.maxTokens}
                          onChange={(e) => updateProperty('llm', 'maxTokens', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Advanced Settings */}
                    <div>
                      <button
                        onClick={() => toggleSection('advanced-llm')}
                        className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                      >
                        {expandedSections.has('advanced-llm') ? 
                          <ChevronDown size={16} /> : <ChevronRight size={16} />
                        }
                        <span>Advanced Settings</span>
                      </button>

                      {expandedSections.has('advanced-llm') && (
                        <div className="mt-3 pl-6 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Top P: {properties.llm.topP || 1.0}
                              </label>
                              <input
                                type="range"
                                min="0.1"
                                max="1"
                                step="0.1"
                                value={properties.llm.topP || 1.0}
                                onChange={(e) => updateProperty('llm', 'topP', parseFloat(e.target.value))}
                                className="w-full"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Frequency Penalty: {properties.llm.frequencyPenalty || 0}
                              </label>
                              <input
                                type="range"
                                min="-2"
                                max="2"
                                step="0.1"
                                value={properties.llm.frequencyPenalty || 0}
                                onChange={(e) => updateProperty('llm', 'frequencyPenalty', parseFloat(e.target.value))}
                                className="w-full"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Presence Penalty: {properties.llm.presencePenalty || 0}
                              </label>
                              <input
                                type="range"
                                min="-2"
                                max="2"
                                step="0.1"
                                value={properties.llm.presencePenalty || 0}
                                onChange={(e) => updateProperty('llm', 'presencePenalty', parseFloat(e.target.value))}
                                className="w-full"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Output Configuration Section */}
            {activeSection === 'output' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Output Configuration
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Output Destination
                        </label>
                        <select
                          value={properties.output.destination}
                          onChange={(e) => updateProperty('output', 'destination', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="ui-playground">UI Playground</option>
                          <option value="llm-playground">LLM Playground</option>
                          <option value="file-download">File Download</option>
                          <option value="multiple">Multiple Destinations</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Default Format
                        </label>
                        <select
                          value={properties.output.defaultFormat}
                          onChange={(e) => updateProperty('output', 'defaultFormat', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="text">Plain Text</option>
                          <option value="markdown">Markdown</option>
                          <option value="json">JSON</option>
                          <option value="csv">CSV</option>
                          <option value="xlsx">Excel</option>
                          <option value="pdf">PDF</option>
                        </select>
                      </div>
                    </div>

                    {properties.output.destination === 'file-download' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Default File Name
                        </label>
                        <input
                          type="text"
                          value={properties.output.fileName || ''}
                          onChange={(e) => updateProperty('output', 'fileName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="output_file"
                        />
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={properties.output.autoSave || false}
                        onChange={(e) => updateProperty('output', 'autoSave', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label className="text-sm text-gray-700 dark:text-gray-300">
                        Auto-save output after workflow execution
                      </label>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                          <p className="font-medium mb-1">Output Preview</p>
                          <p>
                            Your workflow will output to <strong>{properties.output.destination.replace('-', ' ')}</strong> 
                            {' '}in <strong>{properties.output.defaultFormat.toUpperCase()}</strong> format.
                            {properties.output.autoSave && ' Files will be automatically saved.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {hasChanges && (
              <div className="flex items-center space-x-1 text-orange-600">
                <AlertCircle size={14} />
                <span>You have unsaved changes</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onCloseAction}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <Save size={16} />
              <span>Save Properties</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}