import { Plus, Server } from "lucide-react";
import React, { useState } from "react";
import { Device } from "../../types/entities";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ScrollArea } from "../ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const devicePresets = {
  cisco: [
    { name: "Catalyst 9300", model: "C9300-48P", type: "switch", size_u: 1, ports: 48 },
    { name: "ISR 4331", model: "ISR4331/K9", type: "router", size_u: 1, ports: 4 },
    { name: "Nexus 9000", model: "N9K-C93180YC-EX", type: "switch", size_u: 1, ports: 48 }
  ],
  ubiquiti: [
    { name: "UniFi Dream Machine Pro", model: "UDM-Pro", type: "router", size_u: 1, ports: 8 },
    { name: "UniFi Switch Pro 48", model: "USW-Pro-48", type: "switch", size_u: 1, ports: 48 },
    { name: "UniFi Switch Aggregation", model: "USW-Aggregation", type: "fiber_switch", size_u: 1, ports: 8 }
  ],
  fs: [
    { name: "S5860-20SQ", model: "S5860-20SQ", type: "fiber_switch", size_u: 1, ports: 20 },
    { name: "S3900-48T4S", model: "S3900-48T4S", type: "switch", size_u: 1, ports: 48 }
  ],
  tripplite: [
    { name: "SmartPro UPS 3000VA", model: "SMART3000RM2U", type: "ups", size_u: 2, ports: 0 },
    { name: "PDU 20A", model: "PDU1230", type: "pdu", size_u: 1, ports: 12 }
  ]
};

interface DeviceSelectorProps {
  rackSize: number;
  existingDevices: Device[];
  onAddDevice: (device: Partial<Device>) => void;
}

interface PresetDevice {
  name: string;
  manufacturer: string;
  model: string;
  device_type: Device['device_type'];
  size_u: number;
  port_count: number;
  power_watts: number;
  description: string;
}

const DeviceSelector: React.FC<DeviceSelectorProps> = ({ rackSize, existingDevices, onAddDevice }) => {
  const [manufacturer, setManufacturer] = useState("cisco");
  const [selectedPreset, setSelectedPreset] = useState<PresetDevice | null>(null);
  const [customDevice, setCustomDevice] = useState<Partial<Device>>({
    name: "",
    manufacturer: "custom" as Device['manufacturer'],
    device_type: "server" as Device['device_type'],
    size_u: 1,
    position_u: 1,
    port_count: 0,
    power_watts: 0,
  });
  const [customName, setCustomName] = useState("");
  const [customSize, setCustomSize] = useState(1);
  const [customType, setCustomType] = useState<Device['device_type']>("server");
  const [position, setPosition] = useState(1);

  const findNextAvailablePosition = (deviceSize) => {
    const occupiedUnits = new Set();
    existingDevices.forEach(device => {
      for (let i = 0; i < device.size_u; i++) {
        occupiedUnits.add(device.position_u + i);
      }
    });

    for (let pos = 1; pos <= rackSize - deviceSize + 1; pos++) {
      let canFit = true;
      for (let i = 0; i < deviceSize; i++) {
        if (occupiedUnits.has(pos + i)) {
          canFit = false;
          break;
        }
      }
      if (canFit) return pos;
    }
    return null;
  };

  const handleAddPreset = () => {
  if (!selectedPreset) return;
  
  const availablePosition = findNextAvailablePosition(selectedPreset.size_u);
  if (availablePosition === null) {
    alert("Not enough space in the rack for this device");
    return;
  }

  onAddDevice({
    name: selectedPreset.name,
    manufacturer: selectedPreset.manufacturer as Device['manufacturer'],
    model: selectedPreset.model,
    device_type: selectedPreset.device_type,
    size_u: selectedPreset.size_u,
    position_u: availablePosition,
    port_count: selectedPreset.port_count || 0
  });
   setSelectedPreset(null);
  };

  const handleAddCustom = () => {
    if (!customName) {
      alert("Please enter a device name");
      return;
    }

    const availablePosition = findNextAvailablePosition(customSize);
    if (availablePosition === null) {
      alert("Not enough space in the rack for this device");
      return;
    }

    onAddDevice({
      name: customName,
      manufacturer: "custom" as Device['manufacturer'],
      model: "Custom Device",
      device_type: customType,
      size_u: customSize,
      position_u: availablePosition,
      port_count: 0
    });
    setCustomName("");
    setCustomSize(1);
  };

  return (
    <Card className="glass-card border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Device
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="presets" className="w-full">
          <TabsList className="grid w-full grid-cols-2 glass border-white/10">
            <TabsTrigger value="presets">Presets</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Manufacturer</Label>
              <Select value={manufacturer} onValueChange={setManufacturer}>
                <SelectTrigger className="glass border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10">
                  <SelectItem value="cisco">Cisco</SelectItem>
                  <SelectItem value="ubiquiti">Ubiquiti</SelectItem>
                  <SelectItem value="fs">FS.com</SelectItem>
                  <SelectItem value="tripplite">TrippLite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {devicePresets[manufacturer].map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedPreset(preset)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedPreset === preset
                        ? 'border-blue-500 bg-blue-500/10 glow'
                        : 'border-white/10 glass hover:border-white/20'
                    }`}
                  >
                    <p className="font-medium text-white">{preset.name}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {preset.model} • {preset.size_u}U • {preset.ports} ports
                    </p>
                  </button>
                ))}
              </div>
            </ScrollArea>

            <Button
              onClick={handleAddPreset}
              disabled={!selectedPreset}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Server className="w-4 h-4 mr-2" />
              Add to Rack
            </Button>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customName" className="text-gray-300">Device Name</Label>
              <Input
                id="customName"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., Custom Server"
                className="glass border-white/10 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customType" className="text-gray-300">Device Type</Label>
              <Select value={customType} onValueChange={(v) => setCustomType(v as Device['device_type'])}>
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
                  <SelectItem value="storage">Storage</SelectItem>
                  <SelectItem value="pdu">PDU</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customSize" className="text-gray-300">Size (Rack Units)</Label>
              <Select value={customSize.toString()} onValueChange={(v) => setCustomSize(parseInt(v))}>
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

            <Button
              onClick={handleAddCustom}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Device
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default DeviceSelector;