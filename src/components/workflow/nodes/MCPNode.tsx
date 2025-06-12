// src/components/workflow/nodes/MCPNode.tsx
import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { BaseNode } from './BaseNode';
import { NODE_TYPES } from '../NodePalette';

export const MCPNode = memo((props: NodeProps) => {
  const nodeInfo = NODE_TYPES['mcp'];
  
  return (
    <BaseNode
      {...props}
      data={{
        ...props.data,
        icon: nodeInfo.icon,
        color: nodeInfo.color,
        inputs: nodeInfo.inputs,
        outputs: nodeInfo.outputs
      }}
    />
  );
});

MCPNode.displayName = 'MCPNode';