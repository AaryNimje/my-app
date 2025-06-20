// src/components/workflow/PropertyPanel.tsx
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Settings, Link, Info } from 'lucide-react';
import { NODE_DEFINITIONS } from '@/lib/nodes';
import { NodeParameter } from '@/types/workflow';

interface PropertyPanelProps {
  selectedNode: {
    id: string;
    type: string;
    data: any;
  } | null;
  onUpdateNodeData?: (nodeId: string, data: any) => void;
}

export function PropertyPanel({ selectedNode, onUpdateNodeData }: PropertyPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['general']));

  // Toggle section visibility
  const toggleSection = (section: string) => {
    const newExpandedSections = new Set(expandedSections);
    if (newExpandedSections.has(section)) {
      newExpandedSections.delete(section);
    } else {
      newExpandedSections.add(section);
    }
    setExpandedSections(newExpandedSections);
  };

  // Handle input changes
  const handleInputChange = (key: string, value: any) => {
    if (!selectedNode || !onUpdateNodeData) return;

    const updatedData = {
      ...selectedNode.data,
      config: {
        ...selectedNode.data.config,
        [key]: value
      }
    };

    onUpdateNodeData(selectedNode.id, updatedData);
  };

  // Render the appropriate input for each parameter type
  const renderParameterInput = (parameter: NodeParameter) => {
    const currentValue = selectedNode?.data?.config?.[parameter.name] ?? parameter.default;

    switch (parameter.type) {
      case 'string':
        return (
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={currentValue || ''}
            onChange={(e) => handleInputChange(parameter.name, e.target.value)}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={currentValue || 0}
            min={parameter.validation?.min}
            max={parameter.validation?.max}
            onChange={(e) => handleInputChange(parameter.name, parseFloat(e.target.value))}
          />
        );
      case 'boolean':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={!!currentValue}
              onChange={(e) => handleInputChange(parameter.name, e.target.checked)}
              className="rounded text-blue-500"
            />
            <span className="text-sm text-gray-700">Enabled</span>
          </label>
        );
      case 'select':
        return (
          <select
            className="w-full p-2 border border-gray-300 rounded-md"
            value={currentValue || ''}
            onChange={(e) => handleInputChange(parameter.name, e.target.value)}
          >
            <option value="">Select an option</option>
            {parameter.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            className="w-full p-2 border border-gray-300 rounded-md"
            value={currentValue || ''}
            rows={4}
            onChange={(e) => handleInputChange(parameter.name, e.target.value)}
          />
        );
      default:
        return (
          <div className="text-sm text-gray-500">
            Unsupported parameter type: {parameter.type}
          </div>
        );
    }
  };

  // No node selected
  if (!selectedNode) {
    return (
      <div className="w-64 bg-card border-l border-border">
        <div className="p-4 text-center text-muted-foreground">
          <p>Select a node to view and edit its properties</p>
        </div>
      </div>
    );
  }

  // Attempt to get the node type info
  const nodeTypeInfo = NODE_DEFINITIONS[selectedNode.type];
  if (!nodeTypeInfo) {
    return (
      <div className="w-64 bg-card border-l border-border">
        <div className="p-4">
          <div className="text-lg font-semibold mb-2">Unknown Node Type</div>
          <div className="text-sm text-muted-foreground">
            The node type "{selectedNode.type}" is not recognized.
          </div>
        </div>
      </div>
    );
  }

  // Get the parameters from the node type
  const parameters = nodeTypeInfo.parameters || [];

  return (
    <div className="w-64 bg-card border-l border-border overflow-y-auto h-full">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold">{nodeTypeInfo.name}</h3>
        <p className="text-sm text-muted-foreground">{nodeTypeInfo.description}</p>
      </div>

      {/* General Section */}
      <div className="border-b border-border">
        <button
          onClick={() => toggleSection('general')}
          className="w-full flex items-center justify-between p-4 text-left font-medium hover:bg-muted/50 transition-colors"
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
              <label className="block text-sm font-medium mb-2">Node ID</label>
              <input
                type="text"
                className="w-full p-2 border border-border rounded-md bg-muted text-sm"
                value={selectedNode.id}
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Label</label>
              <input
                type="text"
                className="w-full p-2 border border-border rounded-md"
                value={selectedNode.data.label || ''}
                onChange={(e) => {
                  const updatedData = {
                    ...selectedNode.data,
                    label: e.target.value
                  };
                  if (onUpdateNodeData) {
                    onUpdateNodeData(selectedNode.id, updatedData);
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Parameters Section */}
      {parameters.length > 0 && (
        <div className="border-b border-border">
          <button
            onClick={() => toggleSection('parameters')}
            className="w-full flex items-center justify-between p-4 text-left font-medium hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Parameters
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
                    <label className="block text-sm font-medium">
                      {parameter.label}
                    </label>
                    {parameter.required && (
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  
                  {parameter.description && (
                    <div className="text-xs text-muted-foreground mb-2">
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
      <div className="border-b border-border">
        <button
          onClick={() => toggleSection('connections')}
          className="w-full flex items-center justify-between p-4 text-left font-medium hover:bg-muted/50 transition-colors"
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
            {nodeTypeInfo.inputs && nodeTypeInfo.inputs.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">Inputs</label>
                <div className="space-y-2">
                  {nodeTypeInfo.inputs.map((input) => (
                    <div key={input.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div>
                        <div className="text-sm font-medium">{input.label || input.id}</div>
                        <div className="text-xs text-muted-foreground">{input.dataType || 'any'}</div>
                      </div>
                      <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                        {input.position}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Output handles */}
            {nodeTypeInfo.outputs && nodeTypeInfo.outputs.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">Outputs</label>
                <div className="space-y-2">
                  {nodeTypeInfo.outputs.map((output) => (
                    <div key={output.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div>
                        <div className="text-sm font-medium">{output.label || output.id}</div>
                        <div className="text-xs text-muted-foreground">{output.dataType || 'any'}</div>
                      </div>
                      <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                        {output.position}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}