import { Edit, HardDrive, Network, Plus, Server, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import CustomDeviceDialog from '../components/device-library/CustomDeviceDialog';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { CustomDeviceService } from '../services/api';
import { CustomDevice } from '../types/entities';

// placeholder data
const presetDevices = [
  {
    id: 'preset-1',
    name: 'Catalyst 9300',
    manufacturer: 'Cisco',
    model: 'C9300-48P',
    device_type: 'switch' as const,
    size_u: 1,
    port_count: 48,
    power_watts: 350,
    description: '48-port PoE+ switch'
  },
  {
    id: 'preset-2',
    name: 'ASA 5516-X',
    manufacturer: 'Cisco',
    model: 'ASA5516',
    device_type: 'firewall' as const,
    size_u: 1,
    port_count: 12,
    power_watts: 250,
    description: 'Next-gen firewall'
  },
  {
    id: 'preset-3',
    name: 'USW-Pro-48',
    manufacturer: 'Ubiquiti',
    model: 'USW-Pro-48',
    device_type: 'switch' as const,
    size_u: 1,
    port_count: 48,
    power_watts: 200,
    description: '48-port managed switch'
  },
  {
    id: 'preset-4',
    name: 'Dream Machine Pro',
    manufacturer: 'Ubiquiti',
    model: 'UDM-Pro',
    device_type: 'router' as const,
    size_u: 1,
    port_count: 8,
    power_watts: 35,
    description: 'All-in-one security gateway'
  },
  {
    id: 'preset-5',
    name: 'S5860-20SQ',
    manufacturer: 'FS.com',
    model: 'S5860-20SQ',
    device_type: 'fiber_switch' as const,
    size_u: 1,
    port_count: 20,
    power_watts: 350,
    description: '25G/100G data center switch'
  },
  {
    id: 'preset-6',
    name: 'SmartOnline 3000VA',
    manufacturer: 'TrippLite',
    model: 'SMART3000RM2U',
    device_type: 'ups' as const,
    size_u: 2,
    port_count: 0,
    power_watts: 3000,
    description: '2U rack-mount UPS with LCD'
  }
];

export default function DeviceLibrary() {
  const [activeTab, setActiveTab] = useState('Custom Devices');
  const [customDevices, setCustomDevices] = useState<CustomDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingDevice, setEditingDevice] = useState<CustomDevice | null>(null);

  useEffect(() => {
    loadCustomDevices();
  }, []);

  const loadCustomDevices = async () => {
    setIsLoading(true);
    try {
      const devices = await CustomDeviceService.list();
      setCustomDevices(devices);
    } catch (error) {
      toast.error('Failed to load custom devices');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this device?')) return;
    
    try {
      await CustomDeviceService.delete(id);
      setCustomDevices(customDevices.filter(d => d.id !== id));
      toast.success('Device deleted');
    } catch (error) {
      toast.error('Failed to delete device');
    }
  };

  const handleEdit = (device: CustomDevice) => {
    setEditingDevice(device);
    setShowDialog(true);
  };

  const handleCreate = () => {
    setEditingDevice(null);
    setShowDialog(true);
  };

  const handleSave = (device: CustomDevice) => {
    if (editingDevice) {
      // Update existing device in list
      setCustomDevices(customDevices.map(d => d.id === device.id ? device : d));
    } else {
      // Add new device to list
      setCustomDevices([device, ...customDevices]);
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingDevice(null);
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'router':
      case 'switch':
      case 'fiber_switch':
        return Network;
      case 'server':
        return Server;
      case 'storage':
        return HardDrive;
      default:
        return Server;
    }
  };

  const getDeviceColor = (type: string) => {
    const colors: Record<string, string> = {
      router: 'from-blue-500 to-blue-600',
      switch: 'from-purple-500 to-purple-600',
      fiber_switch: 'from-indigo-500 to-indigo-600',
      server: 'from-emerald-500 to-emerald-600',
      firewall: 'from-rose-500 to-rose-600',
      storage: 'from-amber-500 to-amber-600',
      ups: 'from-orange-500 to-orange-600',
      pdu: 'from-pink-500 to-pink-600',
      patch_panel: 'from-cyan-500 to-cyan-600',
      load_balancer: 'from-teal-500 to-teal-600',
      other: 'from-slate-500 to-slate-600'
    };
    return colors[type] || colors.other;
  };

  const filteredDevices = activeTab === 'Custom Devices' 
    ? customDevices 
    : presetDevices.filter(d => d.manufacturer.toLowerCase() === activeTab.toLowerCase());

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glass-card p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Server className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">Device Library</h1>
              <p className="text-gray-400 mb-4">Browse preset devices from major manufacturers</p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Use these devices when building your rack configurations</span>
              </div>
            </div>
            <Button 
              onClick={handleCreate}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Device
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <Tabs>
            <TabsList className="glass-card border-white/10 p-1">
              {['Custom Devices', 'Cisco', 'Ubiquiti', 'FS.com', 'TrippLite'].map((tab) => (
                <TabsTrigger
                  key={tab}
                  active={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className="text-white px-6 py-2"
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Device Grid */}
        {isLoading && activeTab === 'Custom Devices' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="glass-card border-white/10">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-16 w-16 rounded-xl bg-white/5" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-32 bg-white/5" />
                        <Skeleton className="h-4 w-24 bg-white/5" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-full bg-white/5" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16 bg-white/5" />
                      <Skeleton className="h-6 w-16 bg-white/5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
              <Plus className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No Custom Devices Yet</h3>
            <p className="text-gray-400 mb-6">Create your first custom device to get started</p>
            <Button 
              onClick={handleCreate}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Device
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDevices.map((device) => {
              const Icon = getDeviceIcon(device.device_type);
              const gradient = getDeviceColor(device.device_type);

              return (
                <Card key={device.id} className="glass-card border-white/10 hover:border-white/20 transition-all group">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-white truncate">{device.name}</h3>
                          {device.size_u > 0 && (
                            <span className="px-2 py-1 rounded-md bg-white/10 text-xs font-semibold text-white flex-shrink-0">
                              {device.size_u}U
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{device.manufacturer} {device.model}</p>
                      </div>
                    </div>

                    {device.description && (
                      <p className="text-sm text-gray-300 mb-4">{device.description}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-3 py-1 rounded-full bg-white/5 text-xs font-medium text-gray-300">
                          {device.port_count} ports
                        </span>
                        {device.power_watts && device.power_watts > 0 && (
                          <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-xs font-medium text-yellow-400">
                            {device.power_watts}W
                          </span>
                        )}
                      </div>

                      {activeTab === 'Custom Devices' && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-white/10"
                            onClick={() => handleEdit(device)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/20"
                            onClick={() => handleDelete(device.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom Device Dialog */}
      {showDialog && (
        <CustomDeviceDialog
          device={editingDevice}
          onSave={handleSave}
          onClose={handleCloseDialog}
        />
      )}
    </div>
  );
}