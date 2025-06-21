import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const AgentNode = memo<NodeProps>(({ data, isConnectable }) => {
  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-green-500 rounded-lg p-4 min-w-[200px] shadow-lg">
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        isConnectable={isConnectable}
        className="!bg-green-500"
      />
      
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">🤖</span>
        <div className="font-semibold text-gray-900 dark:text-gray-100">
          {data?.label || 'AI Agent'}
        </div>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <div>Type: {data?.agentType || 'General'}</div>
        {data?.tools && Array.isArray(data.tools) && data.tools.length > 0 && (
          <div>Tools: {data.tools.length}</div>
        )}
        {data?.memory && <div>Memory: {data.memory}</div>}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        isConnectable={isConnectable}
        className="!bg-green-500"
      />
    </div>
  );
});

AgentNode.displayName = 'AgentNode';

export default AgentNode;