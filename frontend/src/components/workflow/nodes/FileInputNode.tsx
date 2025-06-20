// src/components/workflow/nodes/FileInputNode.tsx
import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { BaseNode } from './BaseNode';
import { NODE_TYPES } from '../NodePalette';

export const FileInputNode = memo((props: NodeProps) => {
  const nodeInfo = NODE_TYPES['fileInput'];
  
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

FileInputNode.displayName = 'FileInputNode';