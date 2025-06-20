export interface WorkflowNode {
    id: string;
    type: 'trigger' | 'file' | 'agent' | 'llm' | 'memory' | 'tool' | 'condition' | 'output' | 'webhook';
    position: { x: number; y: number };
    data: {
      label: string;
      description?: string;
      config: Record<string, any>;
      inputs?: NodeHandle[];
      outputs?: NodeHandle[];
      parameters?: NodeParameter[];
      status?: 'idle' | 'running' | 'success' | 'error';
      lastRun?: string;
    };
    width?: number;
    height?: number;
  }
  
  export interface NodeHandle {
    id: string;
    type: 'source' | 'target';
    position: 'top' | 'right' | 'bottom' | 'left';
    label?: string;
    dataType?: 'string' | 'number' | 'object' | 'array' | 'boolean' | 'file';
  }
  
  export interface NodeParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'json' | 'textarea' | 'file';
    label: string;
    description?: string;
    required?: boolean;
    default?: any;
    options?: Array<{ label: string; value: any }>;
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
    };
  }
  
  export interface WorkflowConnection {
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
  
  export interface WorkflowExecution {
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    startTime: string;
    endTime?: string;
    nodeExecutions: Record<string, NodeExecution>;
    logs: ExecutionLog[];
  }
  
  export interface NodeExecution {
    nodeId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    startTime?: string;
    endTime?: string;
    input?: any;
    output?: any;
    error?: string;
    duration?: number;
  }
  
  export interface ExecutionLog {
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    nodeId?: string;
    data?: any;
  }
  
  export interface Workflow {
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