'use client';

import React from 'react';
import { SimpleAIPlayground } from '@/components/workflow/SimpleAIPlayground';

export default function AIPlaygroundPage() {
  const handleSave = (workflow: any) => {
    console.log('Saving workflow:', workflow);
    // In a real app, you would call an API to save the workflow
  };

  const handleExecute = async (workflow: any): Promise<void> => {
    console.log('Executing workflow:', workflow);
    // In a real app, you would call an API to execute the workflow
    
    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Don't return anything as the return type is void
    console.log('Workflow executed successfully');
  };

  return (
    <div className="h-screen">
      <SimpleAIPlayground
        onSave={handleSave}
        onExecute={handleExecute}
        readonly={false}
      />
    </div>
  );
}