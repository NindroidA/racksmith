import { ArrowLeft, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import DeviceDetailsModal from '../components/rack/DeviceDetailsModal';
import DevicePalette from '../components/rack/DevicePalette';
import RackVisualizer from '../components/rack/RackVisualizer';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectItem } from '../components/ui/select';
import { CustomDeviceService, DeviceService, RackConfigurationService } from '../services/api';
import { CustomDevice, Device, RackConfiguration } from '../types/entities';

const RACK_SIZES = [
  { value: 12, label: '12U (Small)' },
  { value: 24, label: '24U (Medium)' },
  { value: 42, label: '42U (Full Rack)' },
  { value: 48, label: '48U (Extended)' }
];

const COLOR_OPTIONS = ['blue', 'purple', 'green', 'red', 'orange', 'cyan'];

export default function RackBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<(Device | CustomDevice)[]>([]);
  const [installedDevices, setInstalledDevices] = useState<Device[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [draggedDeviceSize, setDraggedDeviceSize] = useState<number>(1);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState<RackConfiguration>({
    id: id || 'new',
    name: '',
    size_u: 42,
    location: '',
    color_tag: 'blue',
    description: ''
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load available devices
      const [devices, customDevices] = await Promise.all([
        DeviceService.list(),
        CustomDeviceService.list()
      ]);
      
      // Filter to only uninstalled devices or use custom devices
      const uninstalled = devices.filter(d => !d.rack_config_id || d.rack_config_id === 'new');
      setAvailableDevices([...customDevices, ...uninstalled]);

      // If editing existing rack, load it
      if (id && id !== 'new') {
        const rack = await RackConfigurationService.get(id);
        setFormData(rack);

        // Load installed devices for this rack
        const installed = devices.filter(d => d.rack_config_id === id);
        setInstalledDevices(installed);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load rack data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Rack name is required');
      return;
    }

    setIsLoading(true);
    try {
      let rackId: string;

      if (id && id !== 'new') {
        await RackConfigurationService.update(id, formData);
        rackId = id;
        toast.success('Rack configuration updated');
      } else {
        const newRack = await RackConfigurationService.create(formData);
        rackId = newRack.id;
        toast.success('Rack configuration created');
      }

      // Save all installed devices
      for (const device of installedDevices) {
        if (device.id.startsWith('temp-')) {
          // Create new device
          await DeviceService.create({ ...device, rack_config_id: rackId });
        } else {
          // Update existing device
          await DeviceService.update(device.id, { ...device, rack_config_id: rackId });
        }
      }

      navigate('/racks');
    } catch (error) {
      console.error('Failed to save rack:', error);
      toast.error('Failed to save rack configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeviceDrop = (position: number, device: Device | CustomDevice, isMoving: boolean = false) => {
    const bottomPosition = position - device.size_u + 1;
    
    if (bottomPosition < 1) {
      toast.error(`Device doesn't fit! Would extend below rack`);
      return;
    }

    // Check overlaps (exclude the moving device if it's a move operation)
    const wouldOverlap = installedDevices.some(d => {
      if (isMoving && d.id === device.id) return false;
      const dStart = d.position_u - d.size_u + 1;
      const newStart = position - device.size_u + 1;
      return (
        (newStart >= dStart && newStart <= d.position_u) ||
        (position >= dStart && position <= d.position_u) ||
        (newStart <= dStart && position >= d.position_u)
      );
    });

    if (wouldOverlap) {
      toast.error('Position is occupied!');
      return;
    }

    if (isMoving) {
      // Moving existing device
      setInstalledDevices(prev => {
        const filtered = prev.filter(d => d.id !== device.id);
        const movedDevice: Device = {
          id: device.id,
          rack_config_id: id || 'new',
          name: device.name,
          manufacturer: device.manufacturer as Device['manufacturer'],
          model: device.model || '',
          device_type: device.device_type,
          size_u: device.size_u,
          position_u: position,
          port_count: device.port_count || 0,
          power_watts: device.power_watts || 0
        };
        return [...filtered, movedDevice];
      });
      toast.success(`📦 ${device.name} moved to ${bottomPosition}-${position}U`);
    } else {
      // Adding new device
      const newDevice: Device = {
        id: `temp-${Date.now()}`,
        rack_config_id: id || 'new',
        name: device.name,
        manufacturer: device.manufacturer as Device['manufacturer'],
        model: device.model || '',
        device_type: device.device_type,
        size_u: device.size_u,
        position_u: position,
        port_count: device.port_count || 0,
        power_watts: device.power_watts || 0
      };

      setInstalledDevices(prev => [...prev, newDevice]);
      toast.success(`💧 ${device.name} installed at ${bottomPosition}-${position}U`);
    }

    setSelectedPosition(null);
  };

  const handleDeviceRemove = (deviceId: string) => {
    setInstalledDevices(prev => prev.filter(d => d.id !== deviceId));
    toast.success('Device removed from rack');
  };

  const handlePositionClick = (position: number) => {
    setSelectedPosition(position);
  };

  const handleDeviceClick = (device: Device) => {
    setSelectedDevice(device);
    setIsModalOpen(true);
  };

  const handleDeviceSave = (updatedDevice: Device) => {
    setInstalledDevices(prev => 
      prev.map(d => d.id === updatedDevice.id ? updatedDevice : d)
    );
  };

  // Calculate stats
  const totalPower = installedDevices.reduce((sum, d) => sum + (d.power_watts || 0), 0);
  const totalSpace = installedDevices.reduce((sum, d) => sum + d.size_u, 0);
  const utilization = Math.round((totalSpace / formData.size_u) * 100);

  return (
    <div className="p-8">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/racks')}
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">
                {id && id !== 'new' ? 'Edit Rack' : 'New Rack Configuration'}
              </h1>
              <p className="text-gray-400">Design your rack layout and add devices</p>
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Configuration
          </Button>
        </div>

        {/* Configuration Form */}
        <Card className="glass-card border-white/10 mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-4 gap-6 mb-6">
              <div className="space-y-2">
                <Label className="text-gray-300">Rack Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Server Rack"
                  className="glass border-white/10 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Size (U)</Label>
                <Select
                  value={formData.size_u.toString()}
                  onValueChange={(v) => setFormData({ ...formData, size_u: Number(v) })}
                  className="glass border-white/10 text-white"
                >
                  {RACK_SIZES.map(size => (
                    <SelectItem key={size.value} value={size.value.toString()}>
                      {size.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Location</Label>
                <Input
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Data Center A, Row 1"
                  className="glass border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Color Tag</Label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color_tag: color as RackConfiguration['color_tag'] })}
                      className={`w-10 h-10 rounded-full transition-all ${
                        formData.color_tag === color
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800 scale-110'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        background: color === 'blue' ? '#3b82f6' :
                                  color === 'purple' ? '#a855f7' :
                                  color === 'green' ? '#10b981' :
                                  color === 'red' ? '#ef4444' :
                                  color === 'orange' ? '#f97316' :
                                  '#06b6d4'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/10">
              <div>
                <p className="text-sm text-gray-400 mb-1">Utilization</p>
                <p className="text-3xl font-bold text-white">{utilization}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Power Draw</p>
                <p className="text-3xl font-bold text-white">{totalPower}W</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Space Used</p>
                <p className="text-3xl font-bold text-white">{totalSpace}/{formData.size_u}U</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Layout */}
        <div className="grid grid-cols-[350px_1fr] gap-6">
          {/* Device Palette */}
          <DevicePalette
            devices={availableDevices}
            onDeviceDragStart={(device, size) => setDraggedDeviceSize(size)} onDeviceSelect={function (device: Device | CustomDevice): void {
              throw new Error('Function not implemented.');
            } } selectedDevice={null}          />

          {/* Rack Visualizer */}
          <RackVisualizer
            rackSizeU={formData.size_u}
            devices={installedDevices}
            onDeviceClick={handleDeviceClick}
            onDeviceRemove={handleDeviceRemove}
            onPositionClick={handlePositionClick}
            onDeviceDrop={handleDeviceDrop}
            selectedPosition={selectedPosition}
            draggedDeviceSize={draggedDeviceSize} rackSize={0} onDeviceSelect={function (device: Device): void {
              throw new Error('Function not implemented.');
            } } onDeviceMove={function (deviceId: string, newPosition: number): void {
              throw new Error('Function not implemented.');
            } }          
          />
        </div>
      </div>

      {/* Device Details Modal */}
      <DeviceDetailsModal
        device={selectedDevice}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDevice(null);
        }}
        onSave={handleDeviceSave}
        onDelete={handleDeviceRemove}
        maxPosition={formData.size_u}
      />
    </div>
  );
}