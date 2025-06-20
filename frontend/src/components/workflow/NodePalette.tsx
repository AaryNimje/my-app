// src/components/workflow/NodePalette.tsx
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { NODE_DEFINITIONS } from '@/lib/nodes';

// Define node groups for organization
const NODE_GROUPS = [
  { id: 'trigger', name: 'Triggers', icon: '🔄' },
  { id: 'ai', name: 'AI', icon: '🧠' },
  { id: 'logic', name: 'Logic', icon: '🔀' },
  { id: 'data', name: 'Data', icon: '📊' },
  { id: 'integrations', name: 'Integrations', icon: '🔌' },
  { id: 'output', name: 'Outputs', icon: '📤' }
];

interface NodePaletteProps {
  onAddNode?: (nodeType: string) => void;
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
  const [activeGroup, setActiveGroup] = useState<string>('trigger');

  // Filter nodes by active group
  const nodesForActiveGroup = Object.entries(NODE_DEFINITIONS)
    .filter(([_, node]) => node.group.toLowerCase() === activeGroup.toLowerCase())
    .map(([key, node]) => ({ ...node, key }));

  // Debug output
  console.log("Current node group:", activeGroup);
  console.log("Nodes for active group:", nodesForActiveGroup);

  return (
    <div className="w-64 h-full bg-card border-r border-border flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Node Palette</h2>
        <p className="text-sm text-muted-foreground">Drag components to the canvas</p>
      </div>
      
      {/* Group selector */}
      <div className="flex overflow-x-auto p-2 border-b border-border">
        {NODE_GROUPS.map(group => (
          <button
            key={group.id}
            onClick={() => setActiveGroup(group.id)}
            className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap mr-2 ${
              activeGroup === group.id 
                ? 'bg-primary/20 text-primary' 
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <span className="mr-1">{group.icon}</span>
            {group.name}
          </button>
        ))}
      </div>
      
      {/* Node list */}
      <div className="flex-1 overflow-y-auto p-3">
        {nodesForActiveGroup.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            No nodes available in this category
          </div>
        ) : (
          <div className="space-y-2">
            {nodesForActiveGroup.map(node => (
              <Card 
                key={node.type}
                className="p-3 cursor-grab border border-border hover:border-primary hover:shadow-sm transition-all"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('nodeType', node.type);
                  e.dataTransfer.effectAllowed = 'copy';
                  console.log(`Started dragging node: ${node.type}`);
                }}
                onClick={() => {
                  console.log(`Clicked on node: ${node.type}`);
                  if (onAddNode) {
                    onAddNode(node.type);
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${node.color}20` }}>
                    <span className="text-lg">{node.icon}</span>
                  </div>
                  <div>
                    <div className="font-medium text-sm">{node.name}</div>
                    <div className="text-xs text-muted-foreground">{node.description}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export const NODE_TYPES = NODE_DEFINITIONS;