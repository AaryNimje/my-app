// src/components/workflow/nodes/FileInputNode.tsx
import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const FileInputNode = memo<NodeProps>(({ data, isConnectable }) => {
  const [inputMode, setInputMode] = useState<'upload' | 'project-knowledge'>(
    data?.inputMode || 'upload'
  );
  const [fileCount, setFileCount] = useState(data?.fileCount || 0);

  const getModeIcon = () => {
    switch (inputMode) {
      case 'project-knowledge':
        return '📁';
      default:
        return '📤';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-blue-500 rounded-lg p-4 min-w-[200px] shadow-lg">
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        isConnectable={isConnectable}
        className="!bg-blue-500"
      />
      
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{getModeIcon()}</span>
        <div className="font-semibold text-gray-900 dark:text-gray-100">
          {data?.label || 'File Input'}
        </div>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <div>Mode: {inputMode === 'project-knowledge' ? 'Knowledge Base' : 'Upload'}</div>
        <div>Files: {fileCount}</div>
        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
          📋 Enhanced file management with project knowledge integration
        </div>
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