// src/components/workflow/nodes/OutputNode.tsx
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Download, Settings, FileText, Database, Share2 } from 'lucide-react';

interface OutputNodeData {
  label?: string;
  outputType?: string;
  format?: string;
  destination?: string;
}

interface OutputNodeProps extends NodeProps {
  data: OutputNodeData;
}

export const OutputNode = memo(({ data, selected }: OutputNodeProps) => {
  const getDestinationIcon = () => {
    switch (data?.destination) {
      case 'ui-playground':
        return '🎮';
      case 'llm-playground':
        return '💬';
      case 'file-download':
        return '💾';
      default:
        return '📤';
    }
  };

  const getFormatIcon = () => {
    switch (data?.format) {
      case 'json':
        return <Database className="w-4 h-4 text-blue-500" />;
      case 'csv':
        return <FileText className="w-4 h-4 text-green-500" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className={`
      bg-white dark:bg-gray-800 border-2 rounded-lg shadow-sm min-w-[200px] max-w-[280px]
      ${selected ? 'border-orange-500 shadow-lg' : 'border-gray-200 dark:border-gray-700'}
      transition-all duration-200
    `}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-orange-500 border-2 border-white"
      />

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Download className="w-5 h-5 text-orange-500" />
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {data.label || 'Output'}
            </span>
          </div>
          <Settings className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl">{getDestinationIcon()}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {data?.outputType || 'File'}
            </span>
          </div>
          
          <div className="space-y-2">
            {data?.format && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Format:</span>
                <div className="flex items-center space-x-1">
                  {getFormatIcon()}
                  <span className="text-gray-700 dark:text-gray-300">{data.format.toUpperCase()}</span>
                </div>
              </div>
            )}
            
            {data?.destination && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Destination:</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {data.destination.replace('-', ' ')}
                </span>
              </div>
            )}
          </div>

          <div className="text-xs text-gray-600 dark:text-gray-300 bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
            📋 Will use centralized workflow output settings
          </div>
        </div>
      </div>
    </div>
  );
});

OutputNode.displayName = 'OutputNode';

// Export as default to match import pattern
export default OutputNode;