'use client';

import React, { useState } from 'react';
import { SimpleAIPlayground } from './SimpleAIPlayground';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/button';

interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    config: Record<string, any>;
  };
}

interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface AIPlaygroundProps {
  onSave?: (workflow: { nodes: WorkflowNode[]; connections: WorkflowConnection[] }) => void;
  onExecute?: (workflow: { nodes: WorkflowNode[]; connections: WorkflowConnection[] }) => Promise<void>;
  readonly?: boolean;
}

export function AIPlayground({ onSave, onExecute, readonly = false }: AIPlaygroundProps) {
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const [showTemplates, setShowTemplates] = useState(false);
  
  // Template workflows
  const templates = [
    { id: 'template1', name: 'Quiz Generator', description: 'Generate quizzes from documents' },
    { id: 'template2', name: 'Feedback Assistant', description: 'Analyze and provide feedback on submissions' },
    { id: 'template3', name: 'Data Analysis', description: 'Analyze data from spreadsheets' },
    { id: 'template4', name: 'Resume Screening', description: 'Screen resumes for job applications' }
  ];
  
  // Handle saving the workflow
  const handleSave = (workflow: { nodes: WorkflowNode[]; connections: WorkflowConnection[] }) => {
    // Add workflow name to the data
    const workflowWithName = {
      ...workflow,
      name: workflowName
    };
    
    if (onSave) {
      onSave(workflowWithName);
    }
    
    console.log('Saving workflow:', workflowWithName);
  };
  
  // Handle executing the workflow
  const handleExecute = async (workflow: { nodes: WorkflowNode[]; connections: WorkflowConnection[] }) => {
    if (!onExecute) return Promise.resolve();
    
    console.log('Executing workflow:', workflow);
    return onExecute(workflow);
  };
  
  // Handle loading a template
  const handleLoadTemplate = (templateId: string) => {
    console.log('Loading template:', templateId);
    setShowTemplates(false);
    // In a real implementation, you would load a predefined workflow here
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Top Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">AI Playground</h1>
            <div className="hidden md:flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => setShowTemplates(!showTemplates)}>
                Templates
              </Button>
              <Button variant="outline" size="sm">
                Help
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
          </div>
        </div>
        
        {/* Templates Panel (conditionally rendered) */}
        {showTemplates && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {templates.map(template => (
              <div 
                key={template.id}
                className="p-4 border border-border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleLoadTemplate(template.id)}
              >
                <h3 className="font-medium">{template.name}</h3>
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </div>
            ))}
          </div>
        )}
      </header>
      
      {/* Main Playground Area */}
      <div className="flex-1 overflow-hidden">
        <SimpleAIPlayground 
          onSave={handleSave}
          onExecute={handleExecute}
          readonly={readonly}
        />
      </div>
    </div>
  );
}