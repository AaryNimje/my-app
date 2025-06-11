'use client';

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  MoreHorizontal 
} from 'lucide-react';

interface NodeHandle {
  id: string;
  type: 'source' | 'target';
  position: 'top' | 'right' | 'bottom' | 'left';
  label?: string;
  dataType?: string;
}

interface NodeDefinition {
  icon?: string;
  color?: string;
  group?: string;
}

interface CustomNodeData {
  label: string;
  description?: string;
  nodeType: string;
  definition?: NodeDefinition;
  readonly: boolean;
  isExecuting: boolean;
  selected: boolean;
  inputs?: NodeHandle[];
  outputs?: NodeHandle[];
  status?: 'idle' | 'running' | 'success' | 'error';
  config?: Record<string, any>;
}

interface CustomNodeProps {
  data: CustomNodeData;
  selected?: boolean;
}

export const CustomNode = memo<CustomNodeProps>(({ data, selected }) => {
  const {
    label,
    description,
    definition,
    readonly,
    isExecuting,
    inputs = [],
    outputs = [],
    status = 'idle'
  } = data;

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      case 'success':
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'error':
        return <XCircle className="w-3 h-3 text-red-600" />;
      case 'idle':
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'border-blue-500 bg-blue-50';
      case 'success':
        return 'border-green-500 bg-green-50';
      case 'error':
        return 'border-red-500 bg-red-50';
      case 'idle':
      default:
        return 'border-gray-300 bg-white';
    }
  };

  const getHandlePosition = (position: string): Position => {
    switch (position) {
      case 'top':
        return Position.Top;
      case 'right':
        return Position.Right;
      case 'bottom':
        return Position.Bottom;
      case 'left':
      default:
        return Position.Left;
    }
  };

  const borderColor = selected ? 'border-blue-500' : getStatusColor();

  return (
    <div 
      className={`
        relative bg-white border-2 rounded-lg shadow-sm min-w-48 min-h-20
        ${borderColor}
        ${selected ? 'shadow-lg' : 'shadow-sm'}
        ${readonly ? 'opacity-75' : ''}
        transition-all duration-200
      `}
      style={{
        borderLeftColor: definition?.color || '#e5e7eb',
        borderLeftWidth: '4px'
      }}
    >
      {/* Input Handles */}
      {inputs.map((input: NodeHandle, index: number) => (
        <Handle
          key={input.id}
          type="target"
          position={getHandlePosition(input.position)}
          id={input.id}
          className="w-3 h-3 border-2 border-gray-400 bg-white"
          style={{
            [input.position]: input.position === 'top' || input.position === 'bottom' 
              ? `${20 + index * 30}px` 
              : `${20 + index * 30}px`
          }}
        />
      ))}

      {/* Output Handles */}
      {outputs.map((output: NodeHandle, index: number) => (
        <Handle
          key={output.id}
          type="source"
          position={getHandlePosition(output.position)}
          id={output.id}
          className="w-3 h-3 border-2 border-gray-400 bg-white"
          style={{
            [output.position]: output.position === 'top' || output.position === 'bottom' 
              ? `${20 + index * 30}px` 
              : `${20 + index * 30}px`
          }}
        />
      ))}

      {/* Node Content */}
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{definition?.icon || '📦'}</span>
            <span className="font-medium text-sm text-gray-900 truncate">
              {label}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            {getStatusIcon()}
            <MoreHorizontal className="w-3 h-3 text-gray-400" />
          </div>
        </div>

        {/* Description */}
        {description && (
          <div className="text-xs text-gray-600 mb-2 line-clamp-2">
            {description}
          </div>
        )}

        {/* Node Type Badge */}
        <div className="flex items-center justify-between">
          <span 
            className="text-xs px-2 py-1 rounded"
            style={{
              backgroundColor: definition?.color ? `${definition.color}20` : '#f3f4f6',
              color: definition?.color || '#6b7280'
            }}
          >
            {definition?.group || 'Node'}
          </span>
          
          {status === 'running' && (
            <span className="text-xs text-blue-600 animate-pulse">
              Running...
            </span>
          )}
        </div>

        {/* Connection Indicators */}
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          {inputs.length > 0 && (
            <span>← {inputs.length} input{inputs.length !== 1 ? 's' : ''}</span>
          )}
          {outputs.length > 0 && (
            <span>{outputs.length} output{outputs.length !== 1 ? 's' : ''} →</span>
          )}
        </div>
      </div>

      {/* Execution Overlay */}
      {isExecuting && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-lg flex items-center justify-center">
          <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
            Executing...
          </div>
        </div>
      )}

      {/* Selection Overlay */}
      {selected && (
        <div className="absolute -inset-1 border-2 border-blue-500 rounded-lg pointer-events-none opacity-50" />
      )}
    </div>
  );
});

CustomNode.displayName = 'CustomNode';