import { Save, X } from 'lucide-react';
import React, { useState } from 'react';
import { DevicePropertiesPanelProps } from '../../types/components';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

const DevicePropertiesPanel: React.FC<DevicePropertiesPanelProps> = ({ device, onUpdate, onClose }) => {
  const [name, setName] = useState(device.name);
  const [model, setModel] = useState(device.model || '');
  const [portCount, setPortCount] = useState(device.port_count || 0);
  const [powerWatts, setPowerWatts] = useState(device.power_watts || 0);
  const [notes, setNotes] = useState(device.notes || '');

  const handleSave = () => {
    onUpdate({
      name,
      model,
      port_count: portCount,
      power_watts: powerWatts,
      notes
    });
  };

  return (
    <Card className="glass-card border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Device Properties</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-white/10"
          >
            <X className="w-4 h-4 text-gray-400" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="deviceName" className="text-gray-300">Device Name</Label>
          <Input
            id="deviceName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="glass border-white/10 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="model" className="text-gray-300">Model</Label>
          <Input
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="glass border-white/10 text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="portCount" className="text-gray-300">Port Count</Label>
            <Input
              id="portCount"
              type="number"
              value={portCount}
              onChange={(e) => setPortCount(parseInt(e.target.value) || 0)}
              className="glass border-white/10 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="powerWatts" className="text-gray-300">Power (W)</Label>
            <Input
              id="powerWatts"
              type="number"
              value={powerWatts}
              onChange={(e) => setPowerWatts(parseFloat(e.target.value) || 0)}
              className="glass border-white/10 text-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="text-gray-300">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="glass border-white/10 text-white placeholder:text-gray-500 min-h-[100px]"
            placeholder="Add notes about this device..."
          />
        </div>

        <Button
          onClick={handleSave}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>

        <div className="pt-4 border-t border-white/10">
          <p className="text-xs text-gray-400">
            Position: U{device.position_u} - U{device.position_u + device.size_u - 1}
          </p>
          <p className="text-xs text-gray-400">
            Size: {device.size_u} Rack Units
          </p>
          <p className="text-xs text-gray-400">
            Type: {device.device_type.replace(/_/g, ' ')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DevicePropertiesPanel;