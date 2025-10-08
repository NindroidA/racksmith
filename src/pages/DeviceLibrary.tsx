import { motion } from "framer-motion";
import { Cable, HardDrive, Info, Plus, Server, Zap } from "lucide-react";
import React, { useState } from "react";
import CustomDeviceDialog from "../components/device-library/CustomDeviceDialog";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { CustomDeviceService } from "../services/api";
import type { CustomDevice } from "../types/entities";

const deviceLibrary = {
  cisco: {
    icon: Server,
    color: "from-blue-500 to-blue-600",
    devices: [
      { name: "Catalyst 9300", model: "C9300-48P", type: "Switch", size_u: 1, ports: 48, description: "Stackable enterprise switch with PoE+", power: 450 },
      { name: "Catalyst 9200", model: "C9200-24P", type: "Switch", size_u: 1, ports: 24, description: "Compact fixed switch for campus access", power: 250 },
      { name: "ISR 4331", model: "ISR4331/K9", type: "Router", size_u: 1, ports: 4, description: "Integrated services router", power: 150 },
      { name: "Nexus 9000", model: "N9K-C93180YC-EX", type: "Switch", size_u: 1, ports: 48, description: "High-performance data center switch", power: 500 },
    ]
  },
  ubiquiti: {
    icon: Zap,
    color: "from-purple-500 to-purple-600",
    devices: [
      { name: "Dream Machine Pro", model: "UDM-Pro", type: "Router", size_u: 1, ports: 8, description: "All-in-one network appliance", power: 45 },
      { name: "Switch Pro 48", model: "USW-Pro-48", type: "Switch", size_u: 1, ports: 48, description: "Layer 3 managed PoE switch", power: 600 },
      { name: "Switch Aggregation", model: "USW-Aggregation", type: "Fiber Switch", size_u: 1, ports: 8, description: "10G SFP+ aggregation switch", power: 150 },
      { name: "Switch Pro 24 PoE", model: "USW-Pro-24-PoE", type: "Switch", size_u: 1, ports: 24, description: "Managed PoE switch", power: 400 },
    ]
  },
  fs: {
    icon: Cable,
    color: "from-cyan-500 to-cyan-600",
    devices: [
      { name: "S5860-20SQ", model: "S5860-20SQ", type: "Fiber Switch", size_u: 1, ports: 20, description: "25G/100G data center switch", power: 350 },
      { name: "S3900-48T4S", model: "S3900-48T4S", type: "Switch", size_u: 1, ports: 48, description: "Layer 3 gigabit switch", power: 280 },
      { name: "S3900-24F4S", model: "S3900-24F4S", type: "Fiber Switch", size_u: 1, ports: 24, description: "SFP fiber switch", power: 180 },
    ]
  },
  tripplite: {
    icon: HardDrive,
    color: "from-yellow-500 to-yellow-600",
    devices: [
      { name: "SmartPro 3000VA", model: "SMART3000RM2U", type: "UPS", size_u: 2, ports: 0, description: "2U rack-mount UPS with LCD", power: 3000 },
      { name: "PDU 20A", model: "PDU1230", type: "PDU", size_u: 1, ports: 12, description: "Basic rack PDU 12 outlets", power: 0 },
      { name: "SmartPro 1500VA", model: "SMART1500RM2U", type: "UPS", size_u: 2, ports: 0, description: "Compact 2U UPS", power: 1500 },
    ]
  }
};

const DeviceLibrary: React.FC = () => {
  const [customDevices, setCustomDevices] = useState<CustomDevice[]>([]);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [editingDevice, setEditingDevice] = useState<CustomDevice | null>(null);

  const loadCustomDevices = async () => {
    const devices = await CustomDeviceService.list("-created_date");
    setCustomDevices(devices);
  };

  const handleSaveDevice = async (deviceData: Omit<CustomDevice, 'id'>) => {
    if (editingDevice) {
      await CustomDeviceService.update(editingDevice.id, deviceData);
    } else {
      await CustomDeviceService.create(deviceData);
    }
    setShowDialog(false);
    setEditingDevice(null);
    loadCustomDevices();
};

  const handleDeleteDevice = async (deviceId: string) => {
    if (window.confirm("Delete this custom device?")) {
      await CustomDeviceService.delete(deviceId);
      loadCustomDevices();
    }
  };


  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card border-white/10 rounded-2xl p-8 mb-8"
        >
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center glow">
              <Server className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold gradient-text mb-3">Device Library</h1>
              <p className="text-gray-300 text-lg">Browse preset devices from major manufacturers</p>
              <div className="flex items-center gap-2 mt-3 text-sm text-gray-400">
                <Info className="w-4 h-4" />
                <span>Use these devices when building your rack configurations</span>
              </div>
            </div>
            <Button
              onClick={() => setShowDialog(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 glow-hover"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Custom Device
            </Button>
          </div>
        </motion.div>

        <Tabs defaultValue="custom" className="w-full">
          <TabsList className="glass border-white/10 p-1">
            <TabsTrigger value="custom" className="data-[state=active]:glass data-[state=active]:glow">Custom Devices</TabsTrigger>
            <TabsTrigger value="cisco" className="data-[state=active]:glass data-[state=active]:glow">Cisco</TabsTrigger>
            <TabsTrigger value="ubiquiti" className="data-[state=active]:glass data-[state=active]:glow">Ubiquiti</TabsTrigger>
            <TabsTrigger value="fs" className="data-[state=active]:glass data-[state=active]:glow">FS.com</TabsTrigger>
            <TabsTrigger value="tripplite" className="data-[state=active]:glass data-[state=active]:glow">TrippLite</TabsTrigger>
          </TabsList>

          <TabsContent value="custom">
            {customDevices.length === 0 ? (
              <div className="text-center py-16 glass-card border-white/10 rounded-2xl mt-6">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center glass glow">
                  <Plus className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No Custom Devices Yet</h3>
                <p className="text-gray-400 mb-6">Create your first custom device to get started</p>
                <Button
                  onClick={() => setShowDialog(true)}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Custom Device
                </Button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6"
              >
                {customDevices.map((device, index) => (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    index={index}
                    onEdit={() => {
                      setEditingDevice(device);
                      setShowDialog(true);
                    }}
                    onDelete={() => handleDeleteDevice(device.id)}
                    isCustom
                  />
                ))}
              </motion.div>
            )}
          </TabsContent>

          {Object.entries(deviceLibrary).map(([key, { icon: Icon, color, devices }]) => (
            <TabsContent key={key} value={key}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6"
              >
                {devices.map((device, index) => (
                  <DeviceCard
                    key={index}
                    device={device}
                    icon={Icon}
                    color={color}
                    index={index}
                  />
                ))}
              </motion.div>
            </TabsContent>
          ))}
        </Tabs>

        {showDialog && (
          <CustomDeviceDialog
            device={editingDevice || undefined}
            onSave={handleSaveDevice}
            onClose={() => {
              setShowDialog(false);
              setEditingDevice(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

interface DeviceCardProps {
  device: any;
  icon?: any;
  color?: string;
  index: number;
  onEdit?: () => void;
  onDelete?: () => void;
  isCustom?: boolean;
}

function DeviceCard({ device, icon: Icon, color, index, onEdit, onDelete, isCustom }: DeviceCardProps) {
  const deviceColor = isCustom ? "from-green-500 to-emerald-600" : color;
  const DefaultIcon = Server;
  const DisplayIcon = Icon || DefaultIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="glass-card border-white/10 hover:border-white/20 transition-all duration-300 group glow-hover overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
          <div className={`w-full h-full bg-gradient-to-br ${deviceColor} rounded-full blur-2xl`} />
        </div>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${deviceColor} group-hover:scale-110 transition-transform duration-300 glow relative overflow-hidden`}>
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
              <DisplayIcon className="w-6 h-6 text-white relative z-10" />
            </div>
            <Badge variant="outline" className="border-white/20 text-gray-300 glass">
              {device.size_u}U
            </Badge>
          </div>
          <CardTitle className="text-white mt-4 text-xl">{device.name}</CardTitle>
          <p className="text-sm text-gray-400 font-mono">{device.model}</p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-300 mb-4 leading-relaxed">{device.description}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline" className="border-white/20 text-gray-400 glass">
              {device.type || device.device_type?.replace(/_/g, ' ')}
            </Badge>
            {(device.ports || device.port_count) > 0 && (
              <Badge variant="outline" className="border-white/20 text-gray-400 glass">
                {device.ports || device.port_count} Ports
              </Badge>
            )}
            {(device.power || device.power_watts) > 0 && (
              <Badge variant="outline" className="border-white/20 text-yellow-400 glass">
                {device.power || device.power_watts}W
              </Badge>
            )}
          </div>
          {isCustom && (
            <div className="flex gap-2 pt-2 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="flex-1 glass border-white/10 hover:bg-white/10"
              >
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="flex-1 glass border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                Delete
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default DeviceLibrary;