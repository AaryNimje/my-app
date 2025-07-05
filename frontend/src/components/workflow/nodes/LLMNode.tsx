// src/components/workflow/nodes/LLMNode.tsx
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const LLMNode = memo<NodeProps>(({ data, isConnectable }) => {
  const modelIcons: { [key: string]: string } = {
    'gpt-3.5-turbo': '🤖',
    'gpt-4': '🧠',
    'claude-3': '🎭',
    'gemini-pro': '💎',
  };

  const modelName = data?.model || 'gpt-4';
  const icon = modelIcons[modelName] || '🧠';

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-purple-500 rounded-lg p-4 min-w-[200px] shadow-lg">
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        isConnectable={isConnectable}
        className="!bg-purple-500"
      />
      
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <div className="font-semibold text-gray-900 dark:text-gray-100">
          {data?.label || 'LLM Model'}
        </div>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <div>Model: {modelName}</div>
        <div>Temp: {data?.temperature || 0.7}</div>
        {data?.maxTokens && <div>Max Tokens: {data.maxTokens}</div>}
        <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-xs">
          📝 Uses centralized workflow settings
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        isConnectable={isConnectable}
        className="!bg-purple-500"
      />
    </div>
  );
});

LLMNode.displayName = 'LLMNode';

export default LLMNode;