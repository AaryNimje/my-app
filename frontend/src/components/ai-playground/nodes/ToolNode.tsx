import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const ToolNode = memo<NodeProps>(({ data, isConnectable }) => {
  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-cyan-500 rounded-lg p-4 min-w-[200px] shadow-lg">
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        isConnectable={isConnectable}
        className="!bg-cyan-500"
      />
      
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">🔧</span>
        <div className="font-semibold text-gray-900 dark:text-gray-100">
          {data?.label || 'Tool'}
        </div>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <div>Name: {data?.toolName || 'Custom Tool'}</div>
        {data?.toolType && <div>Type: {data.toolType}</div>}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        isConnectable={isConnectable}
        className="!bg-cyan-500"
      />
    </div>
  );
});

ToolNode.displayName = 'ToolNode';

export default ToolNode;