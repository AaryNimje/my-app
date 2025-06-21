import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const FileInputNode = memo<NodeProps>(({ data, isConnectable }) => {
  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-blue-500 rounded-lg p-4 min-w-[200px] shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">📁</span>
        <div className="font-semibold text-gray-900 dark:text-gray-100">
          {data?.label || 'File Input'}
        </div>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {data?.fileName ? (
          <div className="flex items-center gap-1">
            <span>File:</span>
            <span className="font-medium">{data.fileName}</span>
          </div>
        ) : (
          'No file selected'
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        isConnectable={isConnectable}
        className="!bg-blue-500"
      />
    </div>
  );
});

FileInputNode.displayName = 'FileInputNode';

export default FileInputNode;