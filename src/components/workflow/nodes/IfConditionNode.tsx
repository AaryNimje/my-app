// src/components/workflow/nodes/IfConditionNode.tsx
import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { BaseNode } from './BaseNode';
import { NODE_TYPES } from '../NodePalette';

export const IfConditionNode = memo((props: NodeProps) => {
  const nodeInfo = NODE_TYPES['ifCondition'];
  
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

IfConditionNode.displayName = 'IfConditionNode';