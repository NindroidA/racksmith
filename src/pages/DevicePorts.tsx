
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Cable, CheckCircle, ChevronLeft, ChevronRight, Circle, Plus, Server, XCircle, Zap } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import ConnectionCreator from "../components/device-ports/ConnectionCreator";
import PortCard from "../components/device-ports/PortCard";
import PortEditor from "../components/device-ports/PortEditor";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { ScrollArea } from "../components/ui/scroll-area";
import { ConnectionService, DeviceService, PortService, RackConfigurationService } from "../services/api";
import type { Connection, Device, Port, RackConfiguration } from "../types/entities";

const DevicePorts: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [device, setDevice] = useState<Device | null>(null);
  const [rack, setRack] = useState<RackConfiguration | null>(null);
  const [rackDevices, setRackDevices] = useState<Device[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [selectedPort, setSelectedPort] = useState<Port | null>(null);
  const [showPortEditor, setShowPortEditor] = useState<boolean>(false);
  const [showConnectionCreator, setShowConnectionCreator] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const devices = await DeviceService.list();
      const foundDevice = devices.find(d => d.id === id);
      
      if (!foundDevice) {
        setIsLoading(false);
        return;
      }
      
      setDevice(foundDevice);

      const racks = await RackConfigurationService.list();
      const foundRack = racks.find(r => r.id === foundDevice.rack_config_id);
      setRack(foundRack || null);

      const devicesInRack = devices.filter(d => d.rack_config_id === foundDevice.rack_config_id);
      setRackDevices(devicesInRack);

      const devicePorts = await PortService.filter({ device_id: id });
      setPorts(devicePorts);

      const allConnections = await ConnectionService.list();
      const portIds = devicePorts.map(p => p.id);
      const relevantConnections = allConnections.filter(
        conn => portIds.includes(conn.source_port_id || '') || portIds.includes(conn.destination_port_id || '')
      );
      setConnections(relevantConnections);

      setAllDevices(devices);
    } catch (error) {
      console.error("Error loading device data:", error);
      toast.error("Failed to load device data");
    }
    
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGeneratePorts = async () => {
    if (!device!.port_count || device!.port_count === 0) {
      toast.error("This device has no ports configured");
      return;
    }

    const existingPorts = await PortService.filter({ device_id: id! });
    if (existingPorts.length > 0) {
      toast.error("Ports already exist. Delete them first to regenerate.");
      return;
    }

    for (let i = 1; i <= device!.port_count; i++) {
      await PortService.create({
        device_id: id!,
        port_number: `Port ${i}`,
        port_type: "ethernet",
        status: "available"
      });
    }

    toast.success(`Generated ${device!.port_count} ports successfully`);
    loadData();
  };

  const getPortConnection = (port) => {
    return connections.find(
      conn =>
        (conn.source_device_id === id && conn.source_port_id === port.id) ||
        (conn.destination_device_id === id && conn.destination_port_id === port.id)
    );
  };

  const portStats = {
    total: ports.length,
    connected: ports.filter(p => p.status === "connected").length,
    available: ports.filter(p => p.status === "available").length,
    disabled: ports.filter(p => p.status === "disabled").length
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#161b22' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading device configuration...</p>
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#161b22' }}>
        <div className="text-center">
          <p className="text-gray-400 text-lg">Device not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#161b22' }}>
      {/* Device Sidebar Tab Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed z-50 rounded-r-xl px-2 py-6 hover:opacity-80 transition-all duration-300 group border-l-0"
        style={{ 
          background: 'rgba(13, 17, 23, 0.95)',
          backdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          borderLeft: 'none',
          left: sidebarOpen ? '256px' : '0px',
          top: 'calc(50% + 40px)',
          transition: 'left 0.3s ease'
        }}
      >
        <div className="flex flex-col items-center gap-1">
          <div className="sidebar-tab text-xs font-semibold text-white/70 group-hover:text-white transition-colors">
            DEVICES
          </div>
          {sidebarOpen ? (
            <ChevronLeft className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
          ) : (
            <ChevronRight className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
          )}
        </div>
      </button>

      {/* Device Navigation Sidebar */}
      <div
        className="fixed left-0 top-0 bottom-0 w-64 border-r z-40 transition-transform duration-300 ease-in-out"
        style={{
          background: 'rgba(13, 17, 23, 0.95)',
          backdropFilter: 'blur(24px) saturate(180%)',
          borderRight: '1px solid rgba(148, 163, 184, 0.1)',
          boxShadow: '4px 0 24px 0 rgba(0, 0, 0, 0.6)',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-white/10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`racks/${device.rack_config_id}`)}
              className="w-full mb-3 glass-button text-white hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Rack
            </Button>
            <div>
              <p className="text-xs text-gray-400 mb-1">Current Rack</p>
              <p className="text-white font-semibold text-sm">{rack?.name}</p>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              <p className="text-xs text-gray-400 mb-2 px-2">Devices in Rack</p>
              {rackDevices.map(dev => (
                <button
                  key={dev.id}
                  onClick={() => navigate(`/devices/${dev.id}/ports`)}
                  className={`w-full text-left p-2 rounded-lg transition-all ${
                    dev.id === id
                      ? 'bg-gradient-to-r from-fuchsia-500/30 to-pink-500/30 text-fuchsia-400 glow'
                      : 'hover:bg-white/5 text-gray-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Server className="w-4 h-4" />
                    <span className="font-medium text-sm">{dev.name}</span>
                  </div>
                  <p className="text-xs opacity-70">{dev.device_type.replace(/_/g, ' ')}</p>
                  {dev.port_count! > 0 && (
                    <p className="text-xs opacity-60 mt-1">{dev.port_count} ports</p>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main Content */}
      <div 
        className="flex-1 p-6 md:p-8 overflow-auto transition-all duration-300 ease-in-out"
        style={{
          marginLeft: sidebarOpen ? '264px' : '0px'
        }}
      >
        <div className="max-w-7xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="flex-1">
              <h1 className="text-3xl font-bold gradient-text">{device.name}</h1>
              <p className="text-gray-400 mt-1">
                {rack?.name} • {device.manufacturer} • {device.device_type.replace(/_/g, ' ')}
              </p>
            </div>
            <Button
              onClick={() => {
                setSelectedPort(null);
                setShowPortEditor(true);
              }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 glow-hover"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Port
            </Button>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="glass-card border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Total Ports</span>
                    <Circle className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold text-white">{portStats.total}</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="glass-card border-green-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Connected</span>
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-3xl font-bold text-green-400">{portStats.connected}</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="glass-card border-blue-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Available</span>
                    <Zap className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-3xl font-bold text-blue-400">{portStats.available}</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="glass-card border-red-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Disabled</span>
                    <XCircle className="w-4 h-4 text-red-400" />
                  </div>
                  <p className="text-3xl font-bold text-red-400">{portStats.disabled}</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {ports.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card border-white/10 rounded-2xl p-12 text-center"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center glass glow">
                <Cable className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">No Ports Configured</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                {device.port_count! > 0
                  ? `This device has ${device.port_count} ports. Generate them automatically or add them manually.`
                  : "Add ports manually to start tracking connections and configurations."
                }
              </p>
              <div className="flex gap-3 justify-center">
                {device.port_count! > 0 && (
                  <Button
                    onClick={handleGeneratePorts}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Generate {device.port_count} Ports
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setSelectedPort(null);
                    setShowPortEditor(true);
                  }}
                  variant="outline"
                  className="glass border-white/10 hover:bg-white/10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Port Manually
                </Button>
              </div>
            </motion.div>
          ) : (
            <Card className="glass-card border-white/10">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="text-white flex items-center gap-2">
                  <Cable className="w-5 h-5" />
                  Port Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {ports.map((port, index) => (
                      <PortCard
                        key={port.id}
                        port={port}
                        connection={getPortConnection(port)}
                        allDevices={allDevices}
                        index={index}
                        onEdit={() => {
                          setSelectedPort(port);
                          setShowPortEditor(true);
                        }}
                        onConnect={() => {
                          setSelectedPort(port);
                          setShowConnectionCreator(true);
                        }}
                        onRefresh={loadData}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          )}

          {showPortEditor && (
            <PortEditor
              port={selectedPort!}
              deviceId={id!}
              onClose={() => {
                setShowPortEditor(false);
                setSelectedPort(null);
                loadData();
              }}
            />
          )}

          {showConnectionCreator && selectedPort && (
            <ConnectionCreator
              sourceDevice={device}
              sourcePort={selectedPort}
              allDevices={allDevices}
              onClose={() => {
                setShowConnectionCreator(false);
                setSelectedPort(null);
                loadData();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default DevicePorts;