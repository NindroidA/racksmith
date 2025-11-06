import { motion } from 'framer-motion';
import { Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CustomDeviceService } from '../../services/api';
import { CustomDeviceDialogProps } from '../../types/components';
import { CustomDevice } from '../../types/entities';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

const CustomDeviceDialog: React.FC<CustomDeviceDialogProps> = ({ device, onSave, onClose }) => {
  const [formData, setFormData] = useState<Omit<CustomDevice, 'id'>>(device || {
    name: '',
    manufacturer: '',
    model: '',
    device_type: 'other' as CustomDevice['device_type'],
    size_u: 1,
    port_count: 0,
    power_watts: 0,
    description: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = !!device;

  // Load device data if editing
  useEffect(() => {
    if (device) {
      setFormData({
        name: device.name,
        manufacturer: device.manufacturer,
        model: device.model,
        device_type: device.device_type,
        size_u: device.size_u,
        port_count: device.port_count || 0,
        power_watts: device.power_watts || 0,
        description: device.description || '',
      });
    }
  }, [device]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast.error('Device name is required');
      return;
    }
    if (!formData.manufacturer.trim()) {
      toast.error('Manufacturer is required');
      return;
    }

    setIsSaving(true);
    try {
      let savedDevice: CustomDevice;
      
      if (isEditing && device?.id) {
        // Update existing device
        savedDevice = await CustomDeviceService.update(device.id, formData);
        toast.success('Device updated successfully');
      } else {
        // Create new device
        savedDevice = await CustomDeviceService.create(formData);
        toast.success('Device created successfully');
      }
      
      onSave(savedDevice);
      onClose();
    } catch (error) {
      console.error('Failed to save device:', error);
      toast.error(isEditing ? 'Failed to update device' : 'Failed to create device');
    } finally {
      setIsSaving(false);
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
            <div>
              <CardTitle className="text-white">
                {isEditing ? 'Edit Custom Device' : 'Add Custom Device'}
              </CardTitle>
              <p className="text-sm text-gray-400 mt-1">
                {isEditing ? 'Update device information' : 'Create a new custom device for your library'}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} disabled={isSaving} className="hover:bg-white/10">
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
                    placeholder="e.g., Custom Server"
                    className="glass border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manufacturer" className="text-gray-300">Manufacturer *</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="e.g., Dell, HP"
                    className="glass border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model" className="text-gray-300">Model Number</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g., R730"
                    className="glass border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="device_type" className="text-gray-300">Device Type</Label>
                  <Select 
                    value={formData.device_type!} 
                    onValueChange={(v) => setFormData({ ...formData, device_type: v as CustomDevice['device_type'] })}
                  >
                    <SelectTrigger className="glass border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      <SelectItem value="router">Router</SelectItem>
                      <SelectItem value="switch">Switch</SelectItem>
                      <SelectItem value="fiber_switch">Fiber Switch</SelectItem>
                      <SelectItem value="ups">UPS</SelectItem>
                      <SelectItem value="patch_panel">Patch Panel</SelectItem>
                      <SelectItem value="server">Server</SelectItem>
                      <SelectItem value="firewall">Firewall</SelectItem>
                      <SelectItem value="load_balancer">Load Balancer</SelectItem>
                      <SelectItem value="storage">Storage</SelectItem>
                      <SelectItem value="pdu">PDU</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="size_u" className="text-gray-300">Size (Rack Units)</Label>
                  <Select value={formData.size_u!.toString()} onValueChange={(v) => setFormData({ ...formData, size_u: parseInt(v) })}>
                    <SelectTrigger className="glass border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(size => (
                        <SelectItem key={size} value={size.toString()}>{size}U</SelectItem>
                      ))}
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

                <div className="space-y-2">
                  <Label htmlFor="power_watts" className="text-gray-300">Power (Watts)</Label>
                  <Input
                    id="power_watts"
                    type="number"
                    value={formData.power_watts}
                    onChange={(e) => setFormData({ ...formData, power_watts: parseFloat(e.target.value) || 0 })}
                    className="glass border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-300">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add details about this device..."
                  className="glass border-white/10 text-white placeholder:text-gray-500 min-h-[100px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose} 
                  disabled={isSaving}
                  className="glass border-white/10 hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSaving}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : isEditing ? 'Update Device' : 'Create Device'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default CustomDeviceDialog;