import { NodeProps } from '@xyflow/react';

export interface BaseNodeData {
  label: string;
  [key: string]: any;
}

export interface FileInputNodeData extends BaseNodeData {
  fileName?: string;
  fileType?: string;
  fileSize?: number;
}

export interface LLMNodeData extends BaseNodeData {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AgentNodeData extends BaseNodeData {
  agentType?: string;
  tools?: string[];
  memory?: string;
}

export interface OutputNodeData extends BaseNodeData {
  outputType?: string;
  format?: string;
}

export interface ConditionNodeData extends BaseNodeData {
  condition?: string;
  operator?: string;
  value?: any;
}

export interface ToolNodeData extends BaseNodeData {
  toolName?: string;
  toolType?: string;
  parameters?: Record<string, any>;
}

export type CustomNodeProps<T = BaseNodeData> = NodeProps<T>;