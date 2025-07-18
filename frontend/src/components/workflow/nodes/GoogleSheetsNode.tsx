// src/components/workflow/nodes/GoogleSheetsNode.tsx
import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { BaseNode } from './BaseNode';
import { NODE_TYPES } from '../NodePalette';

export const GoogleSheetsNode = memo((props: NodeProps) => {
  const nodeInfo = NODE_TYPES['googleSheets'];
  
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

GoogleSheetsNode.displayName = 'GoogleSheetsNode';