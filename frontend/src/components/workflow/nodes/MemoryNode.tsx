// src/components/workflow/nodes/MemoryNode.tsx
import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { BaseNode } from './BaseNode';
import { NODE_TYPES } from '../NodePalette';

export const MemoryNode = memo((props: NodeProps) => {
  const nodeInfo = NODE_TYPES['memory'];
  
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

MemoryNode.displayName = 'MemoryNode';