// src/app/dashboard/llm-playground/page.tsx
'use client';

import React from 'react';
import { LLMPlayground } from '@/components/llm-playground/LLMPlayground';

export default function LLMPlaygroundPage() {
  return (
    <div className="h-screen">
      <LLMPlayground />
    </div>
  );
}