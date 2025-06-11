'use client';

import React, { useState, useCallback } from 'react';
import { 
  Settings, 
  Info, 
  Code, 
  Link,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface NodeHandle {
  id: string;
  type: 'source' | 'target';
  position: 'top' | 'right' | 'bottom' | 'left';
  label?: string;
  dataType?: string;
}

interface NodeParameter {
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
}

interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    config: Record<string, any>;
    inputs?: NodeHandle[];
    outputs?: NodeHandle[];
    parameters?: NodeParameter[];
    status?: 'idle' | 'running' | 'success' | 'error';
    lastRun?: string;
  };
  width?: number;
  height?: number;
}

interface PropertyPanelProps {
  selectedNode: WorkflowNode | null;
  onNodeUpdateAction: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  readonly?: boolean;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedNode,
  onNodeUpdateAction,
  readonly = false
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['general', 'parameters', 'connections'])
  );

  const toggleSection = useCallback((section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  }, [expandedSections]);

  const handleParameterChange = useCallback((paramName: string, value: any) => {
    if (!selectedNode || readonly) return;
    
    const updatedConfig = {
      ...selectedNode.data.config,
      [paramName]: value
    };
    
    onNodeUpdateAction(selectedNode.id, {
      data: {
        ...selectedNode.data,
        config: updatedConfig
      }
    });
  }, [selectedNode, onNodeUpdateAction, readonly]);

  const handleLabelChange = useCallback((newLabel: string) => {
    if (!selectedNode || readonly) return;
    
    onNodeUpdateAction(selectedNode.id, {
      data: {
        ...selectedNode.data,
        label: newLabel
      }
    });
  }, [selectedNode, onNodeUpdateAction, readonly]);

  const handleDescriptionChange = useCallback((newDescription: string) => {
    if (!selectedNode || readonly) return;
    
    onNodeUpdateAction(selectedNode.id, {
      data: {
        ...selectedNode.data,
        description: newDescription
      }
    });
  }, [selectedNode, onNodeUpdateAction, readonly]);

  const renderParameterInput = useCallback((parameter: NodeParameter) => {
    const currentValue = selectedNode?.data.config[parameter.name] ?? parameter.default;

    switch (parameter.type) {
      case 'string':
        return (
          <input
            type="text"
            value={currentValue || ''}
            onChange={(e) => handleParameterChange(parameter.name, e.target.value)}
            placeholder={parameter.default}
            disabled={readonly}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={currentValue || ''}
            onChange={(e) => handleParameterChange(parameter.name, Number(e.target.value))}
            placeholder={parameter.default?.toString()}
            min={parameter.validation?.min}
            max={parameter.validation?.max}
            disabled={readonly}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={currentValue || false}
              onChange={(e) => handleParameterChange(parameter.name, e.target.checked)}
              disabled={readonly}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Enabled</span>
          </label>
        );

      case 'select':
        return (
          <select
            value={currentValue || parameter.default}
            onChange={(e) => handleParameterChange(parameter.name, e.target.value)}
            disabled={readonly}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          >
            <option value="">Select an option</option>
            {parameter.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <input
            type="text"
            value={Array.isArray(currentValue) ? currentValue.join(', ') : currentValue || ''}
            onChange={(e) => handleParameterChange(parameter.name, e.target.value.split(',').map(s => s.trim()))}
            placeholder="Comma-separated values"
            disabled={readonly}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={currentValue || ''}
            onChange={(e) => handleParameterChange(parameter.name, e.target.value)}
            placeholder={parameter.default}
            rows={4}
            disabled={readonly}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
        );

      case 'json':
        return (
          <textarea
            value={typeof currentValue === 'object' ? JSON.stringify(currentValue, null, 2) : currentValue || ''}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleParameterChange(parameter.name, parsed);
              } catch {
                handleParameterChange(parameter.name, e.target.value);
              }
            }}
            placeholder="{}"
            rows={6}
            disabled={readonly}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 font-mono text-sm"
          />
        );

      case 'file':
        return (
          <div className="text-sm text-gray-500 p-2 border border-gray-200 rounded">
            File upload not implemented yet
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={currentValue || ''}
            onChange={(e) => handleParameterChange(parameter.name, e.target.value)}
            disabled={readonly}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
        );
    }
  }, [selectedNode, handleParameterChange, readonly]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'idle':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'running':
        return <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle':
        return 'bg-gray-100 text-gray-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!selectedNode) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Properties
          </h2>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center text-gray-500">
            <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Select a node to view its properties</p>
          </div>
        </div>
      </div>
    );
  }

  const parameters = selectedNode.data.parameters || [];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📦</span>
          <h2 className="text-lg font-semibold text-gray-900">Properties</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
            {selectedNode.type}
          </span>
          <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${getStatusColor(selectedNode.data.status || 'idle')}`}>
            {getStatusIcon(selectedNode.data.status || 'idle')}
            {selectedNode.data.status || 'idle'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* General Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection('general')}
            className="w-full flex items-center justify-between p-4 text-left font-medium hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              General
            </div>
            {expandedSections.has('general') ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {expandedSections.has('general') && (
            <div className="px-4 pb-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Label</label>
                <input
                  type="text"
                  value={selectedNode.data.label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder="Node label"
                  disabled={readonly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={selectedNode.data.description || ''}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder="Optional description"
                  rows={3}
                  disabled={readonly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>

              {selectedNode.data.lastRun && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Execution</label>
                  <div className="text-sm text-gray-600">
                    {new Date(selectedNode.data.lastRun).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Parameters Section */}
        {parameters.length > 0 && (
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleSection('parameters')}
              className="w-full flex items-center justify-between p-4 text-left font-medium hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                Parameters ({parameters.length})
              </div>
              {expandedSections.has('parameters') ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {expandedSections.has('parameters') && (
              <div className="px-4 pb-4 space-y-4">
                {parameters.map((parameter) => (
                  <div key={parameter.name}>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {parameter.label}
                      </label>
                      {parameter.required && (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    
                    {parameter.description && (
                      <div className="text-xs text-gray-600 mb-2">
                        {parameter.description}
                      </div>
                    )}
                    
                    {renderParameterInput(parameter)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Connections Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection('connections')}
            className="w-full flex items-center justify-between p-4 text-left font-medium hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              Connections
            </div>
            {expandedSections.has('connections') ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {expandedSections.has('connections') && (
            <div className="px-4 pb-4 space-y-4">
              {/* Input handles */}
              {selectedNode.data.inputs && selectedNode.data.inputs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Inputs</label>
                  <div className="space-y-2">
                    {selectedNode.data.inputs.map((input) => (
                      <div key={input.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <div className="text-sm font-medium">{input.label || input.id}</div>
                          <div className="text-xs text-gray-500">{input.dataType}</div>
                        </div>
                        <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                          {input.position}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Output handles */}
              {selectedNode.data.outputs && selectedNode.data.outputs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Outputs</label>
                  <div className="space-y-2">
                    {selectedNode.data.outputs.map((output) => (
                      <div key={output.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <div className="text-sm font-medium">{output.label || output.id}</div>
                          <div className="text-xs text-gray-500">{output.dataType}</div>
                        </div>
                        <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                          {output.position}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!selectedNode.data.inputs || selectedNode.data.inputs.length === 0) &&
               (!selectedNode.data.outputs || selectedNode.data.outputs.length === 0) && (
                <div className="text-sm text-gray-500 text-center py-4">
                  No connection points defined
                </div>
              )}
            </div>
          )}
        </div>

        {/* Node Info */}
        <div className="p-4">
          <div className="text-xs text-gray-500 space-y-1">
            <div><strong>ID:</strong> {selectedNode.id}</div>
            <div><strong>Type:</strong> {selectedNode.type}</div>
            <div><strong>Position:</strong> {selectedNode.position.x}, {selectedNode.position.y}</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      {readonly && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-600 text-center">
            🔒 Read-only mode - properties cannot be modified
          </div>
        </div>
      )}
    </div>
  );
};