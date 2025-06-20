'use client';

import React from 'react';
import { PropertyPanel } from './PropertyPanel';

// Define the Node type to avoid importing from ReactFlow
interface Node {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: any;
}

interface ClientPropertyPanelProps {
  selectedNode: Node | null;
}

export function ClientPropertyPanel({ selectedNode }: ClientPropertyPanelProps) {
  // Define the update function here in the client component
  const handleUpdateNodeData = (nodeId: string, data: any) => {
    // This is where you'd normally update the node data
    // For now, we'll just log it
    console.log('Update node data:', nodeId, data);
    
    // In a real implementation, this would dispatch an event or call a parent function
    // We can use a custom event to communicate with the parent component
    const updateEvent = new CustomEvent('nodedataupdate', {
      detail: { nodeId, data }
    });
    window.dispatchEvent(updateEvent);
  };

  return (
    <PropertyPanel 
      selectedNode={selectedNode} 
      onUpdateNodeData={handleUpdateNodeData} 
    />
  );
}