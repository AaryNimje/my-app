"use client";
import React, { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { WorkflowNode, WorkflowConnection, Workflow } from '@/types/workflow';
import { NODE_DEFINITIONS } from '@/lib/nodes';
import WorkflowCanvas from '@/components/workflow/WorkflowCanvas';
import NodePalette from '@/components/workflow/NodePalette';
import PropertyPanel from '@/components/workflow/PropertyPanel';

interface PlaygroundState {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  selectedNodeId: string | null;
  workflow: Workflow | null;
}

export default function AIPlaygroundPage() {
  const router = useRouter();
  const [currentPlayground, setCurrentPlayground] = useState<1 | 2 | 3>(1);
  const [playgroundStates, setPlaygroundStates] = useState<Record<number, PlaygroundState>>({
    1: { nodes: [], connections: [], selectedNodeId: null, workflow: null },
    2: { nodes: [], connections: [], selectedNodeId: null, workflow: null },
    3: { nodes: [], connections: [], selectedNodeId: null, workflow: null }
  });
  const [isExecuting, setIsExecuting] = useState(false);
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Check authentication
  React.useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      router.push('/login');
    }
  }, [router]);

  const currentState = playgroundStates[currentPlayground];

  const updatePlaygroundState = useCallback((updates: Partial<PlaygroundState>) => {
    setPlaygroundStates(prev => ({
      ...prev,
      [currentPlayground]: { ...prev[currentPlayground], ...updates }
    }));
  }, [currentPlayground]);

  // Node operations
  const addNode = useCallback((nodeType: string, position?: { x: number; y: number }) => {
    const definition = NODE_DEFINITIONS[nodeType];
    if (!definition) return;

    const defaultPosition = position || {
      x: 100 + currentState.nodes.length * 250,
      y: 100 + (currentState.nodes.length % 3) * 150
    };

    const newNode: WorkflowNode = {
      id: `${nodeType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: nodeType as any,
      position: defaultPosition,
      data: {
        label: `${definition.name} ${currentState.nodes.length + 1}`,
        config: definition.parameters.reduce((acc, param) => {
          if (param.default !== undefined) {
            acc[param.name] = param.default;
          }
          return acc;
        }, {} as Record<string, any>),
        inputs: definition.inputs,
        outputs: definition.outputs,
        parameters: definition.parameters,
        status: 'idle'
      }
    };

    updatePlaygroundState({
      nodes: [...currentState.nodes, newNode]
    });
  }, [currentState.nodes, updatePlaygroundState]);

  const updateNode = useCallback((nodeId: string, updates: Partial<WorkflowNode>) => {
    updatePlaygroundState({
      nodes: currentState.nodes.map(node =>
        node.id === nodeId ? { ...node, ...updates } : node
      )
    });
  }, [currentState.nodes, updatePlaygroundState]);

  const deleteNode = useCallback((nodeId: string) => {
    updatePlaygroundState({
      nodes: currentState.nodes.filter(n => n.id !== nodeId),
      connections: currentState.connections.filter(c => c.source !== nodeId && c.target !== nodeId),
      selectedNodeId: currentState.selectedNodeId === nodeId ? null : currentState.selectedNodeId
    });
  }, [currentState, updatePlaygroundState]);

  const selectNode = useCallback((nodeId: string | null) => {
    updatePlaygroundState({ selectedNodeId: nodeId });
  }, [updatePlaygroundState]);

  // Connection operations
  const updateConnections = useCallback((connections: WorkflowConnection[]) => {
    updatePlaygroundState({ connections });
  }, [updatePlaygroundState]);

  // Workflow operations
  const saveWorkflow = useCallback(async () => {
    const workflow: Workflow = {
      id: `workflow-${Date.now()}`,
      name: `Playground ${currentPlayground} Workflow`,
      description: getPlaygroundDescription(currentPlayground),
      nodes: currentState.nodes,
      connections: currentState.connections,
      settings: {
        timezone: 'UTC',
        saveExecutions: true,
        saveSuccessfulExecutions: true,
        saveFailedExecutions: true
      },
      active: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [`playground-${currentPlayground}`]
    };

    // Save to localStorage for demo
    const savedWorkflows = JSON.parse(localStorage.getItem('workflows') || '[]');
    savedWorkflows.push(workflow);
    localStorage.setItem('workflows', JSON.stringify(savedWorkflows));

    updatePlaygroundState({ workflow });
    alert('Workflow saved successfully!');
  }, [currentPlayground, currentState, updatePlaygroundState]);

  const executeWorkflow = useCallback(async () => {
    if (currentState.nodes.length === 0) {
      alert('Add some nodes to execute the workflow!');
      return;
    }

    setIsExecuting(true);
    setShowExecutionPanel(true);

    // Simulate workflow execution
    for (const node of currentState.nodes) {
      updateNode(node.id, {
        data: { ...node.data, status: 'running' }
      });

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      // Randomly succeed or fail for demo
      const success = Math.random() > 0.2;
      updateNode(node.id, {
        data: {
          ...node.data,
          status: success ? 'success' : 'error',
          lastRun: new Date().toISOString()
        }
      });
    }

    setIsExecuting(false);
    alert('Workflow execution completed!');
  }, [currentState.nodes, updateNode]);

  const exportWorkflow = useCallback(() => {
    const workflow = {
      playground: currentPlayground,
      nodes: currentState.nodes,
      connections: currentState.connections,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `playground-${currentPlayground}-workflow.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentPlayground, currentState]);

  const importWorkflow = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        updatePlaygroundState({
          nodes: imported.nodes || [],
          connections: imported.connections || [],
          selectedNodeId: null
        });
        alert('Workflow imported successfully!');
      } catch (error) {
        alert('Failed to import workflow. Please check the file format.');
      }
    };
    reader.readAsText(file);
  }, [updatePlaygroundState]);

  const clearWorkflow = useCallback(() => {
    if (confirm('Are you sure you want to clear the entire workflow?')) {
      updatePlaygroundState({
        nodes: [],
        connections: [],
        selectedNodeId: null
      });
    }
  }, [updatePlaygroundState]);

  // Template workflows
  const loadTemplate = useCallback((templateType: 'academic' | 'admin' | 'research') => {
    let templateNodes: WorkflowNode[] = [];

    switch (templateType) {
      case 'academic':
        templateNodes = [
          {
            id: 'webhook-1',
            type: 'webhook',
            position: { x: 100, y: 100 },
            data: {
              label: 'Student Query Webhook',
              config: { httpMethod: 'POST', path: '/student-query' },
              inputs: [],
              outputs: [{ id: 'main', type: 'source', position: 'right', label: 'Query Data', dataType: 'object' }],
              parameters: NODE_DEFINITIONS.webhook.parameters,
              status: 'idle'
            }
          },
          {
            id: 'ai-agent-1',
            type: 'ai-agent',
            position: { x: 400, y: 100 },
            data: {
              label: 'Academic Assistant',
              config: {
                agentType: 'academic',
                systemPrompt: 'You are a helpful academic assistant for students.',
                maxIterations: 5
              },
              inputs: [{ id: 'main', type: 'target', position: 'left', label: 'Input', dataType: 'object' }],
              outputs: [{ id: 'main', type: 'source', position: 'right', label: 'Response', dataType: 'object' }],
              parameters: NODE_DEFINITIONS['ai-agent'].parameters,
              status: 'idle'
            }
          },
          {
            id: 'google-sheets-1',
            type: 'google-sheets',
            position: { x: 700, y: 100 },
            data: {
              label: 'Student Database',
              config: {
                operation: 'read',
                spreadsheetId: 'your-sheet-id',
                range: 'Students!A:Z'
              },
              inputs: [{ id: 'main', type: 'target', position: 'left', label: 'Input', dataType: 'object' }],
              outputs: [{ id: 'main', type: 'source', position: 'right', label: 'Student Data', dataType: 'array' }],
              parameters: NODE_DEFINITIONS['google-sheets'].parameters,
              status: 'idle'
            }
          }
        ];
        break;

      case 'admin':
        templateNodes = [
          {
            id: 'schedule-1',
            type: 'schedule',
            position: { x: 100, y: 100 },
            data: {
              label: 'Daily Report Trigger',
              config: { triggerInterval: 'day' },
              inputs: [],
              outputs: [{ id: 'main', type: 'source', position: 'right', label: 'Trigger', dataType: 'object' }],
              parameters: NODE_DEFINITIONS.schedule.parameters,
              status: 'idle'
            }
          },
          {
            id: 'google-sheets-2',
            type: 'google-sheets',
            position: { x: 400, y: 100 },
            data: {
              label: 'HR Data',
              config: { operation: 'read', range: 'HR!A:Z' },
              inputs: [{ id: 'main', type: 'target', position: 'left', label: 'Input', dataType: 'object' }],
              outputs: [{ id: 'main', type: 'source', position: 'right', label: 'HR Data', dataType: 'array' }],
              parameters: NODE_DEFINITIONS['google-sheets'].parameters,
              status: 'idle'
            }
          },
          {
            id: 'llm-node-1',
            type: 'llm-node',
            position: { x: 700, y: 100 },
            data: {
              label: 'Report Generator',
              config: {
                model: 'gpt-4',
                systemPrompt: 'Generate a daily HR report.',
                userPrompt: 'Create a summary of: {{data}}',
                temperature: 0.3
              },
              inputs: [{ id: 'main', type: 'target', position: 'left', label: 'Input', dataType: 'object' }],
              outputs: [{ id: 'main', type: 'source', position: 'right', label: 'Report', dataType: 'object' }],
              parameters: NODE_DEFINITIONS['llm-node'].parameters,
              status: 'idle'
            }
          },
          {
            id: 'email-send-1',
            type: 'email-send',
            position: { x: 1000, y: 100 },
            data: {
              label: 'Send Report',
              config: {
                toEmail: 'admin@university.edu',
                subject: 'Daily HR Report',
                body: '{{report}}'
              },
              inputs: [{ id: 'main', type: 'target', position: 'left', label: 'Input', dataType: 'object' }],
              outputs: [{ id: 'main', type: 'source', position: 'right', label: 'Result', dataType: 'object' }],
              parameters: NODE_DEFINITIONS['email-send'].parameters,
              status: 'idle'
            }
          }
        ];
        break;

      case 'research':
        templateNodes = [
          {
            id: 'file-input-1',
            type: 'file-input',
            position: { x: 100, y: 100 },
            data: {
              label: 'Research Papers',
              config: { fileType: 'pdf', processingMode: 'extract' },
              inputs: [],
              outputs: [{ id: 'main', type: 'source', position: 'right', label: 'Document Text', dataType: 'object' }],
              parameters: NODE_DEFINITIONS['file-input'].parameters,
              status: 'idle'
            }
          },
          {
            id: 'ai-agent-2',
            type: 'ai-agent',
            position: { x: 400, y: 100 },
            data: {
              label: 'Research Analyzer',
              config: {
                agentType: 'research',
                systemPrompt: 'You are a research assistant that analyzes academic papers.',
                maxIterations: 10
              },
              inputs: [{ id: 'main', type: 'target', position: 'left', label: 'Input', dataType: 'object' }],
              outputs: [{ id: 'main', type: 'source', position: 'right', label: 'Analysis', dataType: 'object' }],
              parameters: NODE_DEFINITIONS['ai-agent'].parameters,
              status: 'idle'
            }
          },
          {
            id: 'file-output-1',
            type: 'file-output',
            position: { x: 700, y: 100 },
            data: {
              label: 'Research Summary',
              config: {
                fileFormat: 'pdf',
                fileName: 'research-summary-{{date}}',
                template: '{{analysis}}'
              },
              inputs: [{ id: 'main', type: 'target', position: 'left', label: 'Input', dataType: 'object' }],
              outputs: [{ id: 'main', type: 'source', position: 'right', label: 'File Info', dataType: 'object' }],
              parameters: NODE_DEFINITIONS['file-output'].parameters,
              status: 'idle'
            }
          }
        ];
        break;
    }

    updatePlaygroundState({
      nodes: templateNodes,
      connections: [],
      selectedNodeId: null
    });
  }, [updatePlaygroundState]);

  const getPlaygroundTitle = (num: number) => {
    switch (num) {
      case 1: return "Simple Workflow Builder";
      case 2: return "Advanced Agent Configuration";
      case 3: return "Template-Based Workflows";
      default: return "AI Playground";
    }
  };

  const getPlaygroundDescription = (num: number) => {
    switch (num) {
      case 1: return "Drag and drop components to build basic AI workflows";
      case 2: return "Configure complex multi-agent systems with advanced settings";
      case 3: return "Start with pre-built templates for common academic tasks";
      default: return "";
    }
  };

  const selectedNode = currentState.nodes.find(node => node.id === currentState.selectedNodeId) || null;

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      backgroundColor: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Node Palette */}
      <NodePalette onAddNode={addNode} />

      {/* Main Content */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '60px'
        }}>
          <div>
            <h1 style={{
              margin: '0 0 4px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🧠 AI Playground
              <span style={{
                fontSize: '12px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: '500'
              }}>
                {currentState.nodes.length} nodes
              </span>
            </h1>
            <p style={{
              margin: '0',
              color: '#64748b',
              fontSize: '14px'
            }}>
              {getPlaygroundDescription(currentPlayground)}
            </p>
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={executeWorkflow}
              disabled={isExecuting || currentState.nodes.length === 0}
              style={{
                padding: '8px 16px',
                backgroundColor: isExecuting ? '#94a3b8' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isExecuting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isExecuting ? '⏳' : '▶️'} {isExecuting ? 'Running...' : 'Execute'}
            </button>

            <button
              onClick={saveWorkflow}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              💾 Save
            </button>

            <button
              onClick={exportWorkflow}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              📤 Export
            </button>

            <label style={{
              padding: '8px 16px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              📥 Import
              <input
                type="file"
                accept=".json"
                onChange={importWorkflow}
                style={{ display: 'none' }}
              />
            </label>

            <button
              onClick={clearWorkflow}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              🗑️ Clear
            </button>
          </div>
        </div>

        {/* Playground Selector */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '8px 24px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <span style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginRight: '12px'
          }}>
            Playground:
          </span>
          {[1, 2, 3].map(num => (
            <button
              key={num}
              onClick={() => setCurrentPlayground(num as 1 | 2 | 3)}
              style={{
                padding: '6px 12px',
                backgroundColor: currentPlayground === num ? '#3b82f6' : 'white',
                color: currentPlayground === num ? 'white' : '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              {num}. {getPlaygroundTitle(num)}
            </button>
          ))}

          {currentPlayground === 3 && (
            <div style={{
              marginLeft: '16px',
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: '13px',
                color: '#6b7280'
              }}>
                Templates:
              </span>
              <button
                onClick={() => loadTemplate('academic')}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Academic
              </button>
              <button
                onClick={() => loadTemplate('admin')}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Admin
              </button>
              <button
                onClick={() => loadTemplate('research')}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Research
              </button>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          <WorkflowCanvas
            nodes={currentState.nodes}
            connections={currentState.connections}
            selectedNodeId={currentState.selectedNodeId}
            onNodesChange={(nodes) => updatePlaygroundState({ nodes })}
            onConnectionsChange={updateConnections}
            onNodeSelect={selectNode}
            onNodeDoubleClick={(nodeId) => {
              // Open node configuration modal
              selectNode(nodeId);
            }}
          />
        </div>
      </div>

      {/* Property Panel */}
      <PropertyPanel
        selectedNode={selectedNode}
        onNodeUpdate={updateNode}
        onClose={() => selectNode(null)}
      />

      {/* Execution Panel (if needed) */}
      {showExecutionPanel && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '300px',
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          zIndex: 1000
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h4 style={{
              margin: '0',
              fontSize: '14px',
              fontWeight: '600',
              color: '#1e293b'
            }}>
              Execution Status
            </h4>
            <button
              onClick={() => setShowExecutionPanel(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          </div>
          <div style={{
            padding: '16px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {currentState.nodes.map(node => (
              <div
                key={node.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 0',
                  fontSize: '12px'
                }}
              >
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor:
                    node.data.status === 'success' ? '#10b981' :
                    node.data.status === 'error' ? '#ef4444' :
                    node.data.status === 'running' ? '#f59e0b' : '#6b7280'
                }} />
                <span style={{ color: '#374151' }}>{node.data.label}</span>
                <span style={{
                  color: '#6b7280',
                  textTransform: 'capitalize',
                  marginLeft: 'auto'
                }}>
                  {node.data.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}