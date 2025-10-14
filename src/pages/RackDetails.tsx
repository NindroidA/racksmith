
import { motion } from 'framer-motion';
import { ArrowLeft, Cable, Pencil, Plus } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ConnectionManager from '../components/rack-details/ConnectionManager';
import DeviceConnectionsView from '../components/rack-details/DeviceConnectionsView';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ConnectionService, DeviceService, RackConfigurationService } from '../services/api';
import type { Connection, Device, RackConfiguration } from '../types/entities';

const RackDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [rack, setRack] = useState<RackConfiguration | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showConnectionManager, setShowConnectionManager] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    const racks = await RackConfigurationService.list();
    const foundRack = racks.find(r => r.id === id);
    setRack(foundRack || null);

    const rackDevices = await DeviceService.filter({ rack_config_id: id });
    setDevices(rackDevices);

    const allConnections = await ConnectionService.list();
    const relevantConnections = allConnections.filter(
      conn => rackDevices.some(d => d.id === conn.source_device_id || d.id === conn.destination_device_id)
    );
    setConnections(relevantConnections);

    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, loadData]);

  const getDeviceConnections = (deviceId) => {
    return connections.filter(
      conn => conn.source_device_id === deviceId || conn.destination_device_id === deviceId
    );
  };

  if (isLoading || !rack) {
    return <div className="min-h-screen p-8 text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="glass border-white/10 hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold gradient-text">{rack.name}</h1>
            <p className="text-gray-400 mt-1">{rack.location || 'No location set'}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(`/racks/${id}/edit`)}
            className="glass border-white/10 hover:bg-white/10"
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit Rack
          </Button>
        </motion.div>

        {/* Device List */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card p-8 border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white pt-4 pb-8">Devices ({devices.length})</CardTitle>
                  <Button
                    onClick={() => setShowConnectionManager(true)}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    <Cable className="w-4 h-4 mr-2" />
                    Manage Connections
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {devices.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400 mb-4">No devices in this rack yet</p>
                    <Button
                        onClick={() => navigate(`/racks/${id}/edit`)}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Devices
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {devices.map(device => (
                      <motion.div
                        key={device.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass border-white/10 rounded-lg p-4 hover:border-white/20 transition-all cursor-pointer"
                        onClick={() => setSelectedDevice(device)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-white text-lg">{device.name}</h3>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/devices/${device.id}/ports`);
                                }}
                                className="glass border-purple-500/30 text-purple-400 hover:bg-purple-500/10 h-7 text-xs"
                              >
                                <Cable className="w-3 h-3 mr-1" />
                                Port Config
                              </Button>
                            </div>
                            <p className="text-sm text-gray-400">
                              {device.manufacturer} • {device.device_type.replace(/_/g, ' ')} • U{device.position_u}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="border-white/20 text-gray-300">
                              {device.size_u}U
                            </Badge>
                            {device.port_count! > 0 && (
                              <Badge variant="outline" className="border-white/20 text-gray-300">
                                {device.port_count} ports
                              </Badge>
                            )}
                            <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                              {getDeviceConnections(device.id).length} connections
                            </Badge>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            {selectedDevice ? (
              <DeviceConnectionsView
                device={selectedDevice}
                connections={getDeviceConnections(selectedDevice.id)}
                allDevices={devices}
                onClose={() => setSelectedDevice(null)}
              />
            ) : (
              <Card className="glass-card border-white/10">
                <CardContent className="p-6 text-center">
                  <Cable className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                  <p className="text-gray-400">Select a device to view its connections</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {showConnectionManager && (
          <ConnectionManager
            devices={devices}
            connections={connections}
            onClose={() => {
              setShowConnectionManager(false);
              loadData();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default RackDetails;