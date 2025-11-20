import { Copy, Edit, HardDrive, Network, Plus, Server, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import BulkImportDialog from '../components/device-library/BulkImportDialog';
import CloneDeviceDialog from '../components/device-library/CloneDeviceDialog';
import CustomDeviceDialog from '../components/device-library/CustomDeviceDialog';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { CustomDeviceService } from '../services/api';
import { CustomDevice } from '../types/entities';
import { logActivity } from '../utils/activityLog';

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
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloningDevice, setCloningDevice] = useState<CustomDevice | null>(null);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);

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

    const device = customDevices.find(d => d.id === id);

    try {
      await CustomDeviceService.delete(id);
      setCustomDevices(customDevices.filter(d => d.id !== id));

      // Log activity
      logActivity('delete', 'device', id, {
        entityName: device?.name || 'Unknown Device',
        severity: 'success',
        metadata: { deviceType: device?.device_type, manufacturer: device?.manufacturer }
      });

      toast.success('Device deleted');
    } catch (error) {
      logActivity('delete', 'device', id, {
        entityName: device?.name || 'Unknown Device',
        severity: 'error',
        metadata: { error: String(error) }
      });
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

      // Log activity
      logActivity('update', 'device', device.id, {
        entityName: device.name,
        severity: 'success',
        metadata: { deviceType: device.device_type, manufacturer: device.manufacturer }
      });
    } else {
      // Add new device to list
      setCustomDevices([device, ...customDevices]);

      // Log activity
      logActivity('create', 'device', device.id, {
        entityName: device.name,
        severity: 'success',
        metadata: { deviceType: device.device_type, manufacturer: device.manufacturer }
      });
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingDevice(null);
  };

  const handleClone = (device: CustomDevice) => {
    setCloningDevice(device);
    setShowCloneDialog(true);
  };

  const handleCloneComplete = async (clonedDevice: CustomDevice) => {
    try {
      // Save cloned device via API
      const saved = await CustomDeviceService.create(clonedDevice);
      setCustomDevices([saved, ...customDevices]);

      // Log activity
      logActivity('clone', 'device', saved.id, {
        entityName: saved.name,
        severity: 'success',
        metadata: {
          originalDevice: cloningDevice?.name,
          deviceType: saved.device_type,
          manufacturer: saved.manufacturer
        }
      });
    } catch (error) {
      toast.error('Failed to save cloned device');
    }
  };

  const handleCloseCloneDialog = () => {
    setShowCloneDialog(false);
    setCloningDevice(null);
  };

  const handleBulkImport = async (devices: CustomDevice[]) => {
    let successCount = 0;
    let failCount = 0;

    for (const device of devices) {
      try {
        const saved = await CustomDeviceService.create(device);
        setCustomDevices(prev => [saved, ...prev]);

        // Log activity for each imported device
        logActivity('import', 'device', saved.id, {
          entityName: saved.name,
          severity: 'success',
          metadata: {
            deviceType: saved.device_type,
            manufacturer: saved.manufacturer,
            source: 'CSV Import'
          }
        });

        successCount++;
      } catch (error) {
        logActivity('import', 'device', device.id, {
          entityName: device.name,
          severity: 'error',
          metadata: { error: String(error), source: 'CSV Import' }
        });
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} device${successCount !== 1 ? 's' : ''}`);
    }
    if (failCount > 0) {
      toast.error(`Failed to import ${failCount} device${failCount !== 1 ? 's' : ''}`);
    }
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
        <div className="glass-card border-white/10 rounded-2xl p-8 mb-8">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center glow">
                <Server className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold gradient-text mb-3">Device Library</h1>
                <p className="text-gray-300 text-lg">Browse preset devices from major manufacturers</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowBulkImportDialog(true)}
                variant="ghost"
                className="glass-button text-white hover:bg-white/10"
              >
                <Upload className="w-4 h-4 mr-2" />
                Bulk Import
              </Button>
              <Button
                onClick={handleCreate}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Custom Device
              </Button>
            </div>
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
          <div className="glass-card border-white/10 rounded-2xl p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center glass">
              <Server className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-3">No Devices Found</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {activeTab === 'Custom Devices' 
                ? 'Create your first custom device to get started'
                : 'No devices available in this category'
              }
            </p>
            {activeTab === 'Custom Devices' && (
              <Button 
                onClick={handleCreate}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Device
              </Button>
            )}
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
                            className="h-8 w-8 p-0 text-blue-400 hover:text-white hover:bg-blue-500/20"
                            onClick={() => handleClone(device)}
                            title="Clone device"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-white/10"
                            onClick={() => handleEdit(device)}
                            title="Edit device"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/20"
                            onClick={() => handleDelete(device.id)}
                            title="Delete device"
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

      {/* Clone Device Dialog */}
      {showCloneDialog && cloningDevice && (
        <CloneDeviceDialog
          device={cloningDevice}
          onClone={handleCloneComplete}
          onClose={handleCloseCloneDialog}
        />
      )}

      {/* Bulk Import Dialog */}
      {showBulkImportDialog && (
        <BulkImportDialog
          onImport={handleBulkImport}
          onClose={() => setShowBulkImportDialog(false)}
        />
      )}
    </div>
  );
}