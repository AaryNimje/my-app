'use client';
import React from 'react';
import { EnhancedLLMPlayground } from '@/components/llm-playground/EnhancedLLMPlayground';

export default function LLMPlaygroundPage() {
  return (
    <div className="h-screen">
      <EnhancedLLMPlayground />
    </div>
  );
}