"use client";
import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  IconFile,
  IconBrain,
  IconCloud,
  IconGitBranch,
  IconDownload,
  IconCaretRight,
  IconSettings,
} from "@tabler/icons-react";

interface Node {
  id: string;
  type: 'file' | 'agent' | 'llm' | 'memory' | 'tool' | 'condition' | 'output';
  position: { x: number; y: number };
  data: {
    label: string;
    config?: Record<string, any>;
  };
}

interface Connection {
  from: string;
  to: string;
}

const NodeComponent = ({ 
  node, 
  onDrag, 
  onSelect,
  isSelected 
}: { 
  node: Node; 
  onDrag: (id: string, position: { x: number; y: number }) => void;
  onSelect: (id: string) => void;
  isSelected: boolean;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'file': return <IconFile className="w-4 h-4" />;
      case 'agent': return <IconBrain className="w-4 h-4" />;
      case 'llm': return <IconCloud className="w-4 h-4" />;
      case 'condition': return <IconGitBranch className="w-4 h-4" />;
      case 'output': return <IconDownload className="w-4 h-4" />;
      default: return <IconSettings className="w-4 h-4" />;
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'file': return 'from-blue-500 to-blue-600';
      case 'agent': return 'from-purple-500 to-purple-600';
      case 'llm': return 'from-green-500 to-green-600';
      case 'condition': return 'from-yellow-500 to-yellow-600';
      case 'output': return 'from-red-500 to-red-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - node.position.x,
      y: e.clientY - node.position.y,
    });
    onSelect(node.id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      onDrag(node.id, {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  return (
    <motion.div
      className={cn(
        "absolute cursor-pointer select-none",
        isSelected && "ring-2 ring-cyan-400"
      )}
      style={{
        left: node.position.x,
        top: node.position.y,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setIsDragging(false)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-white min-w-32",
        `bg-gradient-to-r ${getNodeColor(node.type)}`
      )}>
        {getNodeIcon(node.type)}
        <span className="text-sm font-medium">{node.data.label}</span>
      </div>
    </motion.div>
  );
};

const NodePalette = ({ onAddNode }: { onAddNode: (type: Node['type']) => void }) => {
  const nodeTypes: Array<{ type: Node['type']; label: string; icon: React.ReactNode }> = [
    { type: 'file', label: 'File Input', icon: <IconFile className="w-4 h-4" /> },
    { type: 'agent', label: 'AI Agent', icon: <IconBrain className="w-4 h-4" /> },
    { type: 'llm', label: 'LLM Model', icon: <IconCloud className="w-4 h-4" /> },
    { type: 'condition', label: 'Condition', icon: <IconGitBranch className="w-4 h-4" /> },
    { type: 'output', label: 'Output', icon: <IconDownload className="w-4 h-4" /> },
  ];

  return (
    <div className="w-64 bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 p-4">
      <h3 className="text-lg font-semibold mb-4 text-neutral-800 dark:text-neutral-200">
        Node Palette
      </h3>
      <div className="space-y-2">
        {nodeTypes.map((nodeType) => (
          <button
            key={nodeType.type}
            onClick={() => onAddNode(nodeType.type)}
            className="w-full flex items-center gap-2 p-3 rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-600 hover:border-cyan-400 transition-colors duration-200 text-neutral-700 dark:text-neutral-300 hover:text-cyan-600"
          >
            {nodeType.icon}
            <span className="text-sm">{nodeType.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const PropertyPanel = ({ 
  selectedNode, 
  onUpdateNode 
}: { 
  selectedNode: Node | null;
  onUpdateNode: (id: string, data: Partial<Node['data']>) => void;
}) => {
  if (!selectedNode) {
    return (
      <div className="w-64 bg-white dark:bg-neutral-800 border-l border-neutral-200 dark:border-neutral-700 p-4">
        <h3 className="text-lg font-semibold mb-4 text-neutral-800 dark:text-neutral-200">
          Properties
        </h3>
        <p className="text-sm text-neutral-500">Select a node to view properties</p>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white dark:bg-neutral-800 border-l border-neutral-200 dark:border-neutral-700 p-4">
      <h3 className="text-lg font-semibold mb-4 text-neutral-800 dark:text-neutral-200">
        Properties
      </h3>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Label
          </label>
          <input
            type="text"
            value={selectedNode.data.label}
            onChange={(e) => onUpdateNode(selectedNode.id, { label: e.target.value })}
            className="w-full mt-1 p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200"
          />
        </div>
        
        {selectedNode.type === 'llm' && (
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Model
            </label>
            <select className="w-full mt-1 p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
              <option>GPT-4</option>
              <option>Claude</option>
              <option>Gemini</option>
            </select>
          </div>
        )}
        
        {selectedNode.type === 'file' && (
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              File Type
            </label>
            <select className="w-full mt-1 p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
              <option>PDF</option>
              <option>Excel</option>
              <option>Word</option>
              <option>CSV</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

export default function AIPlayground() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const addNode = (type: Node['type']) => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type,
      position: { x: 100 + nodes.length * 20, y: 100 + nodes.length * 20 },
      data: {
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${nodes.length + 1}`,
      },
    };
    setNodes([...nodes, newNode]);
  };

  const updateNodePosition = (id: string, position: { x: number; y: number }) => {
    setNodes(nodes.map(node => 
      node.id === id ? { ...node, position } : node
    ));
  };

  const updateNodeData = (id: string, data: Partial<Node['data']>) => {
    setNodes(nodes.map(node => 
      node.id === id ? { ...node, data: { ...node.data, ...data } } : node
    ));
  };

  const selectedNode = nodes.find(node => node.id === selectedNodeId) || null;

  return (
    <div className="flex flex-1 h-full">
      <NodePalette onAddNode={addNode} />
      
      <div className="flex-1 relative bg-gray-50 dark:bg-neutral-900">
        <div className="absolute top-4 left-4 z-10">
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors">
              <IconCaretRight className="w-4 h-4" />
              Run Workflow
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
              <IconDownload className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
        
        <div 
          ref={canvasRef}
          className="w-full h-full relative overflow-hidden"
          style={{
            backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          {nodes.map((node) => (
            <NodeComponent
              key={node.id}
              node={node}
              onDrag={updateNodePosition}
              onSelect={setSelectedNodeId}
              isSelected={selectedNodeId === node.id}
            />
          ))}
          
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-neutral-500">
                <IconBrain className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Build Your AI Workflow</h3>
                <p className="text-sm">
                  Drag and drop nodes from the palette to create your workflow
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <PropertyPanel 
        selectedNode={selectedNode}
        onUpdateNode={updateNodeData}
      />
    </div>
  );
}