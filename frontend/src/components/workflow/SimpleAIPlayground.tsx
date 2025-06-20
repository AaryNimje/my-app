// src/components/workflow/SimpleAIPlayground.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { NodePalette } from './NodePalette';
import { Button } from '@/components/ui/button';
import { ClientPropertyPanel } from './ClientPropertyPanel';
import { NODE_DEFINITIONS } from '@/lib/nodes';

// Generate a unique ID
function generateId(): string {
  return `node_${Math.random().toString(36).substring(2, 9)}`;
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
  sourceHandle: string;
  targetHandle: string;
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
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // For drawing the active connection line
  const [activeConnection, setActiveConnection] = useState<{
    sourceId: string;
    sourceHandle: string;
    sourceX: number;
    sourceY: number;
    mouseX: number;
    mouseY: number;
  } | null>(null);

  // Handle mouse move for drawing connection line
  useEffect(() => {
    if (!activeConnection || !canvasRef.current) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      setActiveConnection({
        ...activeConnection,
        mouseX: e.clientX - rect.left,
        mouseY: e.clientY - rect.top
      });

      // Add highlighting to any input handle we're hovering over
      document.querySelectorAll('.input-handle').forEach((element) => {
        const handleRect = element.getBoundingClientRect();
        const isHovering = 
          e.clientX >= handleRect.left &&
          e.clientX <= handleRect.right &&
          e.clientY >= handleRect.top &&
          e.clientY <= handleRect.bottom;

        if (isHovering) {
          element.classList.add('input-handle-hover');
        } else {
          element.classList.remove('input-handle-hover');
        }
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!canvasRef.current) return;

      // Check if we're hovering over an input handle when mouse is released
      const inputHandles = document.querySelectorAll('.input-handle');
      for (const handle of inputHandles) {
        const handleRect = handle.getBoundingClientRect();
        const isHovering = 
          e.clientX >= handleRect.left &&
          e.clientX <= handleRect.right &&
          e.clientY >= handleRect.top &&
          e.clientY <= handleRect.bottom;

        if (isHovering) {
          // Extract the node and handle IDs from the element ID
          const [nodeId, handleId] = (handle as HTMLElement).id.split('-').slice(0, 2);
          
          // Create a new connection
          const newConnection: SimpleConnection = {
            id: generateId(),
            source: activeConnection.sourceId,
            sourceHandle: activeConnection.sourceHandle,
            target: nodeId,
            targetHandle: handleId
          };
          
          console.log("Created new connection:", newConnection);
          setConnections(prev => [...prev, newConnection]);
          break;
        }
      }

      // Remove all hover effects
      document.querySelectorAll('.input-handle-hover').forEach((el) => {
        el.classList.remove('input-handle-hover');
      });
      
      setActiveConnection(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeConnection]);

  // Handle adding a node from the palette
  const handleAddNode = (nodeType: string) => {
    console.log("Adding node:", nodeType);
    if (readonly) return;
    
    const nodeTypeInfo = NODE_DEFINITIONS[nodeType];
    if (!nodeTypeInfo) {
      console.error("Node type not found:", nodeType);
      return;
    }
    
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
    
    console.log("Created new node:", newNode);
    setNodes(prev => [...prev, newNode]);
    setSelectedNode(newNode);
  };

  // Handle canvas click (deselect nodes)
  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only deselect if clicking directly on the canvas (not on a node)
    if (e.target === canvasRef.current) {
      setSelectedNode(null);
    }
  };
  
  // Drag over handler for canvas
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  // Drop handler for canvas
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (readonly) return;
    
    const nodeType = e.dataTransfer.getData('nodeType');
    const nodeId = e.dataTransfer.getData('nodeId');
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    
    if (!canvasRect) return;
    
    // Check if we're moving an existing node
    if (nodeId) {
      const newX = e.clientX - canvasRect.left;
      const newY = e.clientY - canvasRect.top;
      
      setNodes(prev =>
        prev.map(node =>
            node.id === nodeId ?
            { ...node, position: { x: newX, y: newY } } 
            : node
        )
      );
    } 
    // Check if we're dropping a new node from the palette
    else if (nodeType) {
      console.log("Dropping new node:", nodeType);
      const nodeTypeInfo = NODE_DEFINITIONS[nodeType];
      if (!nodeTypeInfo) {
        console.error("Node type not found:", nodeType);
        return;
      }
      
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
      
      console.log("Created new node from drop:", newNode);
      setNodes(prev => [...prev, newNode]);
      setSelectedNode(newNode);
    }
  };
  
  // Handle starting a connection
  const handleStartConnection = (
    nodeId: string, 
    handleId: string, 
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (readonly) return;
    
    // Find the source node
    const sourceNode = nodes.find(node => node.id === nodeId);
    if (!sourceNode) return;
    
    // Get canvas position
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    
    // Calculate the position of the source handle
    const handleElement = document.getElementById(`${nodeId}-${handleId}`);
    if (!handleElement) return;
    
    const handleRect = handleElement.getBoundingClientRect();
    const sourceX = handleRect.left + handleRect.width/2 - canvasRect.left;
    const sourceY = handleRect.top + handleRect.height/2 - canvasRect.top;
    
    // Set the active connection for drawing
    setActiveConnection({
      sourceId: nodeId,
      sourceHandle: handleId,
      sourceX,
      sourceY,
      mouseX: e.clientX - canvasRect.left,
      mouseY: e.clientY - canvasRect.top
    });
  };
  
  // Calculate a bezier curve path for connections
  const calculatePath = (
    startX: number, 
    startY: number, 
    endX: number, 
    endY: number
  ): string => {
    const dx = Math.abs(endX - startX);
    const dy = Math.abs(endY - startY);
    
    // Adjust control points based on the distance between points
    const controlPointOffset = Math.min(dx * 0.5, 150);
    
    // Bezier curve path
    return `M ${startX} ${startY} C ${startX + controlPointOffset} ${startY}, ${endX - controlPointOffset} ${endY}, ${endX} ${endY}`;
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
      console.error("Error executing workflow:", error);
      alert(`Error executing workflow: ${error}`);
    } finally {
      setExecuting(false);
    }
  };

  // Remove a connection
  const handleRemoveConnection = (connectionId: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== connectionId));
  };

  // Add CSS for handle hover effects
  useEffect(() => {
    // Add CSS for handle hover effects
    const style = document.createElement('style');
    style.textContent = `
      .output-handle {
        background-color: #3B82F6; /* Blue */
        width: 12px;
        height: 12px;
        border-radius: 50%;
        cursor: crosshair;
        z-index: 30;
        box-shadow: 0 0 0 2px white;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .output-handle:hover {
        transform: scale(1.5);
        box-shadow: 0 0 0 2px white, 0 0 5px 2px rgba(59, 130, 246, 0.5);
      }
      
      .input-handle {
        background-color: #10B981; /* Green */
        width: 12px;
        height: 12px;
        border-radius: 50%;
        cursor: crosshair;
        z-index: 30;
        box-shadow: 0 0 0 2px white;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .input-handle:hover, .input-handle-hover {
        transform: scale(1.5);
        box-shadow: 0 0 0 2px white, 0 0 5px 2px rgba(16, 185, 129, 0.5);
      }
      
      .workflow-connection:hover {
        stroke-width: 3px;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
                  
                  // Find the source and target handle elements
                  const sourceHandleElement = document.getElementById(`${connection.source}-${connection.sourceHandle}`);
                  const targetHandleElement = document.getElementById(`${connection.target}-${connection.targetHandle}`);
                  
                  if (!sourceHandleElement || !targetHandleElement) return null;
                  
                  const canvasRect = canvasRef.current?.getBoundingClientRect();
                  if (!canvasRect) return null;
                  
                  // Calculate the positions of the handles
                  const sourceHandleRect = sourceHandleElement.getBoundingClientRect();
                  const targetHandleRect = targetHandleElement.getBoundingClientRect();
                  
                  const sourceX = sourceHandleRect.left + sourceHandleRect.width/2 - canvasRect.left;
                  const sourceY = sourceHandleRect.top + sourceHandleRect.height/2 - canvasRect.top;
                  const targetX = targetHandleRect.left + targetHandleRect.width/2 - canvasRect.left;
                  const targetY = targetHandleRect.top + targetHandleRect.height/2 - canvasRect.top;
                  
                  // Draw a bezier curve
                  const path = calculatePath(sourceX, sourceY, targetX, targetY);
                  
                  return (
                    <path 
                      key={connection.id}
                      d={path}
                      stroke="#3B82F6" // Blue color for connections
                      strokeWidth={2}
                      fill="none"
                      className="workflow-connection pointer-events-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveConnection(connection.id);
                      }}
                    />
                  );
                })}
                
                {/* Draw active connection line if dragging */}
                {activeConnection && (
                  <path
                    d={calculatePath(
                      activeConnection.sourceX,
                      activeConnection.sourceY,
                      activeConnection.mouseX,
                      activeConnection.mouseY
                    )}
                    stroke="#3B82F6" // Blue color for active connection
                    strokeWidth={2}
                    strokeDasharray="5,5" // Keep dashed while dragging for visual feedback
                    fill="none"
                    className="workflow-connection"
                  />
                )}
              </svg>
              
              {/* Draw nodes */}
              {nodes.map(node => {
                const nodeTypeInfo = NODE_DEFINITIONS[node.type];
                if (!nodeTypeInfo) return null;
                
                return (
                  <div
                    key={node.id}
                    className={`absolute p-3 rounded-md shadow-md border-2 ${
                      selectedNode?.id === node.id ? 
                      'border-primary' : 'border-border'
                    } bg-card cursor-grab active:cursor-grabbing z-10`}
                    style={{ 
                      left: `${node.position.x}px`, 
                      top: `${node.position.y}px`,
                      width: '180px'
                    }}
                    onClick={(e) => {
                      // Don't select the node if we're clicking on a handle
                      if ((e.target as HTMLElement).classList.contains('input-handle') || 
                          (e.target as HTMLElement).classList.contains('output-handle')) {
                        return;
                      }
                      e.stopPropagation();
                      setSelectedNode(node);
                    }}
                    draggable={!readonly}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('nodeId', node.id);
                    }}
                  >
                    <div className="font-medium mb-1">{nodeTypeInfo.name}</div>
                    <div className="text-xs text-muted-foreground mb-2">{nodeTypeInfo.description}</div>
                    
                    {/* Input Handles */}
                    <div className="relative">
                      {nodeTypeInfo.inputs?.map(input => (
                        <div
                          key={`${node.id}-${input.id}-container`}
                          className="relative"
                        >
                          <div
                            id={`${node.id}-${input.id}`}
                            className="absolute input-handle"
                            style={{
                              left: input.position === 'left' ? '-6px' : 'auto',
                              right: input.position === 'right' ? '-6px' : 'auto',
                              top: input.position === 'top' ? '-6px' : (input.position === 'left' || input.position === 'right') ? '50%' : 'auto',
                              bottom: input.position === 'bottom' ? '-6px' : 'auto',
                              transform: (input.position === 'left' || input.position === 'right') ? 'translateY(-50%)' : 'none',
                            }}
                          />
                          {input.label && (
                            <div 
                              className="text-xs pl-3 mb-1"
                              style={{marginTop: input.position === 'left' ? '0' : '-10px'}}
                            >
                              {input.label}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Output Handles */}
                    <div className="relative mt-2">
                      {nodeTypeInfo.outputs?.map(output => (
                        <div
                          key={`${node.id}-${output.id}-container`}
                          className="relative mb-1"
                        >
                          {output.label && (
                            <div 
                              className="text-xs text-right pr-3"
                              style={{marginBottom: output.position === 'right' ? '0' : '-10px'}}
                            >
                              {output.label}
                            </div>
                          )}
                          <div
                            id={`${node.id}-${output.id}`}
                            className="absolute output-handle"
                            style={{
                              left: output.position === 'left' ? '-6px' : 'auto',
                              right: output.position === 'right' ? '-6px' : 'auto',
                              top: output.position === 'top' ? '-6px' : (output.position === 'left' || output.position === 'right') ? '50%' : 'auto',
                              bottom: output.position === 'bottom' ? '-6px' : 'auto',
                              transform: (output.position === 'left' || output.position === 'right') ? 'translateY(-50%)' : 'none'
                            }}
                            onMouseDown={(e) => handleStartConnection(node.id, output.id, e)}
                          />
                        </div>
                      ))}
                    </div>
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