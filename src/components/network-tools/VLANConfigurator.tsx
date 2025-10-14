
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Layers, Plus, Trash2 } from 'lucide-react'; // Corrected: Added Layers to the import
import React, { useState } from 'react';
import { VLAN } from '../../types/components';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

export const VLANConfigurator: React.FC = () => {
  // includes placeholder data
  const [vlans, setVlans] = useState<VLAN[]>([
    { id: 1, vlan_id: '10', name: 'Management', description: 'Network management and monitoring', color: 'blue', ports: '1-8' },
    { id: 2, vlan_id: '20', name: 'Servers', description: 'Production server network', color: 'purple', ports: '9-16' },
    { id: 3, vlan_id: '30', name: 'Users', description: 'End user workstations', color: 'green', ports: '17-40' },
  ]);

  const [newVlan, setNewVlan] = useState<Omit<VLAN, 'id'>>({
    vlan_id: '',
    name: '',
    description: '',
    color: 'blue',
    ports: ''
  });

  const colorOptions = [
    { value: 'blue', label: 'Blue', class: 'from-blue-500 to-blue-600' },
    { value: 'purple', label: 'Purple', class: 'from-purple-500 to-purple-600' },
    { value: 'green', label: 'Green', class: 'from-green-500 to-emerald-600' },
    { value: 'orange', label: 'Orange', class: 'from-orange-500 to-orange-600' },
    { value: 'cyan', label: 'Cyan', class: 'from-cyan-500 to-cyan-600' },
    { value: 'red', label: 'Red', class: 'from-red-500 to-red-600' },
  ];

  const addVlan = () => {
    if (!newVlan.vlan_id || !newVlan.name) {
      alert('Please enter VLAN ID and name');
      return;
    }

    setVlans([...vlans, { ...newVlan, id: Date.now() }]);
    setNewVlan({ vlan_id: '', name: '', description: '', color: 'blue', ports: '' });
  };

  const removeVlan = (id: VLAN['id']) => {
    setVlans(vlans.filter(v => v.id !== id));
  };

  const exportConfig = () => {
    const config = vlans.map(v => 
      `vlan ${v.vlan_id}\n name ${v.name}\n description ${v.description}`
    ).join('\n\n');
    
    const blob = new Blob([config], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vlan-config.txt';
    a.click();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Add New VLAN</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vlan_id" className="text-gray-300">VLAN ID *</Label>
              <Input
                id="vlan_id"
                value={newVlan.vlan_id}
                onChange={(e) => setNewVlan({ ...newVlan, vlan_id: e.target.value })}
                placeholder="e.g., 100"
                className="glass border-white/10 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300">VLAN Name *</Label>
              <Input
                id="name"
                value={newVlan.name}
                onChange={(e) => setNewVlan({ ...newVlan, name: e.target.value })}
                placeholder="e.g., Guest WiFi"
                className="glass border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-300">Description</Label>
            <Textarea
              id="description"
              value={newVlan.description}
              onChange={(e) => setNewVlan({ ...newVlan, description: e.target.value })}
              placeholder="Purpose of this VLAN..."
              className="glass border-white/10 text-white placeholder:text-gray-500 min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ports" className="text-gray-300">Port Assignment</Label>
            <Input
              id="ports"
              value={newVlan.ports}
              onChange={(e) => setNewVlan({ ...newVlan, ports: e.target.value })}
              placeholder="e.g., 1-24, 48"
              className="glass border-white/10 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Color Tag</Label>
            <div className="grid grid-cols-3 gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setNewVlan({ ...newVlan, color: color.value })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    newVlan.color === color.value
                      ? 'border-white glow'
                      : 'border-white/20 hover:border-white/40'
                  } bg-gradient-to-br ${color.class}`}
                >
                  <span className="text-white text-sm font-medium">{color.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={addVlan}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add VLAN
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="glass-card border-white/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">VLAN Configuration ({vlans.length})</CardTitle>
            <Button
              onClick={exportConfig}
              variant="outline"
              size="sm"
              className="glass border-white/10 hover:bg-white/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <AnimatePresence>
              {vlans.map((vlan, index) => {
                const color = colorOptions.find(c => c.value === vlan.color);
                return (
                  <motion.div
                    key={vlan.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass-card border-white/10 rounded-lg p-4 hover:border-white/20 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${color!.class} animate-pulse`} />
                          <h3 className="font-bold text-white">VLAN {vlan.vlan_id}</h3>
                          <Badge variant="outline" className="border-white/20 text-gray-300">
                            {vlan.name}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{vlan.description}</p>
                        {vlan.ports && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Ports:</span>
                            <code className="text-xs text-blue-400 glass px-2 py-1 rounded">{vlan.ports}</code>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeVlan(vlan.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {vlans.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" /> {/* Corrected: Used Layers component */}
                <p>No VLANs configured yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VLANConfigurator;