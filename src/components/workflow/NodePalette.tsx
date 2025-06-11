'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';

interface NodeDefinition {
  type: string;
  name: string;
  group: string;
  icon: string;
  color: string;
  description: string;
  inputs?: Array<{
    id: string;
    type: 'target';
    position: 'top' | 'right' | 'bottom' | 'left';
    label?: string;
    dataType?: string;
  }>;
  outputs?: Array<{
    id: string;
    type: 'source';
    position: 'top' | 'right' | 'bottom' | 'left';
    label?: string;
    dataType?: string;
  }>;
  parameters?: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'json' | 'textarea' | 'file';
    label: string;
    description?: string;
    required?: boolean;
    default?: any;
    options?: Array<{ label: string; value: any }>;
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
    };
  }>;
}

// Local node definitions - matching the structure from the lib file
const nodeDefinitions: Record<string, NodeDefinition> = {
  // INPUT NODES
  'file-input': {
    type: 'file-input',
    name: 'File Input',
    group: 'Input',
    icon: '📁',
    color: '#3b82f6',
    description: 'Upload and process files',
    outputs: [
      { id: 'main', type: 'source', position: 'right', label: 'File', dataType: 'file' }
    ]
  },
  'text-input': {
    type: 'text-input',
    name: 'Text Input',
    group: 'Input',
    icon: '✏️',
    color: '#3b82f6',
    description: 'Direct text input for processing',
    outputs: [
      { id: 'main', type: 'source', position: 'right', label: 'Text', dataType: 'string' }
    ]
  },

  // AI NODES
  'llm-model': {
    type: 'llm-model',
    name: 'LLM Model',
    group: 'AI',
    icon: '🧠',
    color: '#8b5cf6',
    description: 'Large Language Model for text generation',
    inputs: [
      { id: 'main', type: 'target', position: 'left', label: 'Input', dataType: 'object' }
    ],
    outputs: [
      { id: 'main', type: 'source', position: 'right', label: 'Response', dataType: 'object' }
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
    ]
  },

  // OUTPUT NODES
  'file-output': {
    type: 'file-output',
    name: 'File Output',
    group: 'Output',
    icon: '📄',
    color: '#10b981',
    description: 'Generate and save files',
    inputs: [
      { id: 'main', type: 'target', position: 'left', label: 'Input', dataType: 'object' }
    ]
  },
  'email-output': {
    type: 'email-output',
    name: 'Email Output',
    group: 'Output',
    icon: '📧',
    color: '#10b981',
    description: 'Send email notifications',
    inputs: [
      { id: 'main', type: 'target', position: 'left', label: 'Input', dataType: 'object' }
    ]
  },

  // PROCESSING NODES
  'text-processor': {
    type: 'text-processor',
    name: 'Text Processor',
    group: 'Processing',
    icon: '📝',
    color: '#6366f1',
    description: 'Process and transform text',
    inputs: [
      { id: 'main', type: 'target', position: 'left', label: 'Input', dataType: 'string' }
    ],
    outputs: [
      { id: 'main', type: 'source', position: 'right', label: 'Output', dataType: 'string' }
    ]
  },

  // INTEGRATIONS
  'google-sheets': {
    type: 'google-sheets',
    name: 'Google Sheets',
    group: 'Integrations',
    icon: '📊',
    color: '#34d399',
    description: 'Read/write Google Sheets data',
    inputs: [
      { id: 'main', type: 'target', position: 'left', label: 'Input', dataType: 'object' }
    ],
    outputs: [
      { id: 'main', type: 'source', position: 'right', label: 'Data', dataType: 'array' }
    ]
  }
};

interface NodePaletteProps {
  readonly?: boolean;
}

interface NodeCategory {
  name: string;
  nodes: Array<{
    type: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    group: string;
  }>;
}

export const NodePalette: React.FC<NodePaletteProps> = ({ readonly = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Input', 'AI', 'Output']) // Default expanded categories
  );

  // Group nodes by category
  const nodeCategories = useMemo(() => {
    const categories: Record<string, NodeCategory> = {};
    
    Object.entries(nodeDefinitions).forEach(([type, definition]) => {
      const group = definition.group;
      if (!categories[group]) {
        categories[group] = {
          name: group,
          nodes: []
        };
      }
      
      categories[group].nodes.push({
        type,
        name: definition.name,
        description: definition.description,
        icon: definition.icon,
        color: definition.color,
        group: definition.group
      });
    });

    return Object.values(categories).sort((a, b) => {
      // Custom ordering for categories
      const order = ['Input', 'AI', 'Processing', 'Memory', 'Logic', 'Output', 'Integrations'];
      const aIndex = order.indexOf(a.name);
      const bIndex = order.indexOf(b.name);
      
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      } else if (aIndex !== -1) {
        return -1;
      } else if (bIndex !== -1) {
        return 1;
      }
      
      return a.name.localeCompare(b.name);
    });
  }, []);

  // Filter nodes based on search term
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) {
      return nodeCategories;
    }

    const term = searchTerm.toLowerCase();
    return nodeCategories
      .map(category => ({
        ...category,
        nodes: category.nodes.filter(node =>
          node.name.toLowerCase().includes(term) ||
          node.description.toLowerCase().includes(term) ||
          node.type.toLowerCase().includes(term)
        )
      }))
      .filter(category => category.nodes.length > 0);
  }, [nodeCategories, searchTerm]);

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const handleNodeDragStart = (event: React.DragEvent, nodeType: string) => {
    if (readonly) {
      event.preventDefault();
      return;
    }
    
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const getCategoryIcon = (categoryName: string) => {
    const icons: Record<string, string> = {
      'Input': '📥',
      'AI': '🤖',
      'Processing': '⚙️',
      'Memory': '💾',
      'Logic': '🔀',
      'Output': '📤',
      'Integrations': '🔗'
    };
    return icons[categoryName] || '📋';
  };

  const getCategoryCount = (category: NodeCategory) => {
    return category.nodes.length;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Node categories */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          {filteredCategories.map((category) => {
            const isExpanded = expandedCategories.has(category.name);
            const categoryCount = getCategoryCount(category);
            
            return (
              <div key={category.name} className="border border-gray-200 rounded-lg">
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(category.name)}
                  className="w-full flex items-center justify-between p-3 text-left font-medium hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {getCategoryIcon(category.name)}
                    </span>
                    <span>{category.name}</span>
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                      {categoryCount}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                {/* Category nodes */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-1">
                    {category.nodes.map((node) => (
                      <div
                        key={node.type}
                        draggable={!readonly}
                        onDragStart={(e) => handleNodeDragStart(e, node.type)}
                        className={`
                          p-3 rounded-md border cursor-pointer transition-all
                          ${readonly 
                            ? 'bg-gray-50 cursor-not-allowed opacity-60' 
                            : 'bg-white hover:bg-gray-50 hover:border-blue-300 hover:shadow-sm'
                          }
                        `}
                        style={{
                          borderLeftColor: node.color,
                          borderLeftWidth: '3px'
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-lg flex-shrink-0 mt-0.5">
                            {node.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-gray-900 mb-1">
                              {node.name}
                            </h4>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              {node.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {filteredCategories.length === 0 && searchTerm && (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No nodes found matching "{searchTerm}"</p>
              <p className="text-xs mt-1">Try adjusting your search terms</p>
            </div>
          )}
        </div>
      </div>

      {/* Help text */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600 space-y-1">
          {readonly ? (
            <p>📖 Viewing mode - drag and drop disabled</p>
          ) : (
            <>
              <p>💡 <strong>Tip:</strong> Drag nodes to the canvas to add them</p>
              <p>🔍 Use search to quickly find specific nodes</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};