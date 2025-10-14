
import { motion } from 'framer-motion';
import { Cable, X } from 'lucide-react';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { TopologyConnectionService } from '../../services/api';
import { TopologyConnectionDialogProps } from '../../types/components';
import { TopologyConnection } from '../../types/entities';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const TopologyConnectionDialog: React.FC<TopologyConnectionDialogProps> = ({ devices, onClose }) => {
  const [sourceId, setSourceId] = useState('');
  const [sourceType, setSourceType] = useState<TopologyConnection['source_type']>('standalone');
  const [destId, setDestId] = useState('');
  const [destType, setDestType] = useState<TopologyConnection['destination_type']>('standalone');
  const [connectionType, setConnectionType] = useState<TopologyConnection['connection_type']>('fiber');
  const [bandwidth, setBandwidth] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !destId) {
      toast.error('Please select both source and destination');
      return;
    }

    try {
      await TopologyConnectionService.create({
        source_device_id: sourceId,
        source_type: sourceType,
        destination_device_id: destId,
        destination_type: destType,
        connection_type: connectionType,
        bandwidth,
        description
      });
      toast.success('Connection created successfully');
      onClose();
    } catch (error) {
      console.error('Error creating connection:', error);
      toast.error('Failed to create connection');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl"
      >
        <Card className="glass-card border-white/10">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/10">
            <CardTitle className="text-white flex items-center gap-2">
              <Cable className="w-5 h-5" />
              Create Topology Connection
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/10">
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sourceType" className="text-gray-300">Source Type</Label>
                  <Select value={sourceType} onValueChange={(v) => setSourceType(v as TopologyConnection['source_type'])}>
                    <SelectTrigger className="glass border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      <SelectItem value="standalone">Standalone Device</SelectItem>
                      <SelectItem value="rack">Rack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sourceId" className="text-gray-300">Source Device *</Label>
                  <Select value={sourceId} onValueChange={setSourceId}>
                    <SelectTrigger className="glass border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      {devices.map(device => (
                        <SelectItem key={device.id} value={device.id}>
                          {device.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destType" className="text-gray-300">Destination Type</Label>
                  <Select value={destType} onValueChange={(v) => setDestType(v as TopologyConnection['destination_type'])}>
                    <SelectTrigger className="glass border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      <SelectItem value="standalone">Standalone Device</SelectItem>
                      <SelectItem value="rack">Rack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destId" className="text-gray-300">Destination Device *</Label>
                  <Select value={destId} onValueChange={setDestId}>
                    <SelectTrigger className="glass border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      {devices.map(device => (
                        <SelectItem key={device.id} value={device.id}>
                          {device.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="connectionType" className="text-gray-300">Connection Type</Label>
                  <Select value={connectionType} onValueChange={(v) => setConnectionType(v as TopologyConnection['connection_type'])}>
                    <SelectTrigger className="glass border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      <SelectItem value="fiber">Fiber</SelectItem>
                      <SelectItem value="ethernet">Ethernet</SelectItem>
                      <SelectItem value="sfp">SFP/SFP+</SelectItem>
                      <SelectItem value="qsfp">QSFP</SelectItem>
                      <SelectItem value="dac">DAC</SelectItem>
                      <SelectItem value="wireless">Wireless</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bandwidth" className="text-gray-300">Bandwidth</Label>
                  <Input
                    id="bandwidth"
                    value={bandwidth}
                    onChange={(e) => setBandwidth(e.target.value)}
                    placeholder="e.g., 10G, 100G"
                    className="glass border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-300">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Connection purpose or details"
                  className="glass border-white/10 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onClose} className="glass border-white/10 hover:bg-white/10">
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
                  <Cable className="w-4 h-4 mr-2" />
                  Create Connection
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default TopologyConnectionDialog;