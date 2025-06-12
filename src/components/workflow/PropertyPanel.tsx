// src/components/workflow/PropertyPanel.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, MultiSelect } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

// Define the Node type to avoid importing from ReactFlow
interface Node {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: any;
}

// Define the simplified NODE_TYPES structure (imported from NodePalette in real implementation)
import { NODE_TYPES } from './NodePalette';

interface PropertyPanelProps {
  selectedNode: Node | null;
  onUpdateNodeData: (nodeId: string, data: any) => void;
}

export function PropertyPanel({ selectedNode, onUpdateNodeData }: PropertyPanelProps) {
  if (!selectedNode) {
    return (
      <div className="w-64 bg-card border-l border-border">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Properties</h2>
        </div>
        <div className="p-4">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Select a node to view properties</p>
          </div>
        </div>
      </div>
    );
  }

  const nodeTypeInfo = NODE_TYPES[selectedNode.type as string];
  if (!nodeTypeInfo) {
    return (
      <div className="w-64 bg-card border-l border-border">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Properties</h2>
        </div>
        <div className="p-4">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Unknown node type</p>
          </div>
        </div>
      </div>
    );
  }

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateNodeData(selectedNode.id, { 
      ...selectedNode.data, 
      label: e.target.value 
    });
  };

  const handleConfigChange = (key: string, value: any) => {
    onUpdateNodeData(selectedNode.id, {
      ...selectedNode.data,
      config: {
        ...selectedNode.data.config,
        [key]: value
      }
    });
  };

  // Render different property controls based on config options
  const renderConfigOptions = () => {
    if (!nodeTypeInfo.configOptions) return null;

    return Object.entries(nodeTypeInfo.configOptions).map(([key, option]: [string, any]) => {
      const currentValue = selectedNode.data.config?.[key] ?? option.default;

      switch (option.type) {
        case 'string':
          return (
            <div className="mb-4" key={key}>
              <Label htmlFor={key} className="mb-1 block">
                {option.label}
              </Label>
              <Input
                id={key}
                value={currentValue}
                onChange={(e) => handleConfigChange(key, e.target.value)}
                className="w-full"
              />
            </div>
          );
        
        case 'number':
          return (
            <div className="mb-4" key={key}>
              <Label htmlFor={key} className="mb-1 block">
                {option.label}
              </Label>
              <Input
                id={key}
                type="number"
                min={option.min}
                max={option.max}
                value={currentValue}
                onChange={(e) => handleConfigChange(key, Number(e.target.value))}
                className="w-full"
              />
            </div>
          );
        
        case 'range':
          return (
            <div className="mb-4" key={key}>
              <Label htmlFor={key} className="mb-1 block">
                {option.label}: {currentValue}
              </Label>
              <Slider
                id={key}
                min={option.min}
                max={option.max}
                step={option.step}
                value={currentValue}
                onChange={(value) => handleConfigChange(key, value)}
                className="w-full"
              />
            </div>
          );
        
        case 'boolean':
          return (
            <div className="mb-4 flex items-center justify-between" key={key}>
              <Switch
                id={key}
                checked={currentValue}
                onCheckedChange={(checked) => handleConfigChange(key, checked)}
                label={option.label}
              />
            </div>
          );
        
        case 'select':
          return (
            <div className="mb-4" key={key}>
              <Label htmlFor={key} className="mb-1 block">
                {option.label}
              </Label>
              <Select
                id={key}
                value={currentValue}
                onChange={(value) => handleConfigChange(key, value)}
                options={option.options}
                className="w-full"
              />
            </div>
          );
        
        case 'multiSelect':
          return (
            <div className="mb-4" key={key}>
              <MultiSelect
                options={option.options}
                value={Array.isArray(currentValue) ? currentValue : []}
                onChange={(values) => handleConfigChange(key, values)}
                label={option.label}
              />
            </div>
          );
        
        default:
          return null;
      }
    });
  };

  return (
    <div className="w-64 bg-card border-l border-border">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Properties</h2>
      </div>
      <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 64px)' }}>
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2" style={{ backgroundColor: `${nodeTypeInfo.color}20` }}>
              <span className="text-lg">{nodeTypeInfo.icon}</span>
            </div>
            <div>
              <h3 className="font-medium">{selectedNode.data.label}</h3>
              <p className="text-xs text-muted-foreground">{nodeTypeInfo.description}</p>
            </div>
          </div>
        </div>
        
        <Card className="mb-4">
          <CardContent className="p-3">
            <Label htmlFor="node-name" className="mb-1 block">
              Node Name
            </Label>
            <Input
              id="node-name"
              value={selectedNode.data.label}
              onChange={handleLabelChange}
              className="w-full"
            />
          </CardContent>
        </Card>
        
        <div className="space-y-4">
          {renderConfigOptions()}
        </div>
        
        {/* Show connection info */}
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">Connections</h3>
          
          {nodeTypeInfo.inputs && nodeTypeInfo.inputs.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Inputs</h4>
              <div className="space-y-1">
                {nodeTypeInfo.inputs.map((input: any) => (
                  <div key={input.id} className="flex items-center text-xs">
                    <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                    {input.label}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {nodeTypeInfo.outputs && nodeTypeInfo.outputs.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Outputs</h4>
              <div className="space-y-1">
                {nodeTypeInfo.outputs.map((output: any) => (
                  <div key={output.id} className="flex items-center text-xs">
                    <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                    {output.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}