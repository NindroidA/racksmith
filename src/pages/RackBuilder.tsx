import { ArrowLeft, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import DevicePalette from '../components/rack/DevicePalette';
import RackVisualizer from '../components/rack/RackVisualizer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectItem } from '../components/ui/select';
import { CustomDeviceService, DeviceService, RackConfigurationService } from '../services/api';
import { CustomDevice, Device, RackConfiguration } from '../types/entities';

export default function RackBuilder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  // rack configuration
  const [rackName, setRackName] = useState('');
  const [rackSize, setRackSize] = useState(42);
  const [location, setLocation] = useState('');
  const [colorTag, setColorTag] = useState('blue');
  const [draggedDeviceSize, setDraggedDeviceSize] = useState(1);

  // devices
  const [installedDevices, setInstalledDevices] = useState<Device[]>([]);
  const [availableDevices, setAvailableDevices] = useState<(Device | CustomDevice)[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<(Device | CustomDevice) | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [selectedInstalledDevice, setSelectedInstalledDevice] = useState<Device | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // load rack and devices
  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // load custom devices (these are templates)
      const customDevices = await CustomDeviceService.list();
      
      // for preset devices, we need to create a library of templates
      // these are NOT the actual devices in racks
      const presetTemplates: CustomDevice[] = [
        { id: 'preset-1', name: 'Dell PowerEdge R740', manufacturer: 'dell', model: 'R740', device_type: 'server', size_u: 2, port_count: 4, power_watts: 750 },
        { id: 'preset-2', name: 'Cisco Catalyst 9300', manufacturer: 'cisco', model: 'C9300-48P', device_type: 'switch', size_u: 1, port_count: 48, power_watts: 350 },
        { id: 'preset-3', name: 'Ubiquiti USW-Pro-48', manufacturer: 'ubiquiti', model: 'USW-Pro-48', device_type: 'switch', size_u: 1, port_count: 48, power_watts: 200 },
        { id: 'preset-4', name: 'Cisco ASA 5516-X', manufacturer: 'cisco', model: 'ASA5516', device_type: 'firewall', size_u: 1, port_count: 12, power_watts: 250 },
        { id: 'preset-5', name: 'APC Smart-UPS', manufacturer: 'apc', model: 'SMT3000RM2U', device_type: 'ups', size_u: 2, port_count: 0, power_watts: 3000 },
        { id: 'preset-6', name: 'Synology RS3621xs+', manufacturer: 'synology', model: 'RS3621xs+', device_type: 'storage', size_u: 2, port_count: 8, power_watts: 450 },
      ];

      setAvailableDevices([...presetTemplates, ...customDevices]);

      // load rack if editing
      if (isEditMode && id) {
        const rack = await RackConfigurationService.get(id);
        setRackName(rack.name);
        setRackSize(rack.size_u);
        setLocation(rack.location || '');
        setColorTag(rack.color_tag || 'blue');

        // load devices in this rack
        const rackDevices = await DeviceService.filter({ rack_config_id: id });
        setInstalledDevices(rackDevices);
      }
    } catch (error) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // handle device placement
  const handlePositionClick = (position: number) => {
    if (!selectedDevice) {
      setSelectedPosition(position);
      toast.error('Please select a device first');
      return;
    }

    // check if device fits
    if (position + selectedDevice.size_u - 1 > rackSize) {
      toast.error(`Device doesn't fit! Needs ${selectedDevice.size_u}U but only ${rackSize - position + 1}U available`);
      return;
    }

    // check for overlaps
    const wouldOverlap = installedDevices.some(device => {
      const deviceEnd = device.position_u + device.size_u - 1;
      const newDeviceEnd = position + selectedDevice.size_u - 1;
      return (
        (position >= device.position_u && position <= deviceEnd) ||
        (newDeviceEnd >= device.position_u && newDeviceEnd <= deviceEnd) ||
        (position <= device.position_u && newDeviceEnd >= deviceEnd)
      );
    });

    if (wouldOverlap) {
      toast.error('Position is occupied!');
      return;
    }

    // add device to rack
    const newDevice: Device = {
      id: `temp-${Date.now()}`,
      rack_config_id: id || 'new',
      name: selectedDevice.name,
      manufacturer: selectedDevice.manufacturer as Device['manufacturer'],
      model: selectedDevice.model,
      device_type: selectedDevice.device_type,
      size_u: selectedDevice.size_u,
      position_u: position,
      port_count: selectedDevice.port_count,
      power_watts: selectedDevice.power_watts
    };

    setInstalledDevices([...installedDevices, newDevice]);
    setSelectedDevice(null);
    setSelectedPosition(null);
    toast.success(`${selectedDevice.name} installed at position ${position}U`);
  };

  // remove device
  const handleDeviceRemove = (deviceId: string) => {
    setInstalledDevices(installedDevices.filter(d => d.id !== deviceId));
    toast.success('Device removed');
  };

  // device drop
  const handleDeviceDrop = (position: number, device: Device | CustomDevice, isMoving: boolean = false) => {
    const bottomPosition = position - device.size_u + 1;
    
    if (bottomPosition < 1) {
      toast.error('Device doesn\'t fit! Would extend below rack');
      return;
    }

    // check overlaps (exclude the moving device if it's a move operation)
    const wouldOverlap = installedDevices.some(d => {
      if (isMoving && d.id === device.id) return false; // skip if moving itself
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
      // moving existing device
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
      // adding new device
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
  };

  // save rack
  const handleSave = async () => {
    if (!rackName.trim()) {
      toast.error('Please enter a rack name');
      return;
    }

    setIsSaving(true);
    try {
      let rackId = id;

      // create or update rack
      if (isEditMode && id) {
        await RackConfigurationService.update(id, {
          name: rackName,
          size_u: rackSize,
          location,
          color_tag: colorTag as RackConfiguration['color_tag']
        });
        toast.success('Rack updated!');
      } else {
        const newRack = await RackConfigurationService.create({
          name: rackName,
          size_u: rackSize,
          location,
          color_tag: colorTag as RackConfiguration['color_tag']
        });
        rackId = newRack.id;
        toast.success('Rack created!');
      }

      // save devices
      for (const device of installedDevices) {
        if (device.id.startsWith('temp-')) {
          // new device
          const { id: _, ...deviceWithoutId } = device;
          await DeviceService.create({
            ...deviceWithoutId,
            rack_config_id: rackId!
          });
        } else {
          // update existing
          await DeviceService.update(device.id, device);
        }
      }

      navigate('/racks');
    } catch (error) {
      toast.error('Failed to save rack');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // calculate stats
  const totalPower = installedDevices.reduce((sum, d) => sum + (d.power_watts || 0), 0);
  const usedSpace = installedDevices.reduce((sum, d) => sum + d.size_u, 0);
  const utilizationPercent = Math.round((usedSpace / rackSize) * 100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/racks')}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">
              {isEditMode ? 'Edit Rack' : 'New Rack Configuration'}
            </h1>
            <p className="text-gray-400 text-sm">Design your rack layout and add devices</p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-green-500 to-emerald-600">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>

      {/* Rack Properties */}
      <div className="glass-card p-4 mb-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <Label className="text-gray-300">Rack Name</Label>
            <Input
              value={rackName}
              onChange={(e) => setRackName(e.target.value)}
              placeholder="e.g., Main Server Rack"
              className="glass border-white/10 text-white"
            />
          </div>
          <div>
            <Label className="text-gray-300">Size (U)</Label>
            <Select value={rackSize.toString()} onValueChange={(v) => setRackSize(Number(v))} className="glass border-white/10 text-white">
              <SelectItem value="6">6U (Small)</SelectItem>
              <SelectItem value="12">12U (Medium)</SelectItem>
              <SelectItem value="24">24U (Half Rack)</SelectItem>
              <SelectItem value="42">42U (Full Rack)</SelectItem>
              <SelectItem value="48">48U (Extended)</SelectItem>
            </Select>
          </div>
          <div>
            <Label className="text-gray-300">Location</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Data Center A, Row 1"
              className="glass border-white/10 text-white"
            />
          </div>
          <div>
            <Label className="text-gray-300 mb-2 block">Color Tag</Label>
            <div className="flex gap-2">
              {[
                { value: 'blue', color: 'bg-blue-500' },
                { value: 'purple', color: 'bg-purple-500' },
                { value: 'green', color: 'bg-green-500' },
                { value: 'red', color: 'bg-red-500' },
                { value: 'orange', color: 'bg-orange-500' },
                { value: 'cyan', color: 'bg-cyan-500' }
              ].map(({ value, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setColorTag(value)}
                  className={`w-8 h-8 rounded-full ${color} transition-all ${
                    colorTag === value ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800' : 'opacity-50 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
          <div>
            <div className="text-xs text-gray-400">Utilization</div>
            <div className="text-xl font-bold text-white">{utilizationPercent}%</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Power Draw</div>
            <div className="text-xl font-bold text-white">{totalPower}W</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Space Used</div>
            <div className="text-xl font-bold text-white">{usedSpace}/{rackSize}U</div>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        {/* Device Palette */}
        <div className="col-span-3 overflow-hidden">
          <DevicePalette
            devices={availableDevices}
            onDeviceSelect={setSelectedDevice}
            selectedDevice={selectedDevice}
            onDragStart={(size) => setDraggedDeviceSize(size)}
            onDragEnd={() => setDraggedDeviceSize(1)}
          />
        </div>

        {/* Rack Visualizer */}
        <div className="col-span-9 overflow-auto">
          <RackVisualizer
            rackSizeU={rackSize}
            devices={installedDevices}
            onDeviceClick={setSelectedInstalledDevice}
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
    </div>
  );
}