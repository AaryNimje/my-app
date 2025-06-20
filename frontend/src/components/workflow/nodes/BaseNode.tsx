// src/components/workflow/nodes/BaseNode.tsx
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface BaseNodeProps extends NodeProps {
  data: {
    label: string;
    description?: string;
    icon: string;
    color: string;
    inputs?: {
      id: string;
      type: string;
      position: string;
      label: string;
    }[];
    outputs?: {
      id: string;
      type: string;
      position: string;
      label: string;
    }[];
    config: Record<string, any>;
  };
}

export const BaseNode = memo(({ id, data, selected }: BaseNodeProps) => {
  const getHandlePosition = (positionStr: string): Position => {
    switch (positionStr) {
      case 'left': return Position.Left;
      case 'right': return Position.Right;
      case 'top': return Position.Top;
      case 'bottom': return Position.Bottom;
      default: return Position.Left;
    }
  };

  return (
    <div 
      className={`px-4 py-2 rounded-md shadow-md border-2 ${
        selected ? 'border-primary' : 'border-border'
      } bg-card min-w-[150px]`}
    >
      {/* Input Handles */}
      {data.inputs?.map((input) => (
        <Handle
          key={input.id}
          type="target"
          position={getHandlePosition(input.position)}
          id={input.id}
          className="w-3 h-3 bg-primary"
          style={{ 
            [input.position]: -6,
            top: input.position === 'left' || input.position === 'right' 
              ? '50%' 
              : undefined,
            left: input.position === 'top' || input.position === 'bottom' 
              ? '50%' 
              : undefined
          }}
        />
      ))}
      
      {/* Header */}
      <div className="flex items-center mb-2">
        <div 
          className="w-6 h-6 rounded-full flex items-center justify-center mr-2" 
          style={{ backgroundColor: `${data.color}20` }}
        >
          <span className="text-sm">{data.icon}</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="font-medium text-sm truncate">{data.label}</div>
        </div>
      </div>
      
      {/* Description */}
      {data.description && (
        <div className="text-xs text-muted-foreground mb-2 truncate">
          {data.description}
        </div>
      )}
      
      {/* Output Handles */}
      {data.outputs?.map((output) => (
        <Handle
          key={output.id}
          type="source"
          position={getHandlePosition(output.position)}
          id={output.id}
          className="w-3 h-3 bg-primary"
          style={{ 
            [output.position]: -6,
            top: output.position === 'left' || output.position === 'right' 
              ? '50%' 
              : undefined,
            left: output.position === 'top' || output.position === 'bottom' 
              ? '50%' 
              : undefined
          }}
        />
      ))}
    </div>
  );
});

BaseNode.displayName = 'BaseNode';