'use client';

import React, { useState } from 'react';
import { WorkflowCanvas } from './WorkflowCanvas';

interface AIPlaygroundProps {
  onSaveAction: (workflow: any) => void;
  onExecuteAction: (workflow: any) => Promise<void>;
  readonly?: boolean;
}

export const AIPlayground: React.FC<AIPlaygroundProps> = ({ 
  onSaveAction, 
  onExecuteAction, 
  readonly = false 
}) => {
  const [activeTab, setActiveTab] = useState('canvas');

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - Node Palette */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Node Palette</h2>
        </div>
        <div className="p-4">
          <div className="space-y-2">
            <div className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <span>📁</span>
                <div>
                  <div className="font-medium text-sm">File Input</div>
                  <div className="text-xs text-gray-500">Upload files</div>
                </div>
              </div>
            </div>
            <div className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <span>🧠</span>
                <div>
                  <div className="font-medium text-sm">LLM Model</div>
                  <div className="text-xs text-gray-500">AI processing</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">AI Playground</h1>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Execute
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1" style={{ height: 'calc(100vh - 80px)' }}>
          <WorkflowCanvas />
        </div>
      </div>

      {/* Right Sidebar - Properties */}
      <div className="w-80 bg-white border-l border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Properties</h2>
        </div>
        <div className="p-4">
          <div className="text-center text-gray-500">
            <p className="text-sm">Select a node to view properties</p>
          </div>
        </div>
      </div>
    </div>
  );
};