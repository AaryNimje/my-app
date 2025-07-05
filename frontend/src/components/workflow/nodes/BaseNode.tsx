// src/components/workflow/nodes/BaseNode.tsx
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface BaseNodeData {
  label?: string;
  icon?: string;
  color?: string;
  inputs?: Array<{
    id: string;
    type: 'target';
    position: 'top' | 'right' | 'bottom' | 'left';
    label?: string;
  }>;
  outputs?: Array<{
    id: string;
    type: 'source';
    position: 'top' | 'right' | 'bottom' | 'left';
    label?: string;
  }>;
  [key: string]: any;
}

interface BaseNodeProps extends NodeProps {
  data: BaseNodeData;
}

const getPosition = (pos: string): Position => {
  switch (pos) {
    case 'top': return Position.Top;
    case 'right': return Position.Right;
    case 'bottom': return Position.Bottom;
    case 'left': return Position.Left;
    default: return Position.Right;
  }
};

export const BaseNode = memo(({ data, selected }: BaseNodeProps) => {
  const borderColor = data.color || '#3b82f6';
  
  return (
    <div 
      className={`
        bg-white dark:bg-gray-800 border-2 rounded-lg shadow-sm min-w-[150px] max-w-[250px]
        transition-all duration-200
      `}
      style={{
        borderColor: selected ? borderColor : '#e5e7eb'
      }}
    >
      {/* Input Handles */}
      {data.inputs?.map((input) => (
        <Handle
          key={input.id}
          id={input.id}
          type="target"
          position={getPosition(input.position)}
          className="w-3 h-3 border-2 border-white"
          style={{ backgroundColor: borderColor }}
        />
      ))}

      {/* Default input if none specified */}
      {(!data.inputs || data.inputs.length === 0) && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 border-2 border-white"
          style={{ backgroundColor: borderColor }}
        />
      )}

      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          {data.icon && (
            <span className="text-lg">{data.icon}</span>
          )}
          <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
            {data.label || 'Node'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Basic node component
        </div>
      </div>

      {/* Output Handles */}
      {data.outputs?.map((output) => (
        <Handle
          key={output.id}
          id={output.id}
          type="source"
          position={getPosition(output.position)}
          className="w-3 h-3 border-2 border-white"
          style={{ backgroundColor: borderColor }}
        />
      ))}

      {/* Default output if none specified */}
      {(!data.outputs || data.outputs.length === 0) && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 border-2 border-white"
          style={{ backgroundColor: borderColor }}
        />
      )}
    </div>
  );
});

BaseNode.displayName = 'BaseNode';