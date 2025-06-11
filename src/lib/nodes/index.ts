import { NodeParameter, NodeHandle } from '@/types/workflow';

export interface NodeDefinition {
  type: string;
  name: string;
  group: string;
  icon: string;
  color: string;
  description: string;
  inputs: NodeHandle[];
  outputs: NodeHandle[];
  parameters: NodeParameter[];
  credentials?: string[];
  webhooks?: boolean;
  polling?: boolean;
}

export const NODE_DEFINITIONS: Record<string, NodeDefinition> = {
  // TRIGGER NODES
  'webhook': {
    type: 'webhook',
    name: 'Webhook',
    group: 'Trigger',
    icon: '🔗',
    color: '#ff6d5a',
    description: 'Receive HTTP requests to trigger workflows',
    inputs: [],
    outputs: [
      { id: 'main', type: 'source', position: 'right', label: 'Main', dataType: 'object' }
    ],
    parameters: [
      {
        name: 'httpMethod',
        type: 'select',
        label: 'HTTP Method',
        required: true,
        default: 'GET',
        options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' }
        ]
      },
      {
        name: 'path',
        type: 'string',
        label: 'Webhook Path',
        description: 'Path where the webhook will be available',
        default: '/webhook'
      }
    ],
    webhooks: true
  },

  'schedule': {
    type: 'schedule',
    name: 'Schedule Trigger',
    group: 'Trigger',
    icon: '⏰',
    color: '#ff6d5a',
    description: 'Run workflow on a schedule',
    inputs: [],
    outputs: [
      { id: 'main', type: 'source', position: 'right', label: 'Main', dataType: 'object' }
    ],
    parameters: [
      {
        name: 'triggerInterval',
        type: 'select',
        label: 'Trigger Interval',
        required: true,
        default: 'minute',
        options: [
          { label: 'Every Minute', value: 'minute' },
          { label: 'Every Hour', value: 'hour' },
          { label: 'Every Day', value: 'day' },
          { label: 'Every Week', value: 'week' },
          { label: 'Custom Cron', value: 'cron' }
        ]
      },
      {
        name: 'cronExpression',
        type: 'string',
        label: 'Cron Expression',
        description: 'Custom cron expression (when Custom Cron is selected)'
      }
    ]
  },

  // FILE PROCESSING NODES
  'file-input': {
    type: 'file-input',
    name: 'File Input',
    group: 'Files',
    icon: '📁',
    color: '#3b82f6',
    description: 'Upload and process various file formats',
    inputs: [
      { id: 'main', type: 'target', position: 'left', label: 'Input', dataType: 'object' }
    ],
    outputs: [
      { id: 'main', type: 'source', position: 'right', label: 'File Data', dataType: 'object' }
    ],
    parameters: [
      {
        name: 'fileType',
        type: 'select',
        label: 'File Type',
        required: true,
        default: 'auto',
        options: [
          { label: 'Auto Detect', value: 'auto' },
          { label: 'PDF', value: 'pdf' },
          { label: 'Excel (.xlsx)', value: 'xlsx' },
          { label: 'Word (.docx)', value: 'docx' },
          { label: 'CSV', value: 'csv' },
          { label: 'Text', value: 'txt' },
          { label: 'JSON', value: 'json' },
          { label: 'Image', value: 'image' }
        ]
      },
      {
        name: 'processingMode',
        type: 'select',
        label: 'Processing Mode',
        default: 'extract',
        options: [
          { label: 'Extract Text', value: 'extract' },
          { label: 'Parse Structure', value: 'parse' },
          { label: 'OCR (Images)', value: 'ocr' },
          { label: 'Metadata Only', value: 'metadata' }
        ]
      },
      {
        name: 'encoding',
        type: 'select',
        label: 'Text Encoding',
        default: 'utf-8',
        options: [
          { label: 'UTF-8', value: 'utf-8' },
          { label: 'ASCII', value: 'ascii' },
          { label: 'Latin-1', value: 'latin-1' }
        ]
      }
    ]
  },

  'google-sheets': {
    type: 'google-sheets',
    name: 'Google Sheets',
    group: 'Google',
    icon: '📊',
    color: '#34a853',
    description: 'Read from and write to Google Sheets',
    inputs: [
      { id: 'main', type: 'target', position: 'left', label: 'Input', dataType: 'object' }
    ],
    outputs: [
      { id: 'main', type: 'source', position: 'right', label: 'Sheet Data', dataType: 'array' }
    ],
    parameters: [
      {
        name: 'operation',
        type: 'select',
        label: 'Operation',
        required: true,
        default: 'read',
        options: [
          { label: 'Read Rows', value: 'read' },
          { label: 'Append Row', value: 'append' },
          { label: 'Update Row', value: 'update' },
          { label: 'Clear Sheet', value: 'clear' }
        ]
      },
      {
        name: 'spreadsheetId',
        type: 'string',
        label: 'Spreadsheet ID',
        description: 'Google Sheets spreadsheet ID',
        required: true
      },
      {
        name: 'range',
        type: 'string',
        label: 'Range',
        description: 'Sheet range (e.g., A1:Z100)',
        default: 'A:Z'
      }
    ],
    credentials: ['googleSheetsOAuth2Api']
  },

  // AI NODES
  'llm-node': {
    type: 'llm-node',
    name: 'LLM',
    group: 'AI',
    icon: '🧠',
    color: '#8b5cf6',
    description: 'Large Language Model for text processing',
    inputs: [
      { id: 'main', type: 'target', position: 'left', label: 'Input', dataType: 'object' }
    ],
    outputs: [
      { id: 'main', type: 'source', position: 'right', label: 'Response', dataType: 'object' }
    ],
    parameters: [
      {
        name: 'model',
        type: 'select',
        label: 'Model',
        required: true,
        default: 'gpt-4',
        options: [
          { label: 'GPT-4', value: 'gpt-4' },
          { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
          { label: 'Claude', value: 'claude-3' },
          { label: 'Gemini Pro', value: 'gemini-pro' }
        ]
      },
      {
        name: 'systemPrompt',
        type: 'textarea',
        label: 'System Prompt',
        description: 'Instructions for the AI model',
        default: 'You are a helpful assistant.'
      },
      {
        name: 'userPrompt',
        type: 'textarea',
        label: 'User Prompt',
        description: 'Use {{variable}} for dynamic content',
        required: true
      },
      {
        name: 'temperature',
        type: 'number',
        label: 'Temperature',
        description: 'Creativity level (0.0 - 2.0)',
        default: 0.7,
        validation: { min: 0, max: 2 }
      },
      {
        name: 'maxTokens',
        type: 'number',
        label: 'Max Tokens',
        description: 'Maximum response length',
        default: 2048,
        validation: { min: 1, max: 4096 }
      }
    ]
  },

  'ai-agent': {
    type: 'ai-agent',
    name: 'AI Agent',
    group: 'AI',
    icon: '🤖',
    color: '#8b5cf6',
    description: 'Intelligent agent with tool access',
    inputs: [
      { id: 'main', type: 'target', position: 'left', label: 'Input', dataType: 'object' },
      { id: 'tools', type: 'target', position: 'top', label: 'Tools', dataType: 'array' }
    ],
    outputs: [
      { id: 'main', type: 'source', position: 'right', label: 'Response', dataType: 'object' },
      { id: 'toolCalls', type: 'source', position: 'bottom', label: 'Tool Calls', dataType: 'array' }
    ],
    parameters: [
      {
        name: 'agentType',
        type: 'select',
        label: 'Agent Type',
        required: true,
        default: 'academic',
        options: [
          { label: 'Academic Assistant', value: 'academic' },
          { label: 'Administrative Agent', value: 'admin' },
          { label: 'Research Helper', value: 'research' },
          { label: 'Custom Agent', value: 'custom' }
        ]
      },
      {
        name: 'systemPrompt',
        type: 'textarea',
        label: 'System Prompt',
        description: 'Define the agent\'s role and capabilities',
        required: true
      },
      {
        name: 'maxIterations',
        type: 'number',
        label: 'Max Iterations',
        description: 'Maximum tool usage cycles',
        default: 5,
        validation: { min: 1, max: 20 }
      }
    ]
  },

  // MEMORY NODES
  'memory-store': {
    type: 'memory-store',
    name: 'Memory Store',
    group: 'Memory',
    icon: '💾',
    color: '#f59e0b',
    description: 'Store and retrieve conversation memory',
    inputs: [
      { id: 'main', type: 'target', position: 'left', label: 'Input', dataType: 'object' }
    ],
    outputs: [
      { id: 'main', type: 'source', position: 'right', label: 'Memory', dataType: 'object' }
    ],
    parameters: [
      {
        name: 'memoryType',
        type: 'select',
        label: 'Memory Type',
        required: true,
        default: 'conversation',
        options: [
          { label: 'Conversation Buffer', value: 'conversation' },
          { label: 'Document Memory', value: 'document' },
          { label: 'Vector Memory', value: 'vector' },
          { label: 'Shared Memory', value: 'shared' }
        ]
      },
      {
        name: 'memoryKey',
        type: 'string',
        label: 'Memory Key',
        description: 'Unique identifier for this memory store',
        required: true
      },
      {
        name: 'maxTokens',
        type: 'number',
        label: 'Max Tokens',
        description: 'Maximum memory size',
        default: 2000
      }
    ]
  },

  // LOGIC NODES
  'if-condition': {
    type: 'if-condition',
    name: 'IF Condition',
    group: 'Logic',
    icon: '🔀',
    color: '#f97316',
    description: 'Route workflow based on conditions',
    inputs: [
      { id: 'main', type: 'target', position: 'left', label: 'Input', dataType: 'object' }
    ],
    outputs: [
      { id: 'true', type: 'source', position: 'right', label: 'True', dataType: 'object' },
      { id: 'false', type: 'source', position: 'bottom', label: 'False', dataType: 'object' }
    ],
    parameters: [
      {
        name: 'conditions',
        type: 'json',
        label: 'Conditions',
        description: 'Array of condition objects',
        required: true,
        default: JSON.stringify([
          {
            "field": "status",
            "operator": "equals",
            "value": "success"
          }
        ], null, 2)
      },
      {
        name: 'combineOperation',
        type: 'select',
        label: 'Combine Operation',
        default: 'AND',
        options: [
          { label: 'AND (all must be true)', value: 'AND' },
          { label: 'OR (any can be true)', value: 'OR' }
        ]
      }
    ]
  },

  // OUTPUT NODES
  'file-output': {
    type: 'file-output',
    name: 'File Output',
    group: 'Output',
    icon: '📤',
    color: '#06b6d4',
    description: 'Generate and save files',
    inputs: [
      { id: 'main', type: 'target', position: 'left', label: 'Input', dataType: 'object' }
    ],
    outputs: [
      { id: 'main', type: 'source', position: 'right', label: 'File Info', dataType: 'object' }
    ],
    parameters: [
      {
        name: 'fileFormat',
        type: 'select',
        label: 'File Format',
        required: true,
        default: 'pdf',
        options: [
          { label: 'PDF', value: 'pdf' },
          { label: 'Excel (.xlsx)', value: 'xlsx' },
          { label: 'Word (.docx)', value: 'docx' },
          { label: 'CSV', value: 'csv' },
          { label: 'JSON', value: 'json' },
          { label: 'Text', value: 'txt' }
        ]
      },
      {
        name: 'fileName',
        type: 'string',
        label: 'File Name',
        description: 'Use {{variable}} for dynamic names',
        required: true
      },
      {
        name: 'template',
        type: 'textarea',
        label: 'Content Template',
        description: 'File content template with variables',
        required: true
      }
    ]
  },

  'email-send': {
    type: 'email-send',
    name: 'Send Email',
    group: 'Communication',
    icon: '📧',
    color: '#ef4444',
    description: 'Send emails with attachments',
    inputs: [
      { id: 'main', type: 'target', position: 'left', label: 'Input', dataType: 'object' }
    ],
    outputs: [
      { id: 'main', type: 'source', position: 'right', label: 'Result', dataType: 'object' }
    ],
    parameters: [
      {
        name: 'toEmail',
        type: 'string',
        label: 'To Email',
        description: 'Recipient email address',
        required: true
      },
      {
        name: 'subject',
        type: 'string',
        label: 'Subject',
        description: 'Email subject line',
        required: true
      },
      {
        name: 'body',
        type: 'textarea',
        label: 'Email Body',
        description: 'Email content (supports HTML)',
        required: true
      },
      {
        name: 'attachments',
        type: 'boolean',
        label: 'Include Attachments',
        description: 'Attach files from previous nodes',
        default: false
      }
    ],
    credentials: ['smtp']
  }
};

export const NODE_GROUPS = {
  'Trigger': { color: '#ff6d5a', icon: '⚡' },
  'Files': { color: '#3b82f6', icon: '📁' },
  'Google': { color: '#34a853', icon: '🔍' },
  'AI': { color: '#8b5cf6', icon: '🧠' },
  'Memory': { color: '#f59e0b', icon: '💾' },
  'Logic': { color: '#f97316', icon: '🔀' },
  'Output': { color: '#06b6d4', icon: '📤' },
  'Communication': { color: '#ef4444', icon: '📧' }
};