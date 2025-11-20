import { Box, Database, Layers, Server } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { applyTemplate, getTemplates, type RackTemplate } from '../../utils/rackTemplates';
import type { Device, RackConfiguration } from '../../types/entities';

interface RackTemplateDialogProps {
  onApply: (rack: RackConfiguration, devices: Device[]) => void;
  onClose: () => void;
}

export default function RackTemplateDialog({ onApply, onClose }: RackTemplateDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<RackTemplate | null>(null);
  const [customRackName, setCustomRackName] = useState('');
  const templates = getTemplates();

  const handleApplyTemplate = () => {
    if (!selectedTemplate) return;

    const rackId = `rack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { rack, devices } = applyTemplate(selectedTemplate, rackId, customRackName || undefined);

    onApply(rack, devices);
    onClose();
  };

  const getCategoryIcon = (category: RackTemplate['category']) => {
    switch (category) {
      case 'networking': return Layers;
      case 'compute': return Server;
      case 'storage': return Database;
      case 'mixed': return Box;
      default: return Box;
    }
  };

  const getCategoryColor = (category: RackTemplate['category']) => {
    switch (category) {
      case 'networking': return 'from-blue-500 to-cyan-600';
      case 'compute': return 'from-purple-500 to-pink-600';
      case 'storage': return 'from-orange-500 to-amber-600';
      case 'mixed': return 'from-green-500 to-emerald-600';
      default: return 'from-gray-500 to-slate-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="glass-panel border-white/15 rounded-2xl max-w-5xl w-full p-8 my-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold gradient-text mb-2">Choose a Rack Template</h2>
          <p className="text-gray-300">Start with a pre-configured rack setup and customize it to your needs</p>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {templates.map((template) => {
            const Icon = getCategoryIcon(template.category);
            const gradient = getCategoryColor(template.category);
            const isSelected = selectedTemplate?.id === template.id;

            return (
              <Card
                key={template.id}
                className={`glass-card cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-500/50 ring-2 ring-blue-500/30'
                    : 'border-white/10 hover:border-white/20'
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-white mb-1">{template.name}</h3>
                      <div className="flex items-center gap-2">
                        <Badge className={`bg-gradient-to-r ${gradient} text-white text-xs`}>
                          {template.category}
                        </Badge>
                        <span className="text-sm text-gray-400">{template.size_u}U Rack</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-300 text-sm mb-4">{template.description}</p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Devices:</span>
                      <span className="text-white font-semibold">{template.devices.length} pre-configured</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Total Power:</span>
                      <span className="text-yellow-400 font-semibold">
                        {template.devices.reduce((sum, d) => sum + (d.power_watts || 0), 0)}W
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Utilization:</span>
                      <span className="text-cyan-400 font-semibold">
                        {template.devices.reduce((sum, d) => sum + d.size_u, 0)}/{template.size_u}U
                        ({Math.round((template.devices.reduce((sum, d) => sum + d.size_u, 0) / template.size_u) * 100)}%)
                      </span>
                    </div>
                  </div>

                  {template.tags && template.tags.length > 0 && (
                    <div className="flex gap-2 mt-4 flex-wrap">
                      {template.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="border-white/20 text-gray-400 text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Custom Name Input */}
        {selectedTemplate && (
          <div className="glass-card border-white/10 rounded-xl p-6 mb-6">
            <Label className="text-sm font-medium text-gray-400 mb-2">Custom Rack Name (Optional)</Label>
            <Input
              type="text"
              value={customRackName}
              onChange={(e) => setCustomRackName(e.target.value)}
              placeholder={selectedTemplate.name}
              className="glass-input border-white/10 text-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to use template name: "{selectedTemplate.name}"
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            className="glass-button text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApplyTemplate}
            disabled={!selectedTemplate}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Template
          </Button>
        </div>
      </div>
    </div>
  );
}
