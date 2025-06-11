'use client';

import React from 'react';
import { AIPlayground } from '@/components/workflow/AIPlayground';

export default function AIPlaygroundPage() {
  const handleSaveAction = (workflow: any) => {
    console.log('Saving workflow:', workflow);
  };

  const handleExecuteAction = async (workflow: any) => {
    console.log('Executing workflow:', workflow);
  };

  return <AIPlayground onSaveAction={handleSaveAction} onExecuteAction={handleExecuteAction} readonly={false} />;
}