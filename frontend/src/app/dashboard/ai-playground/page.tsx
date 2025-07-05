// src/app/dashboard/ai-playground/page.tsx
'use client';

import React from 'react';
import { AIPlayground } from '@/components/workflow/AIPlayground';

export default function AIPlaygroundPage() {
  return (
    <div className="h-screen">
      <AIPlayground />
    </div>
  );
}