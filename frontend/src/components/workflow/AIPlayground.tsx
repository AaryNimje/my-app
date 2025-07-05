// src/components/workflow/AIPlayground.tsx
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
// import { Button } from '@/components/ui/button';
import { 
  Save, 
  Play, 
  Settings, 
  Upload, 
  Download, 
  Share2, 
  Copy,
  Folder,
  Plus,
  MoreHorizontal,
  History,
  Eye,
  X
} from 'lucide-react';
// import { workflowsApi } from '@/lib/api';
// import { toast } from 'react-hot-toast';

// Mock implementations with proper types
interface MockWorkflow {
  id: string;
  name: string;
  properties?: Partial<WorkflowProperties>;
  canvas_state?: {
    nodes: CustomNode[];
    edges: Edge[];
  };
}

interface MockApiResponse {
  success: boolean;
  workflow?: MockWorkflow;
  results?: any;
}

const workflowsApi = {
  get: async (id: string): Promise<MockApiResponse> => ({ 
    success: true, 
    workflow: {
      id,
      name: 'Mock Workflow',
      properties: {
        metadata: {
          name: 'Mock Workflow',
          description: 'A mock workflow for testing',
          category: 'general',
          tags: [],
          version: '1.0.0',
          isPublic: false
        }
      },
      canvas_state: {
        nodes: [],
        edges: []
      }
    }
  }),
  create: async (data: any): Promise<MockApiResponse> => ({ success: true, workflow: { id: 'new-id', name: data.name } }),
  update: async (id: string, data: any): Promise<MockApiResponse> => ({ success: true, workflow: { id, name: data.name } }),
  execute: async (id: string, data: any): Promise<MockApiResponse> => ({ success: true, results: "Mock execution result" })
};

const toast = {
  success: (message: string) => console.log('✅ Success:', message),
  error: (message: string) => console.error('❌ Error:', message)
};

// Import enhanced components
import FileInputNode from './nodes/FileInputNode';

// Mock the complex components for now with proper types
interface WorkflowPropertiesPanelProps {
  isOpen: boolean;
  onCloseAction: () => void;
  properties: any;
  onSaveAction: (properties: any) => void;
  onPropertiesChangeAction?: (properties: any) => void;
}

const WorkflowPropertiesPanel: React.FC<WorkflowPropertiesPanelProps> = ({ 
  isOpen, 
  onCloseAction, 
  properties, 
  onSaveAction 
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg">
        <h2>Workflow Properties (Mock)</h2>
        <button onClick={onCloseAction} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">Close</button>
        <button onClick={() => onSaveAction(properties)} className="mt-4 ml-2 px-4 py-2 bg-green-500 text-white rounded">Save</button>
      </div>
    </div>
  );
};

interface ProjectKnowledgePanelProps {
  mode: string;
  onClose: () => void;
}

const ProjectKnowledgePanel: React.FC<ProjectKnowledgePanelProps> = ({ onClose }) => (
  <div className="p-4">
    <h3>Project Knowledge Panel (Mock)</h3>
    <button onClick={onClose} className="mt-2 px-4 py-2 bg-gray-500 text-white rounded">Close</button>
  </div>
);

// Import simple node components for Phase 1
import LLMNode from './nodes/LLMNode';
import OutputNode from './nodes/OutputNode';

// Type definitions
interface NodeData {
  label: string;
  [key: string]: any;
}

type CustomNode = Node<NodeData>;

interface WorkflowProperties {
  agent: {
    name: string;
    description: string;
    type: 'assistant' | 'analyzer' | 'generator' | 'processor' | 'custom';
    personality?: string;
    instructions?: string;
  };
  llm: {
    provider: 'openai' | 'anthropic' | 'google' | 'groq' | 'ollama';
    model: string;
    temperature: number;
    maxTokens: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    systemPrompt: string;
  };
  output: {
    destination: 'ui-playground' | 'llm-playground' | 'file-download' | 'multiple';
    defaultFormat: 'text' | 'json' | 'markdown' | 'csv' | 'xlsx' | 'pdf';
    autoSave?: boolean;
    fileName?: string;
  };
  metadata: {
    name: string;
    description: string;
    category: string;
    tags: string[];
    version: string;
    isPublic: boolean;
  };
}

const nodeTypes: NodeTypes = {
  fileInput: FileInputNode,
  llm: LLMNode,
  output: OutputNode,
};

const initialNodes: CustomNode[] = [
  {
    id: '1',
    type: 'fileInput',
    position: { x: 100, y: 100 },
    data: { 
      label: 'File Input',
      inputMode: 'both',
      allowedTypes: ['.pdf', '.docx', '.xlsx', '.csv', '.txt'],
      maxFiles: 5
    },
  },
];

interface AIPlaygroundProps {
  workflowId?: string;
  readonly?: boolean;
}

function AIPlaygroundContent({ workflowId, readonly = false }: AIPlaygroundProps) {
  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<CustomNode | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  
  // Workflow state
  const [workflowProperties, setWorkflowProperties] = useState<Partial<WorkflowProperties>>({
    metadata: {
      name: 'New Workflow',
      description: '',
      category: 'general',
      tags: [],
      version: '1.0.0',
      isPublic: false
    },
    agent: {
      name: 'Academic Assistant',
      description: 'An intelligent agent for academic tasks',
      type: 'assistant',
      instructions: 'You are a helpful academic assistant.'
    },
    llm: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2048,
      systemPrompt: 'You are a helpful academic assistant.'
    },
    output: {
      destination: 'ui-playground',
      defaultFormat: 'text',
      autoSave: false
    }
  });
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [showKnowledgePanel, setShowKnowledgePanel] = useState(false);
  const [showNodePalette, setShowNodePalette] = useState(true);
  const [executionResults, setExecutionResults] = useState<any>(null);
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Load workflow if ID provided
  useEffect(() => {
    if (workflowId) {
      loadWorkflow(workflowId);
    }
  }, [workflowId]);

  const loadWorkflow = async (id: string) => {
    try {
      const response = await workflowsApi.get(id);
      
      if (response?.success && response.workflow) {
        const workflow = response.workflow;
        
        // Load workflow properties
        if (workflow.properties) {
          setWorkflowProperties(workflow.properties);
        }
        
        // Load canvas state
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
      setEdges((eds) => addEdge(params, eds));
    },
    [readonly]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowInstance || readonly) return;

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
        data: { 
          label: type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1'),
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, readonly, setNodes]
  );

  // Save workflow
  const handleSave = async () => {
    if (readonly) return;
    
    setIsSaving(true);
    try {
      const workflowData = {
        name: workflowProperties.metadata?.name || 'Untitled Workflow',
        description: workflowProperties.metadata?.description || '',
        category: workflowProperties.metadata?.category || 'general',
        tags: workflowProperties.metadata?.tags || [],
        canvas_state: {
          nodes,
          edges,
        },
        properties: workflowProperties,
        is_public: workflowProperties.metadata?.isPublic || false
      };

      let response: MockApiResponse;
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

  // Execute workflow
  const handleExecute = async () => {
    if (readonly) return;
    
    setIsExecuting(true);
    try {
      // First save the workflow
      await handleSave();
      
      // Then execute it
      const executionData = {
        canvas_state: { nodes, edges },
        properties: workflowProperties
      };

      const response = await workflowsApi.execute(workflowId || 'temp', executionData);
      
      if (response?.success) {
        setExecutionResults(response.results);
        toast.success('Workflow executed successfully');
        
        // Handle output based on configuration
        if (workflowProperties.output?.destination === 'llm-playground') {
          // Redirect to LLM Playground with results
          window.open('/dashboard/llm-playground', '_blank');
        } else if (workflowProperties.output?.destination === 'file-download') {
          // Trigger file download
          triggerFileDownload(response.results);
        }
      }
    } catch (error) {
      toast.error('Failed to execute workflow');
    } finally {
      setIsExecuting(false);
    }
  };

  // Trigger file download
  const triggerFileDownload = (results: any) => {
    const format = workflowProperties.output?.defaultFormat || 'text';
    const fileName = workflowProperties.output?.fileName || 'workflow_output';
    
    let content = '';
    let mimeType = '';
    let fileExtension = '';
    
    switch (format) {
      case 'json':
        content = JSON.stringify(results, null, 2);
        mimeType = 'application/json';
        fileExtension = '.json';
        break;
      case 'csv':
        // Convert results to CSV format
        content = convertToCSV(results);
        mimeType = 'text/csv';
        fileExtension = '.csv';
        break;
      case 'markdown':
        content = convertToMarkdown(results);
        mimeType = 'text/markdown';
        fileExtension = '.md';
        break;
      default:
        content = typeof results === 'string' ? results : JSON.stringify(results);
        mimeType = 'text/plain';
        fileExtension = '.txt';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName + fileExtension;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Helper functions for file conversion
  const convertToCSV = (data: any): string => {
    if (Array.isArray(data)) {
      if (data.length === 0) return '';
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
      ].join('\n');
      return csvContent;
    }
    return JSON.stringify(data);
  };

  const convertToMarkdown = (data: any): string => {
    if (typeof data === 'string') return data;
    return `# Workflow Results\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
  };

  // Node palette items
  const nodeItems = [
    { type: 'fileInput', label: 'File Input', icon: '📁', description: 'Upload or select files' },
    { type: 'llm', label: 'LLM Model', icon: '🧠', description: 'Language model processing' },
    { type: 'output', label: 'Output', icon: '📤', description: 'Output results' },
  ];

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Left Sidebar - Node Palette */}
      {showNodePalette && (
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Node Palette
              </h2>
              <button
                onClick={() => setShowKnowledgePanel(true)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                title="Browse Project Knowledge"
              >
                <Folder size={18} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {nodeItems.map((item) => (
                <div
                  key={item.type}
                  draggable
                  onDragStart={(event) => onDragStart(event, item.type)}
                  className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-grab hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 active:cursor-grabbing"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {item.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {item.description}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced File Browser */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <button
              onClick={() => setShowKnowledgePanel(true)}
              className="w-full flex items-center justify-center space-x-2 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Folder size={20} />
              <span className="text-sm font-medium">Browse Files</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {workflowProperties.metadata?.name || 'AI Playground'}
              </h1>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowNodePalette(!showNodePalette)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  title="Toggle Node Palette"
                >
                  <Plus size={18} />
                </button>
                <button
                  onClick={() => setShowPropertiesPanel(true)}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Settings size={16} />
                  <span className="text-sm">Properties</span>
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {/* Handle import */}}
                className="flex items-center space-x-2 px-3 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Upload size={16} />
                <span className="text-sm">Import</span>
              </button>
              
              <button
                onClick={handleSave}
                disabled={isSaving || readonly}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                <span className="text-sm">{isSaving ? 'Saving...' : 'Save'}</span>
              </button>
              
              <button
                onClick={handleExecute}
                disabled={isExecuting || readonly}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play size={16} />
                <span className="text-sm">{isExecuting ? 'Executing...' : 'Execute'}</span>
              </button>

              <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>

          {/* Workflow Status */}
          {workflowProperties.metadata?.description && (
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {workflowProperties.metadata.description}
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onSelectionChange={({ nodes }) => {
              setSelectedNode(nodes?.[0] || null);
            }}
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-50 dark:bg-gray-900"
          >
            <Controls 
              className="!bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700"
            />
            <MiniMap 
              className="!bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700"
              nodeColor="#3b82f6"
            />
            <Background />
            
            {/* Execution Results Panel */}
            {executionResults && (
              <Panel position="bottom-right" className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-w-md">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    Execution Results
                  </h3>
                  <button
                    onClick={() => setExecutionResults(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 max-h-32 overflow-y-auto">
                  {typeof executionResults === 'string' 
                    ? executionResults 
                    : JSON.stringify(executionResults, null, 2)
                  }
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>

      {/* Right Sidebar - Properties (when node selected) */}
      {selectedNode && (
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Node Properties
            </h2>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Node Label
                </label>
                <input
                  type="text"
                  value={selectedNode.data.label}
                  onChange={(e) => {
                    const newLabel = e.target.value;
                    setNodes(nodes.map(node => 
                      node.id === selectedNode.id 
                        ? { ...node, data: { ...node.data, label: newLabel } }
                        : node
                    ));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <div>Type: {selectedNode.type}</div>
                <div>ID: {selectedNode.id}</div>
                <div>Position: ({selectedNode.position.x}, {selectedNode.position.y})</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Properties Panel */}
      <WorkflowPropertiesPanel
        isOpen={showPropertiesPanel}
        onCloseAction={() => setShowPropertiesPanel(false)}
        properties={workflowProperties}
        onSaveAction={(properties) => {
          setWorkflowProperties(properties);
          setShowPropertiesPanel(false);
          toast.success('Properties updated');
        }}
        onPropertiesChangeAction={setWorkflowProperties}
      />

      {/* Project Knowledge Panel */}
      {showKnowledgePanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
            <ProjectKnowledgePanel
              mode="browse"
              onClose={() => setShowKnowledgePanel(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function AIPlayground(props: AIPlaygroundProps) {
  return (
    <ReactFlowProvider>
      <AIPlaygroundContent {...props} />
    </ReactFlowProvider>
  );
}