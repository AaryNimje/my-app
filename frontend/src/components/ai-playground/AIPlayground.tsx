'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  Panel,
  ReactFlowProvider,
  ReactFlowInstance,
  NodeTypes,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { workflowsApi } from '@/lib/api';
import { toast } from 'react-hot-toast';

// Import custom nodes
import FileInputNode from './nodes/FileInputNode';
import LLMNode from './nodes/LLMNode';
import AgentNode from './nodes/AgentNode';
import OutputNode from './nodes/OutputNode';
import ConditionNode from './nodes/ConditionNode';
import ToolNode from './nodes/ToolNode';

// Type definitions
interface NodeData {
  label: string;
  [key: string]: any;
}

type CustomNode = Node<NodeData>;

const nodeTypes: NodeTypes = {
  fileInput: FileInputNode,
  llm: LLMNode,
  agent: AgentNode,
  output: OutputNode,
  condition: ConditionNode,
  tool: ToolNode,
};

const initialNodes: CustomNode[] = [
  {
    id: '1',
    type: 'fileInput',
    position: { x: 100, y: 100 },
    data: { label: 'File Input' },
  },
];

interface AIPlaygroundProps {
  workflowId?: string;
  readonly?: boolean;
}

function AIPlaygroundContent({ workflowId, readonly = false }: AIPlaygroundProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<CustomNode | null>(null);
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (workflowId) {
      loadWorkflow(workflowId);
    }
  }, [workflowId]);

  const loadWorkflow = async (id: string) => {
    try {
      const response = await workflowsApi.get(id);
      
      if (response && response.success && response.workflow) {
        const workflow = response.workflow;
        setWorkflowName(workflow.name);
        
        if (workflow.canvas_state) {
          setNodes(workflow.canvas_state.nodes || []);
          setEdges(workflow.canvas_state.edges || []);
        }
      }
    } catch (error) {
      toast.error('Failed to load workflow');
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      if (readonly || !params.source || !params.target) return;
      
      setEdges((eds) => addEdge({
        ...params,
        id: `${params.source}-${params.target}`,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
      }, eds));
    },
    [setEdges, readonly]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (readonly || !reactFlowInstance) return;

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: CustomNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: `${type} node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, readonly]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: CustomNode) => {
    setSelectedNode(node);
  }, []);

  const saveWorkflow = async () => {
    setIsSaving(true);
    try {
      const workflowData = {
        name: workflowName,
        canvas_state: {
          nodes,
          edges,
        },
        is_active: true,
      };

      let response: any;
      if (workflowId) {
        response = await workflowsApi.update(workflowId, workflowData);
      } else {
        response = await workflowsApi.create(workflowData);
      }

      if (response?.success) {
        toast.success('Workflow saved successfully');
      }
    } catch (error) {
      toast.error('Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  const executeWorkflow = async () => {
    if (!workflowId) {
      toast.error('Please save the workflow first');
      return;
    }

    setIsExecuting(true);
    try {
      const response = await workflowsApi.execute(workflowId);
      
      if (response && response.success) {
        toast.success('Workflow execution started');
      }
    } catch (error) {
      toast.error('Failed to execute workflow');
    } finally {
      setIsExecuting(false);
    }
  };

  const exportWorkflow = () => {
    const data = {
      name: workflowName,
      nodes,
      edges,
      version: '1.0',
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowName.replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importWorkflow = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setWorkflowName(data.name || 'Imported Workflow');
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        toast.success('Workflow imported successfully');
      } catch (error) {
        toast.error('Failed to import workflow');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex h-full">
      {/* Node Palette */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold mb-4">Components</h3>
        <div className="space-y-2">
          <NodePaletteItem type="fileInput" label="File Input" icon="📁" />
          <NodePaletteItem type="agent" label="AI Agent" icon="🤖" />
          <NodePaletteItem type="llm" label="LLM Model" icon="🧠" />
          <NodePaletteItem type="tool" label="Tool" icon="🔧" />
          <NodePaletteItem type="condition" label="Condition" icon="🔀" />
          <NodePaletteItem type="output" label="Output" icon="💾" />
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background color="#aaa" gap={16} />
          <Controls />
          <MiniMap />
          
          <Panel position="top-center" className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="px-3 py-1 border rounded"
                placeholder="Workflow Name"
                disabled={readonly}
              />
              {!readonly && (
                <>
                  <Button onClick={saveWorkflow} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button onClick={executeWorkflow} disabled={isExecuting}>
                    {isExecuting ? 'Executing...' : 'Execute'}
                  </Button>
                  <Button onClick={exportWorkflow} variant="outline">
                    Export
                  </Button>
                  <label className="cursor-pointer">
                    <Button variant="outline" className="pointer-events-none">
                      Import
                    </Button>
                    <input
                      type="file"
                      accept=".json"
                      onChange={importWorkflow}
                      className="hidden"
                    />
                  </label>
                </>
              )}
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Properties Panel */}
      <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold mb-4">Properties</h3>
        {selectedNode ? (
          <NodeProperties 
            node={selectedNode} 
            onChange={(data) => {
              setNodes((nds) =>
                nds.map((node) =>
                  node.id === selectedNode.id
                    ? { ...node, data }
                    : node
                )
              );
            }} 
          />
        ) : (
          <p className="text-gray-500">Select a node to view properties</p>
        )}
      </div>
    </div>
  );
}

// Node Palette Item Component
function NodePaletteItem({ type, label, icon }: { type: string; label: string; icon: string }) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-move hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
      onDragStart={onDragStart}
      draggable
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
    </div>
  );
}

// Node Properties Component
function NodeProperties({ node, onChange }: { node: CustomNode; onChange: (data: NodeData) => void }) {
  const [nodeData, setNodeData] = useState<NodeData>(node.data);

  useEffect(() => {
    setNodeData(node.data);
  }, [node]);

  const handleChange = (key: string, value: any) => {
    const newData = { ...nodeData, [key]: value };
    setNodeData(newData);
    onChange(newData);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Node ID</label>
        <input
          type="text"
          value={node.id}
          className="w-full px-3 py-1 bg-gray-100 rounded"
          disabled
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Label</label>
        <input
          type="text"
          value={String(nodeData.label || '')}
          onChange={(e) => handleChange('label', e.target.value)}
          className="w-full px-3 py-1 border rounded"
        />
      </div>

      {/* Add node-specific properties based on type */}
      {node.type === 'llm' && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">Model</label>
            <select
              value={String(nodeData.model || 'gpt-3.5-turbo')}
              onChange={(e) => handleChange('model', e.target.value)}
              className="w-full px-3 py-1 border rounded"
            >
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="gpt-4">GPT-4</option>
              <option value="claude-3">Claude 3</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Temperature</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={Number(nodeData.temperature || 0.7)}
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
              className="w-full"
            />
            <span className="text-sm text-gray-500">{nodeData.temperature || 0.7}</span>
          </div>
        </>
      )}
    </div>
  );
}

// Main component with provider
export default function AIPlayground(props: AIPlaygroundProps) {
  return (
    <ReactFlowProvider>
      <AIPlaygroundContent {...props} />
    </ReactFlowProvider>
  );
}