// src/components/workflow/WorkflowCanvas.tsx
import React, { useCallback, useState } from 'react';

// Node and connection types
export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    inputs?: any[];
    outputs?: any[];
    config: Record<string, any>;
  };
}

export interface WorkflowConnection {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

interface WorkflowCanvasProps {
  nodes?: WorkflowNode[];
  connections?: WorkflowConnection[];
  onNodesChange?: (nodes: WorkflowNode[]) => void;
  onConnectionsChange?: (connections: WorkflowConnection[]) => void;
  onNodeSelect?: (nodeId: string | null) => void;
  selectedNodeId?: string | null;
  readonly?: boolean;
}

export function WorkflowCanvas({
  nodes = [],
  connections = [],
  onNodesChange,
  onConnectionsChange,
  onNodeSelect,
  selectedNodeId = null,
  readonly = false
}: WorkflowCanvasProps) {
  // This is a simplified canvas without actual ReactFlow
  // In a real implementation, you would use ReactFlow here
  
  return (
    <div className="w-full h-full bg-gray-50 relative">
      <div className="absolute inset-0 p-4">
        <div className="bg-white rounded-lg border border-gray-200 h-full flex items-center justify-center">
          {nodes.length === 0 ? (
            <div className="text-center text-gray-500">
              <p className="text-lg mb-2">Drag nodes from the palette to start building your workflow</p>
              <p className="text-sm">Or select a template from the top menu</p>
            </div>
          ) : (
            <div className="relative w-full h-full">
              {/* This is where we would render nodes with ReactFlow */}
              {nodes.map(node => (
                <div 
                  key={node.id}
                  className={`absolute p-3 rounded-lg border-2 ${
                    selectedNodeId === node.id ? 'border-blue-500' : 'border-gray-200'
                  } bg-white shadow-sm`}
                  style={{ 
                    left: `${node.position.x}px`, 
                    top: `${node.position.y}px`,
                    width: '180px',
                  }}
                  onClick={() => onNodeSelect && onNodeSelect(node.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-lg">
                      {node.type === 'file-input' ? '📄' : 
                       node.type === 'llm-model' ? '🧠' : 
                       node.type === 'ai-agent' ? '🤖' : 
                       node.type === 'google-sheets' ? '📊' : 
                       node.type === 'if-condition' ? '🔀' : '📤'}
                    </div>
                    <div className="font-medium">{node.data.label}</div>
                  </div>
                  <div className="text-xs text-gray-500">{node.data.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}