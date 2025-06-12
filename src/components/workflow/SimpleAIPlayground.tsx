'use client';

import React, { useState, useRef, useEffect } from 'react';
import { NodePalette } from './NodePalette';
import { Button } from '@/components/ui/button';
import { ClientPropertyPanel } from './ClientPropertyPanel';
import { NODE_TYPES } from './NodePalette';

// Generate a unique ID
function generateId(): string {
  return `node_${Math.random().toString(36).substr(2, 9)}`;
}

interface SimpleNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    config: Record<string, any>;
  };
}

interface SimpleConnection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface SimpleAIPlaygroundProps {
  onSave?: (workflow: { nodes: SimpleNode[]; connections: SimpleConnection[] }) => void;
  onExecute?: (workflow: { nodes: SimpleNode[]; connections: SimpleConnection[] }) => Promise<void>;
  readonly?: boolean;
}

export function SimpleAIPlayground({ onSave, onExecute, readonly = false }: SimpleAIPlaygroundProps) {
  const [nodes, setNodes] = useState<SimpleNode[]>([]);
  const [connections, setConnections] = useState<SimpleConnection[]>([]);
  const [selectedNode, setSelectedNode] = useState<SimpleNode | null>(null);
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const [executing, setExecuting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Handle adding a node from the palette
  const handleAddNode = (nodeType: string) => {
    const nodeTypeInfo = NODE_TYPES[nodeType];
    if (!nodeTypeInfo) return;
    
    // Add the node at a random position in the canvas
    const newNode: SimpleNode = {
      id: generateId(),
      type: nodeType,
      position: { 
        x: 100 + Math.random() * 300, 
        y: 100 + Math.random() * 200 
      },
      data: {
        label: nodeTypeInfo.name,
        description: nodeTypeInfo.description,
        config: {}
      }
    };
    
    setNodes([...nodes, newNode]);
    setSelectedNode(newNode);
  };

  // Handle node selection
  const handleNodeClick = (node: SimpleNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(node);
  };

  // Handle canvas click (deselect nodes)
  const handleCanvasClick = () => {
    setSelectedNode(null);
  };

  // Handle node updates from the property panel
  useEffect(() => {
    const handleNodeDataUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { nodeId, data } = customEvent.detail;
      
      setNodes(prevNodes => 
        prevNodes.map(node => 
          node.id === nodeId 
            ? { ...node, data: { ...node.data, ...data } } 
            : node
        )
      );
      
      // Update the selected node if it's the one being modified
      setSelectedNode(prev => {
        if (prev && prev.id === nodeId) {
          return { ...prev, data: { ...prev.data, ...data } };
        }
        return prev;
      });
    };
    
    window.addEventListener('nodedataupdate', handleNodeDataUpdate);
    
    return () => {
      window.removeEventListener('nodedataupdate', handleNodeDataUpdate);
    };
  }, []);
  
  // Handle node drag events
  const handleNodeDragStart = (nodeId: string, e: React.DragEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDraggedNodeId(nodeId);
    
    // Set node as selected when starting to drag
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
    }
    
    // Store the mouse offset from the node's top-left corner
    const nodeElement = e.currentTarget as HTMLElement;
    const rect = nodeElement.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    e.dataTransfer.setData('application/node', nodeId);
    e.dataTransfer.setData('offset-x', offsetX.toString());
    e.dataTransfer.setData('offset-y', offsetY.toString());
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleNodeDrag = (e: React.DragEvent) => {
    if (isDragging && draggedNodeId && canvasRef.current) {
      e.preventDefault();
    }
  };
  
  const handleNodeDragEnd = () => {
    setIsDragging(false);
    setDraggedNodeId(null);
  };
  
  // Handle canvas drag events for both adding new nodes and moving existing ones
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!canvasRef.current) return;
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const nodeId = e.dataTransfer.getData('application/node');
    const nodeType = e.dataTransfer.getData('application/nodetype');
    
    // Check if we're dropping an existing node (moving it)
    if (nodeId) {
      const offsetX = parseInt(e.dataTransfer.getData('offset-x') || '0');
      const offsetY = parseInt(e.dataTransfer.getData('offset-y') || '0');
      
      // Calculate new position
      const newX = e.clientX - canvasRect.left - offsetX;
      const newY = e.clientY - canvasRect.top - offsetY;
      
      // Update the node's position
      setNodes(prevNodes => 
        prevNodes.map(node => 
          node.id === nodeId 
            ? { ...node, position: { x: newX, y: newY } } 
            : node
        )
      );
    } 
    // Check if we're dropping a new node from the palette
    else if (nodeType) {
      const nodeTypeInfo = NODE_TYPES[nodeType];
      if (!nodeTypeInfo) return;
      
      // Create a new node at the drop position
      const newNode: SimpleNode = {
        id: generateId(),
        type: nodeType,
        position: {
          x: e.clientX - canvasRect.left,
          y: e.clientY - canvasRect.top,
        },
        data: {
          label: nodeTypeInfo.name,
          description: nodeTypeInfo.description,
          config: {}
        }
      };
      
      setNodes(prev => [...prev, newNode]);
      setSelectedNode(newNode);
    }
  };
  
  // Handle connecting nodes
  const [connectingFrom, setConnectingFrom] = useState<{
    nodeId: string;
    handleId: string;
    isOutput: boolean;
  } | null>(null);
  
  const handleStartConnection = (
    nodeId: string, 
    handleId: string, 
    isOutput: boolean, 
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (isOutput) {
      setConnectingFrom({ nodeId, handleId, isOutput });
    }
  };
  
  const handleEndConnection = (
    nodeId: string, 
    handleId: string, 
    isOutput: boolean, 
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    
    if (connectingFrom && !isOutput && connectingFrom.isOutput) {
      // We're connecting from an output to an input
      const newConnection: SimpleConnection = {
        id: generateId(),
        source: connectingFrom.nodeId,
        sourceHandle: connectingFrom.handleId,
        target: nodeId,
        targetHandle: handleId
      };
      
      setConnections(prev => [...prev, newConnection]);
    }
    
    setConnectingFrom(null);
  };
  
  // Save the workflow
  const handleSave = () => {
    if (onSave) {
      onSave({ nodes, connections });
    }
    alert('Workflow saved');
  };

  // Execute the workflow
  const handleExecute = async () => {
    if (!onExecute) return;
    
    setExecuting(true);
    try {
      await onExecute({ nodes, connections });
      alert('Workflow executed successfully');
    } catch (error) {
      alert(`Error executing workflow: ${error}`);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="flex h-full bg-background text-foreground">
      {/* Node Palette */}
      <NodePalette onAddNode={handleAddNode} />

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="bg-card border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary px-1 py-0.5 rounded"
              />
              <div className="text-sm text-muted-foreground">Drag & drop components to build your workflow</div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={readonly}
              >
                Save
              </Button>
              <Button
                onClick={handleExecute}
                disabled={executing || nodes.length === 0}
              >
                {executing ? 'Executing...' : 'Execute Workflow'}
              </Button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div 
          ref={canvasRef}
          className="flex-1 bg-gray-100 dark:bg-gray-900 relative overflow-hidden"
          onClick={handleCanvasClick}
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
        >
          {nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-lg mb-2">Drag nodes from the palette to start building your workflow</p>
                <p className="text-sm">Or click on a node in the palette to add it</p>
              </div>
            </div>
          ) : (
            <>
              {/* Draw connections */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {connections.map(connection => {
                  // Find source and target nodes
                  const sourceNode = nodes.find(n => n.id === connection.source);
                  const targetNode = nodes.find(n => n.id === connection.target);
                  
                  if (!sourceNode || !targetNode) return null;
                  
                  // Calculate source and target positions (center of the node for simplicity)
                  const sourceX = sourceNode.position.x + 90; // Half node width
                  const sourceY = sourceNode.position.y + 30; // Half node height
                  const targetX = targetNode.position.x;
                  const targetY = targetNode.position.y + 30; // Half node height
                  
                  // Draw a bezier curve
                  const path = `M ${sourceX} ${sourceY} C ${sourceX + 50} ${sourceY}, ${targetX - 50} ${targetY}, ${targetX} ${targetY}`;
                  
                  return (
                    <path 
                      key={connection.id}
                      d={path}
                      stroke="#94a3b8"
                      strokeWidth={2}
                      fill="none"
                      className="animate-pulse"
                    />
                  );
                })}
              </svg>
              
              {/* Draw nodes */}
              {nodes.map(node => {
                const nodeTypeInfo = NODE_TYPES[node.type];
                if (!nodeTypeInfo) return null;
                
                return (
                  <div
                    key={node.id}
                    className={`absolute p-3 rounded-md shadow-md border-2 ${
                      selectedNode?.id === node.id ? 'border-primary' : 'border-border'
                    } bg-card cursor-move`}
                    style={{
                      left: `${node.position.x}px`,
                      top: `${node.position.y}px`,
                      width: '180px',
                    }}
                    onClick={(e) => handleNodeClick(node, e)}
                    draggable
                    onDragStart={(e) => handleNodeDragStart(node.id, e)}
                    onDrag={handleNodeDrag}
                    onDragEnd={handleNodeDragEnd}
                  >
                    <div className="flex items-center mb-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center mr-2" style={{ backgroundColor: `${nodeTypeInfo.color}20` }}>
                        <span className="text-sm">{nodeTypeInfo.icon}</span>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="font-medium text-sm truncate">{node.data.label}</div>
                      </div>
                    </div>
                    
                    {node.data.description && (
                      <div className="text-xs text-muted-foreground mb-2 truncate">
                        {node.data.description}
                      </div>
                    )}
                    
                    {/* Input Handles */}
                    {nodeTypeInfo.inputs?.map((input: any) => (
                      <div 
                        key={`${node.id}-input-${input.id}`}
                        className="absolute w-3 h-3 rounded-full bg-blue-500 cursor-crosshair"
                        style={{ 
                          left: input.position === 'left' ? '-6px' : 'auto',
                          right: input.position === 'right' ? '-6px' : 'auto',
                          top: input.position === 'top' ? '-6px' : (input.position === 'left' || input.position === 'right') ? '50%' : 'auto',
                          bottom: input.position === 'bottom' ? '-6px' : 'auto',
                          transform: (input.position === 'left' || input.position === 'right') ? 'translateY(-50%)' : 'none'
                        }}
                        onClick={(e) => handleEndConnection(node.id, input.id, false, e)}
                      />
                    ))}
                    
                    {/* Output Handles */}
                    {nodeTypeInfo.outputs?.map((output: any) => (
                      <div 
                        key={`${node.id}-output-${output.id}`}
                        className="absolute w-3 h-3 rounded-full bg-green-500 cursor-crosshair"
                        style={{ 
                          left: output.position === 'left' ? '-6px' : 'auto',
                          right: output.position === 'right' ? '-6px' : 'auto',
                          top: output.position === 'top' ? '-6px' : (output.position === 'left' || output.position === 'right') ? '50%' : 'auto',
                          bottom: output.position === 'bottom' ? '-6px' : 'auto',
                          transform: (output.position === 'left' || output.position === 'right') ? 'translateY(-50%)' : 'none'
                        }}
                        onClick={(e) => handleStartConnection(node.id, output.id, true, e)}
                      />
                    ))}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Node Properties Panel */}
      <ClientPropertyPanel selectedNode={selectedNode} />
    </div>
  );
}