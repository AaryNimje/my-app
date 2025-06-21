import { NodeProps, Node } from '@xyflow/react';

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

// Correct way to define custom node props
export type CustomNodeProps<T extends BaseNodeData = BaseNodeData> = NodeProps<Node<T>>;

// Alternative approach if you want to be more explicit
export type FileInputNodeProps = NodeProps<Node<FileInputNodeData>>;
export type LLMNodeProps = NodeProps<Node<LLMNodeData>>;
export type AgentNodeProps = NodeProps<Node<AgentNodeData>>;
export type OutputNodeProps = NodeProps<Node<OutputNodeData>>;
export type ConditionNodeProps = NodeProps<Node<ConditionNodeData>>;
export type ToolNodeProps = NodeProps<Node<ToolNodeData>>;