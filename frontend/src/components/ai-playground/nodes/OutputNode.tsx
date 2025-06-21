import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CustomNodeProps, OutputNodeData } from './types';

const OutputNode = memo(({ data, isConnectable }: CustomNodeProps<OutputNodeData>) => {
  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-orange-500 rounded-lg p-4 min-w-[200px] shadow-lg">
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        isConnectable={isConnectable}
        className="!bg-orange-500"
      />
      
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">💾</span>
        <div className="font-semibold text-gray-900 dark:text-gray-100">
          {data.label || 'Output'}
        </div>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <div>Type: {data.outputType || 'File'}</div>
        {data.format && <div>Format: {data.format}</div>}
      </div>
    </div>
  );
});

OutputNode.displayName = 'OutputNode';

export default OutputNode;