import { Save, Settings, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Device } from '../../types/entities';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectItem } from '../ui/select';

interface DeviceDetailsModalProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (device: Device) => void;
  onDelete: (deviceId: string) => void;
  maxPosition: number;
}

const DEVICE_TYPES = [
  { value: 'server', label: 'Server' },
  { value: 'switch', label: 'Switch' },
  { value: 'router', label: 'Router' },
  { value: 'firewall', label: 'Firewall' },
  { value: 'storage', label: 'Storage' },
  { value: 'ups', label: 'UPS' },
  { value: 'pdu', label: 'PDU' },
  { value: 'patch_panel', label: 'Patch Panel' },
  { value: 'fiber_switch', label: 'Fiber Switch' },
  { value: 'load_balancer', label: 'Load Balancer' },
  { value: 'other', label: 'Other' }
];

const MANUFACTURERS = [
  { value: 'cisco', label: 'Cisco' },
  { value: 'ubiquiti', label: 'Ubiquiti' },
  { value: 'dell', label: 'Dell' },
  { value: 'hp', label: 'HP' },
  { value: 'juniper', label: 'Juniper' },
  { value: 'arista', label: 'Arista' },
  { value: 'fs', label: 'FS.com' },
  { value: 'tripplite', label: 'TrippLite' },
  { value: 'custom', label: 'Custom' }
];

export default function DeviceDetailsModal({
  device,
  isOpen,
  onClose,
  onSave,
  onDelete,
  maxPosition
}: DeviceDetailsModalProps) {
  const [formData, setFormData] = useState<Device | null>(null);

  useEffect(() => {
    if (device) {
      setFormData({ ...device });
    }
  }, [device]);

  if (!isOpen || !device || !formData) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Device name is required');
      return;
    }

    if (formData.position_u > maxPosition || formData.position_u < formData.size_u) {
      toast.error(`Invalid position. Must be between ${formData.size_u}U and ${maxPosition}U`);
      return;
    }

    onSave(formData);
    toast.success('Device updated successfully');
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to remove ${device.name}?`)) {
      onDelete(device.id);
      toast.success('Device removed');
      onClose();
    }
  };

  const bottomPosition = formData.position_u - formData.size_u + 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card border-white/20 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Device Details</h2>
              <p className="text-sm text-gray-400">Edit device configuration</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                Basic Information
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Device Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Main Switch"
                    className="glass border-white/10 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Model</Label>
                  <Input
                    value={formData.model || ''}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g., C9300-48P"
                    className="glass border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Manufacturer</Label>
                  <Select
                    value={formData.manufacturer}
                    onValueChange={(v) => setFormData({ ...formData, manufacturer: v as Device['manufacturer'] })}
                    className="glass border-white/10 text-white"
                  >
                    {MANUFACTURERS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Device Type</Label>
                  <Select
                    value={formData.device_type}
                    onValueChange={(v) => setFormData({ ...formData, device_type: v as Device['device_type'] })}
                    className="glass border-white/10 text-white"
                  >
                    {DEVICE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            {/* Physical Specs */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                Physical Specifications
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Size (U)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.size_u}
                    onChange={(e) => {
                      const newSize = Number(e.target.value);
                      setFormData({ 
                        ...formData, 
                        size_u: newSize,
                        position_u: Math.max(formData.position_u, newSize)
                      });
                    }}
                    className="glass border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Top Position (U)</Label>
                  <Input
                    type="number"
                    min={formData.size_u}
                    max={maxPosition}
                    value={formData.position_u}
                    onChange={(e) => setFormData({ ...formData, position_u: Number(e.target.value) })}
                    className="glass border-white/10 text-white"
                  />
                  <p className="text-xs text-gray-500">
                    Occupies: {bottomPosition}U - {formData.position_u}U
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Port Count</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.port_count || 0}
                    onChange={(e) => setFormData({ ...formData, port_count: Number(e.target.value) })}
                    className="glass border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Power Draw (W)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.power_watts || 0}
                    onChange={(e) => setFormData({ ...formData, power_watts: Number(e.target.value) })}
                    className="glass border-white/10 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-gray-300">Notes</Label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this device..."
                rows={3}
                className="w-full px-3 py-2 rounded-md glass border border-white/10 text-white placeholder:text-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10 bg-black/20">
          <Button
            type="button"
            variant="ghost"
            onClick={handleDelete}
            className="text-red-400 hover:bg-red-500/20"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remove Device
          </Button>
          
          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}