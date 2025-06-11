"use client";
import React, { useState } from 'react';
import { WorkflowNode, NodeParameter } from '@/types/workflow';
import { NODE_DEFINITIONS } from '@/lib/nodes';

interface PropertyPanelProps {
  selectedNode: WorkflowNode | null;
  onNodeUpdate: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  onClose: () => void;
}

export default function PropertyPanel({ selectedNode, onNodeUpdate, onClose }: PropertyPanelProps) {
  const [activeTab, setActiveTab] = useState<'settings' | 'data' | 'notes'>('settings');

  if (!selectedNode) {
    return (
      <div style={{
        width: '400px',
        height: '100%',
        backgroundColor: '#f8fafc',
        borderLeft: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: 'white'
        }}>
          <h3 style={{
            margin: '0',
            fontSize: '16px',
            fontWeight: '600',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ⚙️ Properties
          </h3>
        </div>
        
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          textAlign: 'center',
          color: '#64748b',
          padding: '40px'
        }}>
          <div style={{