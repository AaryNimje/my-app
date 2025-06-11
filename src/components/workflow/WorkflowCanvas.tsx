"use client";
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { WorkflowNode, WorkflowConnection } from '@/types/workflow';
import { NODE_DEFINITIONS } from '@/lib/nodes';

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  selectedNodeId: string | null;
  onNodesChange: (nodes: WorkflowNode[]) => void;
  onConnectionsChange: (connections: WorkflowConnection[]) => void;
  onNodeSelect: (nodeId: string | null) => void;
  onNodeDoubleClick: (nodeId: string) => void;
}

interface ConnectionDraft {
  sourceNode: string;
  sourceHandle: string;
  targetNode?: string;
  targetHandle?: string;
  position: { x: number; y: number };
}

export default function WorkflowCanvas({
  nodes,
  connections,
  selectedNodeId,
  onNodesChange,
  onConnectionsChange,
  onNodeSelect,
  onNodeDoubleClick
}: WorkflowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectionDraft, setConnectionDraft] = useState<ConnectionDraft | null>(null);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // Handle node dragging
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setDraggedNode(nodeId);
    setDragOffset({
      x: e.clientX - node.position.x,
      y: e.clientY - node.position.y
    });
    onNodeSelect(nodeId);
  }, [nodes, onNodeSelect]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (draggedNode) {
      const newNodes = nodes.map(node => 
        node.id === draggedNode 
          ? { 
              ...node, 
              position: { 
                x: e.clientX - dragOffset.x, 
                y: e.clientY - dragOffset.y 
              } 
            }
          : node
      );
      onNodesChange(newNodes);
    }

    if (connectionDraft) {
      setConnectionDraft({
        ...connectionDraft,
        position: { x: e.clientX, y: e.clientY }
      });
    }
  }, [draggedNode, dragOffset, nodes, onNodesChange, connectionDraft]);

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
    setConnectionDraft(null);
  }, []);

  useEffect(() => {
    if (draggedNode || connectionDraft) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedNode, connectionDraft, handleMouseMove, handleMouseUp]);

  // Handle connection creation
  const handleConnectionStart = useCallback((nodeId: string, handleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConnectionDraft({
      sourceNode: nodeId,
      sourceHandle: handleId,
      position: { x: e.clientX, y: e.clientY }
    });
  }, []);

  const handleConnectionEnd = useCallback((nodeId: string, handleId: string) => {
    if (connectionDraft && connectionDraft.sourceNode !== nodeId) {
      const newConnection: WorkflowConnection = {
        id: `${connectionDraft.sourceNode}-${connectionDraft.sourceHandle}-${nodeId}-${handleId}`,
        source: connectionDraft.sourceNode,
        sourceHandle: connectionDraft.sourceHandle,
        target: nodeId,
        targetHandle: handleId
      };
      onConnectionsChange([...connections, newConnection]);
    }
    setConnectionDraft(null);
  }, [connectionDraft, connections, onConnectionsChange]);

  // Handle node deletion
  const handleNodeDelete = useCallback((nodeId: string) => {
    onNodesChange(nodes.filter(n => n.id !== nodeId));
    onConnectionsChange(connections.filter(c => c.source !== nodeId && c.target !== nodeId));
    if (selectedNodeId === nodeId) {
      onNodeSelect(null);
    }
  }, [nodes, connections, selectedNodeId, onNodesChange, onConnectionsChange, onNodeSelect]);

  // Canvas panning and zooming
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      onNodeSelect(null);
    }
  }, [onNodeSelect]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newZoom = Math.min(Math.max(0.1, zoom + delta), 3);
    setZoom(newZoom);
  }, [zoom]);

  // Get handle position
  const getHandlePosition = (node: WorkflowNode, handleId: string, handleType: 'source' | 'target') => {
    const definition = NODE_DEFINITIONS[node.type];
    if (!definition) return { x: 0, y: 0 };

    const handles = handleType === 'source' ? definition.outputs : definition.inputs;
    const handle = handles.find(h => h.id === handleId);
    if (!handle) return { x: 0, y: 0 };

    const nodeWidth = node.width || 200;
    const nodeHeight = node.height || 80;

    switch (handle.position) {
      case 'left':
        return { x: node.position.x, y: node.position.y + nodeHeight / 2 };
      case 'right':
        return { x: node.position.x + nodeWidth, y: node.position.y + nodeHeight / 2 };
      case 'top':
        return { x: node.position.x + nodeWidth / 2, y: node.position.y };
      case 'bottom':
        return { x: node.position.x + nodeWidth / 2, y: node.position.y + nodeHeight };
      default:
        return { x: node.position.x + nodeWidth / 2, y: node.position.y + nodeHeight / 2 };
    }
  };

  // Render connection line
  const renderConnection = (connection: WorkflowConnection) => {
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    
    if (!sourceNode || !targetNode) return null;

    const sourcePos = getHandlePosition(sourceNode, connection.sourceHandle, 'source');
    const targetPos = getHandlePosition(targetNode, connection.targetHandle, 'target');

    const midX = (sourcePos.x + targetPos.x) / 2;
    const path = `M ${sourcePos.x},${sourcePos.y} C ${midX},${sourcePos.y} ${midX},${targetPos.y} ${targetPos.x},${targetPos.y}`;

    return (
      <g key={connection.id}>
        <path
          d={path}
          stroke="#6b7280"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
          className="cursor-pointer hover:stroke-blue-500"
          onClick={() => {
            // Handle connection selection/deletion
            const confirmDelete = window.confirm('Delete this connection?');
            if (confirmDelete) {
              onConnectionsChange(connections.filter(c => c.id !== connection.id));
            }
          }}
        />
      </g>
    );
  };

  // Render draft connection
  const renderDraftConnection = () => {
    if (!connectionDraft) return null;

    const sourceNode = nodes.find(n => n.id === connectionDraft.sourceNode);
    if (!sourceNode) return null;

    const sourcePos = getHandlePosition(sourceNode, connectionDraft.sourceHandle, 'source');
    const path = `M ${sourcePos.x},${sourcePos.y} L ${connectionDraft.position.x},${connectionDraft.position.y}`;

    return (
      <path
        d={path}
        stroke="#3b82f6"
        strokeWidth="2"
        fill="none"
        strokeDasharray="5,5"
      />
    );
  };

  return (
    <div 
      ref={canvasRef}
      className="workflow-canvas"
      onMouseDown={handleCanvasMouseDown}
      onWheel={handleWheel}
      style={{
        width: '100%',
        height: '100%',