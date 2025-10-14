import { motion } from 'framer-motion';
import { Save, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { StandaloneDeviceService } from '../../services/api';
import { StandaloneDeviceDialogProps } from '../../types/components';
import { StandaloneDevice } from '../../types/entities';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

const StandaloneDeviceDialog: React.FC<StandaloneDeviceDialogProps> = ({ device, onClose }) => {
  const [formData, setFormData] = useState<Omit<StandaloneDevice, 'id'>>(device || {
    name: '',
    device_type: 'router',
    manufacturer: '',
    model: '',
    x_position: 100,
    y_position: 100,
    icon_color: 'blue',
    port_count: 0,
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Please enter a device name');
      return;
    }

    try {
      if (device?.id) {
        await StandaloneDeviceService.update(device.id, formData);
        toast.success('Device updated successfully');
      } else {
        await StandaloneDeviceService.create(formData);
        toast.success('Device created successfully');
      }
      onClose();
    } catch (error) {
      console.error('Error saving device:', error);
      toast.error('Failed to save device');
    }
  };

  const handleDelete = () => {
    if (!device || !device.id) {
      console.error('Cannot delete: device or device.id is undefined', device);
      toast.error('Cannot delete device: Invalid device data');
      return;
    }
    
    const deviceId = device.id;
    const deviceName = device.name || 'this device';
    
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="text-white font-medium">Delete {deviceName}?</p>
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.dismiss(t.id)}
            className="glass-button"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={async () => {
              try {
                if (!deviceId) {
                  throw new Error('Device ID is undefined');
                }
                await StandaloneDeviceService.delete(deviceId);
                toast.dismiss(t.id);
                toast.success('Device deleted successfully');
                onClose();
              } catch (error) {
                console.error('Error deleting device:', error);
                toast.dismiss(t.id);
                toast.error('Failed to delete device');
              }
            }}
            className="bg-red-500 hover:bg-red-600"
          >
            Delete
          </Button>
        </div>
      </div>
    ), { 
      duration: Infinity, 
      style: { 
        background: 'rgba(20, 25, 35, 0.95)', 
        backdropFilter: 'blur(20px)', 
        border: '1px solid rgba(148, 163, 184, 0.2)' 
      } 
    });
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
            <CardTitle className="text-white">
              {device?.id ? 'Edit Device' : 'Add Network Device'}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/10">
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-300">Device Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Main Router, ISP Gateway"
                    className="glass border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="device_type" className="text-gray-300">Device Type</Label>
                  <Select value={formData.device_type} onValueChange={(v) => setFormData({ ...formData, device_type: v as StandaloneDevice['device_type'] })}>
                    <SelectTrigger className="glass border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      <SelectItem value="isp">ISP/Internet</SelectItem>
                      <SelectItem value="router">Router</SelectItem>
                      <SelectItem value="switch">Switch</SelectItem>
                      <SelectItem value="fiber_switch">Fiber Switch</SelectItem>
                      <SelectItem value="firewall">Firewall</SelectItem>
                      <SelectItem value="server">Server</SelectItem>
                      <SelectItem value="patch_panel">Patch Panel</SelectItem>
                      <SelectItem value="fiber_panel">Fiber Panel</SelectItem>
                      <SelectItem value="ups">UPS</SelectItem>
                      <SelectItem value="pdu">PDU</SelectItem>
                      <SelectItem value="load_balancer">Load Balancer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manufacturer" className="text-gray-300">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="e.g., Cisco, Ubiquiti"
                    className="glass border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model" className="text-gray-300">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g., ISR4331"
                    className="glass border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="icon_color" className="text-gray-300">Icon Color</Label>
                  <Select value={formData.icon_color} onValueChange={(v) => setFormData({ ...formData, icon_color: v as StandaloneDevice['icon_color'] })}>
                    <SelectTrigger className="glass border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="purple">Purple</SelectItem>
                      <SelectItem value="cyan">Cyan</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                      <SelectItem value="orange">Orange</SelectItem>
                      <SelectItem value="red">Red</SelectItem>
                      <SelectItem value="yellow">Yellow</SelectItem>
                      <SelectItem value="pink">Pink</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="port_count" className="text-gray-300">Port Count</Label>
                  <Input
                    id="port_count"
                    type="number"
                    value={formData.port_count}
                    onChange={(e) => setFormData({ ...formData, port_count: parseInt(e.target.value) || 0 })}
                    className="glass border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-gray-300">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional details about this device..."
                  className="glass border-white/10 text-white placeholder:text-gray-500 min-h-[100px]"
                />
              </div>

              <div className="flex justify-between gap-3 pt-4">
                {device?.id && (
                  <Button type="button" variant="outline" onClick={handleDelete} className="glass border-red-500/30 text-red-400 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
                <div className="flex gap-3 ml-auto">
                  <Button type="button" variant="outline" onClick={onClose} className="glass border-white/10 hover:bg-white/10">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                    <Save className="w-4 h-4 mr-2" />
                    {device?.id ? 'Update' : 'Create'}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default StandaloneDeviceDialog;