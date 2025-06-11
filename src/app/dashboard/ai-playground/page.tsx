"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

// Types
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
  fromHandle?: string;
  toHandle?: string;
}

interface PlaygroundState {
  nodes: Node[];
  connections: Connection[];
  selectedNodeId: string | null;
}

// Node Component
const NodeComponent = ({ 
  node, 
  onDrag, 
  onSelect,
  isSelected,
  onDelete
}: { 
  node: Node; 
  onDrag: (id: string, position: { x: number; y: number }) => void;
  onSelect: (id: string) => void;
  isSelected: boolean;
  onDelete: (id: string) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'file': return '📁';
      case 'agent': return '🤖';
      case 'llm': return '🧠';
      case 'memory': return '💾';
      case 'tool': return '🔧';
      case 'condition': return '🔀';
      case 'output': return '📤';
      default: return '⚙️';
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'file': return '#3b82f6';
      case 'agent': return '#8b5cf6';
      case 'llm': return '#10b981';
      case 'memory': return '#f59e0b';
      case 'tool': return '#ef4444';
      case 'condition': return '#f97316';
      case 'output': return '#06b6d4';
      default: return '#6b7280';
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - node.position.x,
      y: e.clientY - node.position.y,
    });
    onSelect(node.id);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      onDrag(node.id, {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart, node.id, onDrag]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse listeners
  useState(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: node.position.x,
        top: node.position.y,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isSelected ? 1000 : 1,
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        style={{
          backgroundColor: getNodeColor(node.type),
          color: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          minWidth: '140px',
          boxShadow: isSelected ? '0 0 0 2px #06b6d4' : '0 2px 8px rgba(0,0,0,0.1)',
          border: isSelected ? '2px solid #06b6d4' : 'none',
          userSelect: 'none',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>{getNodeIcon(node.type)}</span>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>{node.data.label}</span>
          </div>
          {isSelected && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id);
              }}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                padding: '2px 6px',
                fontSize: '12px'
              }}
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Connection handles */}
        <div style={{
          position: 'absolute',
          right: '-6px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '12px',
          height: '12px',
          backgroundColor: '#fff',
          border: '2px solid ' + getNodeColor(node.type),
          borderRadius: '50%',
          cursor: 'crosshair'
        }} />
        <div style={{
          position: 'absolute',
          left: '-6px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '12px',
          height: '12px',
          backgroundColor: '#fff',
          border: '2px solid ' + getNodeColor(node.type),
          borderRadius: '50%',
          cursor: 'crosshair'
        }} />
      </div>
    </div>
  );
};

// Node Palette Component
const NodePalette = ({ onAddNode }: { onAddNode: (type: Node['type']) => void }) => {
  const nodeTypes: Array<{ type: Node['type']; label: string; icon: string; description: string }> = [
    { type: 'file', label: 'File Input', icon: '📁', description: 'Upload files (PDF, Excel, etc.)' },
    { type: 'agent', label: 'AI Agent', icon: '🤖', description: 'Configurable AI assistant' },
    { type: 'llm', label: 'LLM Model', icon: '🧠', description: 'Language model (GPT, Claude)' },
    { type: 'memory', label: 'Memory', icon: '💾', description: 'Store conversation context' },
    { type: 'tool', label: 'Tools', icon: '🔧', description: 'External tools from MCP' },
    { type: 'condition', label: 'Condition', icon: '🔀', description: 'If/else logic branching' },
    { type: 'output', label: 'Output', icon: '📤', description: 'Generate files or responses' },
  ];

  return (
    <div style={{
      width: '280px',
      backgroundColor: '#f8f9fa',
      borderRight: '1px solid #e9ecef',
      padding: '20px',
      height: '100%',
      overflowY: 'auto'
    }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#1a1a1a' }}>
        🎨 Node Palette
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {nodeTypes.map((nodeType) => (
          <div
            key={nodeType.type}
            onClick={() => onAddNode(nodeType.type)}
            style={{
              padding: '16px',
              border: '2px dashed #dee2e6',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: 'white',
              transition: 'all 0.2s ease',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#06b6d4';
              e.currentTarget.style.backgroundColor = '#f0f9ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#dee2e6';
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <span style={{ fontSize: '20px' }}>{nodeType.icon}</span>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a' }}>
                {nodeType.label}
              </span>
            </div>
            <p style={{ 
              fontSize: '12px', 
              color: '#6b7280', 
              margin: '0',
              lineHeight: '1.4'
            }}>
              {nodeType.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Property Panel Component
const PropertyPanel = ({ 
  selectedNode, 
  onUpdateNode,
  onClose
}: { 
  selectedNode: Node | null;
  onUpdateNode: (id: string, data: Partial<Node['data']>) => void;
  onClose: () => void;
}) => {
  if (!selectedNode) {
    return (
      <div style={{
        width: '320px',
        backgroundColor: '#f8f9fa',
        borderLeft: '1px solid #e9ecef',
        padding: '20px',
        height: '100%'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1a1a1a' }}>
          ⚙️ Properties
        </h3>
        <div style={{
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '14px',
          padding: '40px 0'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
          <p>Select a node to view and edit its properties</p>
        </div>
      </div>
    );
  }

  const renderNodeSpecificConfig = () => {
    switch (selectedNode.type) {
      case 'llm':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '8px' }}>
                Model
              </label>
              <select style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}>
                <option>GPT-4</option>
                <option>GPT-3.5 Turbo</option>
                <option>Claude</option>
                <option>Gemini</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '8px' }}>
                Temperature: 0.7
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                defaultValue="0.7"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '8px' }}>
                Max Tokens
              </label>
              <input
                type="number"
                defaultValue="2048"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
        );
      
      case 'file':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '8px' }}>
                File Type
              </label>
              <select style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}>
                <option>PDF</option>
                <option>Excel (.xlsx)</option>
                <option>Word (.docx)</option>
                <option>CSV</option>
                <option>Text</option>
                <option>Image</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '8px' }}>
                Processing Mode
              </label>
              <select style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}>
                <option>Extract Text</option>
                <option>Parse Structure</option>
                <option>OCR (Images)</option>
                <option>Metadata Only</option>
              </select>
            </div>
          </div>
        );
      
      case 'agent':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '8px' }}>
                Agent Type
              </label>
              <select style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}>
                <option>Academic Assistant</option>
                <option>Administrative Agent</option>
                <option>Research Helper</option>
                <option>Custom Agent</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '8px' }}>
                System Prompt
              </label>
              <textarea
                placeholder="You are a helpful academic assistant..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        );
      
      default:
        return (
          <div style={{ color: '#6b7280', fontSize: '14px' }}>
            Configuration options for {selectedNode.type} nodes coming soon...
          </div>
        );
    }
  };

  return (
    <div style={{
      width: '320px',
      backgroundColor: '#f8f9fa',
      borderLeft: '1px solid #e9ecef',
      padding: '20px',
      height: '100%',
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h3 style={{ margin: '0', fontSize: '18px', fontWeight: '600', color: '#1a1a1a' }}>
          ⚙️ Properties
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px',
            color: '#6b7280'
          }}
        >
          ✕
        </button>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '8px' }}>
            Node Label
          </label>
          <input
            type="text"
            value={selectedNode.data.label}
            onChange={(e) => onUpdateNode(selectedNode.id, { label: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>
        
        <div>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '8px' }}>
            Node Type
          </label>
          <div style={{
            padding: '8px 12px',
            backgroundColor: '#e5e7eb',
            borderRadius: '6px',
            fontSize: '14px',
            color: '#4b5563'
          }}>
            {selectedNode.type}
          </div>
        </div>
        
        {renderNodeSpecificConfig()}
      </div>
    </div>
  );
};

// Main AI Playground Component
export default function AIPlaygroundPage() {
  const router = useRouter();
  const [currentPlayground, setCurrentPlayground] = useState<1 | 2 | 3>(1);
  const [playgroundStates, setPlaygroundStates] = useState<Record<number, PlaygroundState>>({
    1: { nodes: [], connections: [], selectedNodeId: null },
    2: { nodes: [], connections: [], selectedNodeId: null },
    3: { nodes: [], connections: [], selectedNodeId: null }
  });

  const currentState = playgroundStates[currentPlayground];
  const canvasRef = useRef<HTMLDivElement>(null);

  // Check authentication
  useState(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      router.push('/login');
    }
  });

  const updateState = (updates: Partial<PlaygroundState>) => {
    setPlaygroundStates(prev => ({
      ...prev,
      [currentPlayground]: { ...prev[currentPlayground], ...updates }
    }));
  };

  const addNode = (type: Node['type']) => {
    const newNode: Node = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      position: { 
        x: 100 + currentState.nodes.length * 30, 
        y: 100 + currentState.nodes.length * 30 
      },
      data: {
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${currentState.nodes.length + 1}`,
      },
    };
    
    updateState({
      nodes: [...currentState.nodes, newNode]
    });
  };

  const updateNodePosition = (id: string, position: { x: number; y: number }) => {
    updateState({
      nodes: currentState.nodes.map(node => 
        node.id === id ? { ...node, position } : node
      )
    });
  };

  const updateNodeData = (id: string, data: Partial<Node['data']>) => {
    updateState({
      nodes: currentState.nodes.map(node => 
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
      )
    });
  };

  const deleteNode = (id: string) => {
    updateState({
      nodes: currentState.nodes.filter(node => node.id !== id),
      selectedNodeId: currentState.selectedNodeId === id ? null : currentState.selectedNodeId
    });
  };

  const selectNode = (id: string) => {
    updateState({ selectedNodeId: id });
  };

  const clearSelection = () => {
    updateState({ selectedNodeId: null });
  };

  const selectedNode = currentState.nodes.find(node => node.id === currentState.selectedNodeId) || null;

  const getPlaygroundTitle = (num: number) => {
    switch(num) {
      case 1: return "Simple Workflow Builder";
      case 2: return "Advanced Agent Configuration";
      case 3: return "Template-Based Workflows";
      default: return "AI Playground";
    }
  };

  const getPlaygroundDescription = (num: number) => {
    switch(num) {
      case 1: return "Drag and drop components to build basic AI workflows";
      case 2: return "Configure complex multi-agent systems with advanced settings";
      case 3: return "Start with pre-built templates for common academic tasks";
      default: return "";
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Node Palette */}
      <NodePalette onAddNode={addNode} />
      
      {/* Main Canvas Area */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e9ecef',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '600', color: '#1a1a1a' }}>
              🧠 AI Playground
            </h1>
            <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
              {getPlaygroundDescription(currentPlayground)}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              ▶️ Run Workflow
            </button>
            <button style={{
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              💾 Save
            </button>
            <button style={{
              padding: '8px 16px',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              📥 Export
            </button>
          </div>
        </div>

        {/* Playground Selector */}
        <div style={{
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #e9ecef',
          padding: '12px 24px',
          display: 'flex',
          gap: '8px'
        }}>
          {[1, 2, 3].map(num => (
            <button
              key={num}
              onClick={() => setCurrentPlayground(num as 1 | 2 | 3)}
              style={{
                padding: '8px 16px',
                backgroundColor: currentPlayground === num ? '#06b6d4' : 'white',
                color: currentPlayground === num ? 'white' : '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Playground {num}: {getPlaygroundTitle(num)}
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div
            ref={canvasRef}
            onClick={clearSelection}
            style={{
              width: '100%',
              height: '100%',
              backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              backgroundColor: '#fafafa',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {currentState.nodes.map((node) => (
              <NodeComponent
                key={node.id}
                node={node}
                onDrag={updateNodePosition}
                onSelect={selectNode}
                onDelete={deleteNode}
                isSelected={currentState.selectedNodeId === node.id}
              />
            ))}
            
            {currentState.nodes.length === 0 && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: '#9ca3af',
                fontSize: '16px'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎨</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>
                  Start Building Your AI Workflow
                </h3>
                <p style={{ margin: '0', fontSize: '14px' }}>
                  Drag components from the palette to create your workflow
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Property Panel */}
      <PropertyPanel 
        selectedNode={selectedNode}
        onUpdateNode={updateNodeData}
        onClose={clearSelection}
      />
    </div>
  );
}