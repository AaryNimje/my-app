"use client";
import React, { useState } from 'react';
import { NODE_DEFINITIONS, NODE_GROUPS } from '@/lib/nodes';
import { WorkflowNode } from '@/types/workflow';

interface NodePaletteProps {
  onAddNode: (nodeType: string, position?: { x: number; y: number }) => void;
}

export default function NodePalette({ onAddNode }: NodePaletteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Group nodes by category
  const groupedNodes = Object.values(NODE_DEFINITIONS).reduce((acc, node) => {
    if (!acc[node.group]) {
      acc[node.group] = [];
    }
    acc[node.group].push(node);
    return acc;
  }, {} as Record<string, typeof NODE_DEFINITIONS[string][]>);

  // Filter nodes based on search
  const filteredNodes = Object.entries(groupedNodes).reduce((acc, [group, nodes]) => {
    const filtered = nodes.filter(node => 
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[group] = filtered;
    }
    return acc;
  }, {} as Record<string, typeof NODE_DEFINITIONS[string][]>);

  const toggleGroup = (group: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(group)) {
      newCollapsed.delete(group);
    } else {
      newCollapsed.add(group);
    }
    setCollapsedGroups(newCollapsed);
  };

  const handleDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData('application/node-type', nodeType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div style={{
      width: '320px',
      height: '100%',
      backgroundColor: '#f8fafc',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: 'white'
      }}>
        <h3 style={{
          margin: '0 0 12px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🎨 Node Palette
        </h3>
        
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 32px 8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          />
          <div style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#6b7280',
            fontSize: '16px'
          }}>
            🔍
          </div>
        </div>
      </div>

      {/* Node Groups */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px'
      }}>
        {Object.entries(filteredNodes).map(([groupName, nodes]) => {
          const group = NODE_GROUPS[groupName as keyof typeof NODE_GROUPS];
          const isCollapsed = collapsedGroups.has(groupName);
          
          return (
            <div key={groupName} style={{ marginBottom: '12px' }}>
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(groupName)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: selectedGroup === groupName ? '#f1f5f9' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '4px'
                }}
                onMouseEnter={(e) => {
                  if (selectedGroup !== groupName) {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedGroup !== groupName) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>{group?.icon}</span>
                  <span>{groupName}</span>
                  <span style={{
                    fontSize: '11px',
                    backgroundColor: '#e5e7eb',
                    color: '#6b7280',
                    padding: '2px 6px',
                    borderRadius: '10px'
                  }}>
                    {nodes.length}
                  </span>
                </div>
                <span style={{
                  fontSize: '12px',
                  transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }}>
                  ▼
                </span>
              </button>

              {/* Group Nodes */}
              {!isCollapsed && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  paddingLeft: '8px'
                }}>
                  {nodes.map((node) => (
                    <div
                      key={node.type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, node.type)}
                      onClick={() => onAddNode(node.type)}
                      style={{
                        padding: '12px',
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        cursor: 'grab',
                        transition: 'all 0.2s ease',
                        userSelect: 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = node.color;
                        e.currentTarget.style.boxShadow = `0 2px 8px ${node.color}20`;
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        marginBottom: '6px'
                      }}>
                        <span style={{
                          fontSize: '18px',
                          lineHeight: '1'
                        }}>
                          {node.icon}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#1e293b',
                            marginBottom: '2px'
                          }}>
                            {node.name}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: '#64748b',
                            lineHeight: '1.4'
                          }}>
                            {node.description}
                          </div>
                        </div>
                      </div>
                      
                      {/* Node badges */}
                      <div style={{
                        display: 'flex',
                        gap: '4px',
                        flexWrap: 'wrap',
                        marginTop: '8px'
                      }}>
                        {node.inputs.length > 0 && (
                          <span style={{
                            fontSize: '10px',
                            backgroundColor: '#dbeafe',
                            color: '#1e40af',
                            padding: '1px 6px',
                            borderRadius: '8px'
                          }}>
                            {node.inputs.length} input{node.inputs.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {node.outputs.length > 0 && (
                          <span style={{
                            fontSize: '10px',
                            backgroundColor: '#dcfce7',
                            color: '#166534',
                            padding: '1px 6px',
                            borderRadius: '8px'
                          }}>
                            {node.outputs.length} output{node.outputs.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {node.credentials && (
                          <span style={{
                            fontSize: '10px',
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            padding: '1px 6px',
                            borderRadius: '8px'
                          }}>
                            🔐 auth
                          </span>
                        )}
                        {node.webhooks && (
                          <span style={{
                            fontSize: '10px',
                            backgroundColor: '#fce7f3',
                            color: '#be185d',
                            padding: '1px 6px',
                            borderRadius: '8px'
                          }}>
                            🔗 webhook
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {Object.keys(filteredNodes).length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
              No nodes found
            </div>
            <div style={{ fontSize: '12px' }}>
              Try a different search term
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: 'white',
        fontSize: '11px',
        color: '#6b7280'
      }}>
        <div style={{ marginBottom: '4px' }}>
          💡 <strong>Tip:</strong> Drag nodes to canvas or click to add
        </div>
        <div>
          {Object.values(NODE_DEFINITIONS).length} nodes available
        </div>
      </div>
    </div>
  );
}