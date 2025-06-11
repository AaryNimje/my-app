'use client';

import React from 'react';
import { AIPlayground } from '@/components/workflow/AIPlayground';

// Use the local types from the components instead of importing conflicting types
interface NodeHandle {
  id: string;
  type: 'source' | 'target';
  position: 'top' | 'right' | 'bottom' | 'left';
  label?: string;
  dataType?: string;
}

interface WorkflowNode {
  id: string;
  type: string; // Using string instead of strict union to match component implementation
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    config: Record<string, any>;
    inputs?: NodeHandle[];
    outputs?: NodeHandle[];
    parameters?: any[];
    status?: 'idle' | 'running' | 'success' | 'error';
    lastRun?: string;
  };
  width?: number;
  height?: number;
}

interface WorkflowConnection {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  data?: {
    label?: string;
    animated?: boolean;
  };
}

interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  settings: {
    errorWorkflow?: string;
    timezone: string;
    saveExecutions: boolean;
    saveSuccessfulExecutions: boolean;
    saveFailedExecutions: boolean;
  };
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export default function AIPlaygroundPage() {
  const handleSave = (workflow: Workflow) => {
    console.log('Saving workflow:', workflow);
    // TODO: Implement API call to save workflow
  };

  const handleExecute = async (workflow: Workflow) => {
    console.log('Executing workflow:', workflow);
    // TODO: Implement workflow execution
  };

  return (
    <div className="h-screen">
      <AIPlayground
        onSave={handleSave}
        onExecute={handleExecute}
        readonly={false}
      />
    </div>
  );
}