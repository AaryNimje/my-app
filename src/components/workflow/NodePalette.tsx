'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';

// Node groups for organizing the palette
export const NODE_GROUPS = [
  { id: 'input', name: 'Input', icon: '📥' },
  { id: 'ai', name: 'AI', icon: '🧠' },
  { id: 'memory', name: 'Memory', icon: '💾' },
  { id: 'integrations', name: 'Integrations', icon: '🔌' },
  { id: 'logic', name: 'Logic', icon: '⚙️' },
  { id: 'output', name: 'Output', icon: '📤' }
];

// Node type definitions
export const NODE_TYPES: Record<string, any> = {
  // AI Nodes
  'llm': {
    type: 'llm',
    name: 'LLM',
    group: 'ai',
    icon: '🧠',
    color: '#8b5cf6',
    description: 'Process text with LLM',
    inputs: [
      { id: 'prompt', type: 'target', position: 'left', label: 'Prompt' }
    ],
    outputs: [
      { id: 'response', type: 'source', position: 'right', label: 'Response' }
    ],
    configOptions: {
      model: {
        type: 'select',
        label: 'Model',
        options: [
          { label: 'GPT-4', value: 'gpt-4' },
          { label: 'Claude 3 Opus', value: 'claude-3-opus' },
          { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet' },
          { label: 'Gemini Pro', value: 'gemini-pro' }
        ],
        default: 'gpt-4'
      },
      temperature: {
        type: 'range',
        label: 'Temperature',
        min: 0,
        max: 2,
        step: 0.1,
        default: 0.7
      },
      maxTokens: {
        type: 'number',
        label: 'Max Tokens',
        min: 1,
        max: 8000,
        default: 1000
      },
      streamOutput: {
        type: 'boolean',
        label: 'Stream Output',
        default: true
      },
      jsonMode: {
        type: 'boolean',
        label: 'JSON Mode',
        default: false
      }
    }
  },
  'aiAgent': {
    type: 'aiAgent',
    name: 'AI Agent',
    group: 'ai',
    icon: '🤖',
    color: '#ec4899',
    description: 'Intelligent agent with tools',
    inputs: [
      { id: 'input', type: 'target', position: 'left', label: 'Input' },
      { id: 'tools', type: 'target', position: 'top', label: 'Tools' }
    ],
    outputs: [
      { id: 'output', type: 'source', position: 'right', label: 'Output' },
      { id: 'toolCalls', type: 'source', position: 'bottom', label: 'Tool Calls' }
    ],
    configOptions: {
      agentType: {
        type: 'select',
        label: 'Agent Type',
        options: [
          { label: 'ReAct', value: 'react' },
          { label: 'Plan and Execute', value: 'plan-execute' },
          { label: 'OpenAI Assistant', value: 'openai-assistant' }
        ],
        default: 'react'
      },
      model: {
        type: 'select',
        label: 'Model',
        options: [
          { label: 'GPT-4', value: 'gpt-4' },
          { label: 'Claude 3 Opus', value: 'claude-3-opus' },
          { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet' },
          { label: 'Gemini Pro', value: 'gemini-pro' }
        ],
        default: 'gpt-4'
      }
    }
  },
  
  // Input Nodes
  'fileInput': {
    type: 'fileInput',
    name: 'File Input',
    group: 'input',
    icon: '📄',
    color: '#3b82f6',
    description: 'Upload and process files',
    outputs: [
      { id: 'file', type: 'source', position: 'right', label: 'File' }
    ],
    configOptions: {
      fileTypes: {
        type: 'multiSelect',
        label: 'File Types',
        options: [
          { label: 'PDF', value: 'pdf' },
          { label: 'DOCX', value: 'docx' },
          { label: 'TXT', value: 'txt' },
          { label: 'CSV', value: 'csv' },
          { label: 'XLSX', value: 'xlsx' }
        ],
        default: ['pdf', 'docx', 'txt']
      },
      maxFileSize: {
        type: 'number',
        label: 'Max File Size (MB)',
        min: 1,
        max: 100,
        default: 10
      }
    }
  },
  
  // Memory Nodes
  'memory': {
    type: 'memory',
    name: 'Memory',
    group: 'memory',
    icon: '💾',
    color: '#f59e0b',
    description: 'Store conversation memory and data',
    inputs: [
      { id: 'input', type: 'target', position: 'left', label: 'Input' }
    ],
    outputs: [
      { id: 'memory', type: 'source', position: 'right', label: 'Memory' }
    ],
    configOptions: {
      memoryType: {
        type: 'select',
        label: 'Memory Type',
        options: [
          { label: 'Buffer Memory', value: 'buffer' },
          { label: 'Conversation Memory', value: 'conversation' },
          { label: 'Vector Store', value: 'vectorStore' }
        ],
        default: 'conversation'
      },
      maxSize: {
        type: 'number',
        label: 'Max Size',
        min: 1,
        max: 100,
        default: 10
      }
    }
  },
  
  // Integration Nodes
  'googleSheets': {
    type: 'googleSheets',
    name: 'Google Sheets',
    group: 'integrations',
    icon: '📊',
    color: '#22c55e',
    description: 'Read/write Google Sheets data',
    inputs: [
      { id: 'input', type: 'target', position: 'left', label: 'Input' }
    ],
    outputs: [
      { id: 'data', type: 'source', position: 'right', label: 'Data' }
    ],
    configOptions: {
      operation: {
        type: 'select',
        label: 'Operation',
        options: [
          { label: 'Read', value: 'read' },
          { label: 'Write', value: 'write' },
          { label: 'Append', value: 'append' }
        ],
        default: 'read'
      },
      sheetId: {
        type: 'string',
        label: 'Sheet ID',
        default: ''
      }
    }
  },
  'googleCalendar': {
    type: 'googleCalendar',
    name: 'Google Calendar',
    group: 'integrations',
    icon: '📅',
    color: '#22c55e',
    description: 'Manage calendar events',
    inputs: [
      { id: 'input', type: 'target', position: 'left', label: 'Input' }
    ],
    outputs: [
      { id: 'events', type: 'source', position: 'right', label: 'Events' }
    ]
  },
  'googleDrive': {
    type: 'googleDrive',
    name: 'Google Drive',
    group: 'integrations',
    icon: '📁',
    color: '#22c55e',
    description: 'Access files from Google Drive',
    inputs: [
      { id: 'input', type: 'target', position: 'left', label: 'Input' }
    ],
    outputs: [
      { id: 'files', type: 'source', position: 'right', label: 'Files' }
    ]
  },
  'mcp': {
    type: 'mcp',
    name: 'MCP Server',
    group: 'integrations',
    icon: '🛠️',
    color: '#6366f1',
    description: 'Connect to MCP Server for tools',
    inputs: [
      { id: 'input', type: 'target', position: 'left', label: 'Input' }
    ],
    outputs: [
      { id: 'result', type: 'source', position: 'right', label: 'Result' }
    ],
    configOptions: {
      mcpType: {
        type: 'select',
        label: 'MCP Type',
        options: [
          { label: 'Standard', value: 'standard' },
          { label: 'Academic', value: 'academic' },
          { label: 'Data Analysis', value: 'data-analysis' },
          { label: 'Administrative', value: 'administrative' }
        ],
        default: 'standard'
      },
      tools: {
        type: 'multiSelect',
        label: 'Available Tools',
        options: [
          { label: 'Document Processing', value: 'document' },
          { label: 'Data Analysis', value: 'data-analysis' },
          { label: 'Google Workspace', value: 'google-workspace' },
          { label: 'Academic Tools', value: 'academic' }
        ],
        default: ['document', 'data-analysis']
      }
    }
  },
  
  // Logic Nodes
  'ifCondition': {
    type: 'ifCondition',
    name: 'IF Condition',
    group: 'logic',
    icon: '🔀',
    color: '#f97316',
    description: 'Route workflow based on conditions',
    inputs: [
      { id: 'input', type: 'target', position: 'left', label: 'Input' }
    ],
    outputs: [
      { id: 'true', type: 'source', position: 'right', label: 'True' },
      { id: 'false', type: 'source', position: 'bottom', label: 'False' }
    ],
    configOptions: {
      condition: {
        type: 'string',
        label: 'Condition',
        default: '{{input.value}} === true'
      }
    }
  },
  'switch': {
    type: 'switch',
    name: 'Switch',
    group: 'logic',
    icon: '🔄',
    color: '#f97316',
    description: 'Multiple branching paths',
    inputs: [
      { id: 'input', type: 'target', position: 'left', label: 'Input' }
    ],
    outputs: [
      { id: 'case1', type: 'source', position: 'right', label: 'Case 1' },
      { id: 'case2', type: 'source', position: 'right', label: 'Case 2' },
      { id: 'default', type: 'source', position: 'bottom', label: 'Default' }
    ]
  },
  
  // Output Nodes
  'output': {
    type: 'output',
    name: 'Output',
    group: 'output',
    icon: '📤',
    color: '#10b981',
    description: 'Final workflow output',
    inputs: [
      { id: 'input', type: 'target', position: 'left', label: 'Input' }
    ],
    configOptions: {
      outputType: {
        type: 'select',
        label: 'Output Type',
        options: [
          { label: 'Text', value: 'text' },
          { label: 'File', value: 'file' },
          { label: 'Email', value: 'email' },
          { label: 'API Response', value: 'api' }
        ],
        default: 'text'
      },
      format: {
        type: 'select',
        label: 'Format',
        options: [
          { label: 'Plain Text', value: 'text' },
          { label: 'PDF', value: 'pdf' },
          { label: 'JSON', value: 'json' },
          { label: 'CSV', value: 'csv' },
          { label: 'XLSX', value: 'xlsx' }
        ],
        default: 'text'
      }
    }
  },
  'fileOutput': {
    type: 'fileOutput',
    name: 'File Output',
    group: 'output',
    icon: '📄',
    color: '#10b981',
    description: 'Generate and save files',
    inputs: [
      { id: 'input', type: 'target', position: 'left', label: 'Input' }
    ]
  },
  'emailOutput': {
    type: 'emailOutput',
    name: 'Email Output',
    group: 'output',
    icon: '📧',
    color: '#10b981',
    description: 'Send email notifications',
    inputs: [
      { id: 'input', type: 'target', position: 'left', label: 'Input' }
    ]
  }
};

interface NodePaletteProps {
  onAddNode?: (nodeType: string) => void;
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
  const [activeGroup, setActiveGroup] = useState<string>('ai');

  // Filter nodes by active group
  const nodesForActiveGroup = Object.values(NODE_TYPES).filter(
    node => node.group === activeGroup
  );

  return (
    <div className="w-64 h-full bg-card border-r border-border flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Node Palette</h2>
        <p className="text-sm text-muted-foreground">Drag components to the canvas</p>
      </div>
      
      {/* Group selector */}
      <div className="flex overflow-x-auto p-2 border-b border-border">
        {NODE_GROUPS.map(group => (
          <button
            key={group.id}
            onClick={() => setActiveGroup(group.id)}
            className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap mr-2 ${
              activeGroup === group.id 
                ? 'bg-primary/20 text-primary' 
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <span className="mr-1">{group.icon}</span>
            {group.name}
          </button>
        ))}
      </div>
      
      {/* Node list */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {nodesForActiveGroup.map(node => (
            <Card 
              key={node.type}
              className="p-3 cursor-grab border border-border hover:border-primary hover:shadow-sm transition-all"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/nodetype', node.type);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => onAddNode && onAddNode(node.type)}
            >
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${node.color}20` }}>
                  <span className="text-lg">{node.icon}</span>
                </div>
                <div>
                  <div className="font-medium text-sm">{node.name}</div>
                  <div className="text-xs text-muted-foreground">{node.description}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}