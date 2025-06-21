import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const ConditionNode = memo<NodeProps>(({ data, isConnectable }) => {
  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-yellow-500 rounded-lg p-4 min-w-[200px] shadow-lg">
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        isConnectable={isConnectable}
        className="!bg-yellow-500"
      />
      
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">🔀</span>
        <div className="font-semibold text-gray-900 dark:text-gray-100">
          {data?.label || 'Condition'}
        </div>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        {data?.condition && <div>If: {data.condition}</div>}
        {data?.operator && <div>Op: {data.operator}</div>}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ top: '30%' }}
        isConnectable={isConnectable}
        className="!bg-green-500"
      />
      
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ top: '70%' }}
        isConnectable={isConnectable}
        className="!bg-red-500"
      />
    </div>
  );
});

ConditionNode.displayName = 'ConditionNode';

export default ConditionNode;