import { motion } from "framer-motion";
import { Cable, X } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { ConnectionService, PortService } from "../../services/api";
import { Connection, Device, Port } from "../../types/entities";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const cableTypes = [
  "cat5e", "cat6", "cat6a", "cat7",
  "fiber_om3", "fiber_om4", "fiber_sm",
  "sfp", "sfp_plus", "qsfp", "qsfp28", "dac", "power"
];

interface ConnectionCreatorProps {
  sourceDevice: Device;
  sourcePort: Port;
  allDevices: Device[];
  onClose: () => void;
}

const ConnectionCreator: React.FC<ConnectionCreatorProps> = ({ sourceDevice, sourcePort, allDevices, onClose }) => {
  const [destDeviceId, setDestDeviceId] = useState("");
  const [destPorts, setDestPorts] = useState<Port[]>([]);
  const [destPort, setDestPort] = useState("");
  const [cableType, setCableType] = useState<Connection['cable_type']>("cat6");
  const [cableLength, setCableLength] = useState("");
  const [description, setDescription] = useState("");
  const [vlan, setVlan] = useState("");

  const loadDestPorts = useCallback(async () => {
    const ports = await PortService.filter({ device_id: destDeviceId });
    setDestPorts(ports);
  }, [destDeviceId]);

  useEffect(() => {
    if (destDeviceId) {
      loadDestPorts();
    }
  }, [destDeviceId, loadDestPorts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destDeviceId || !destPort) {
      alert("Please select a destination device and port");
      return;
    }

    await ConnectionService.create({
      source_device_id: sourceDevice.id,
      source_port: sourcePort.port_number,
      destination_device_id: destDeviceId,
      destination_port: destPort,
      cable_type: cableType,
      cable_length_ft: cableLength ? parseFloat(cableLength) : undefined,
      description,
      vlan
    });

    await PortService.update(sourcePort.id, { status: "connected" });
    
    const destPortObj = destPorts.find(p => p.port_number === destPort);
    if (destPortObj) {
      await PortService.update(destPortObj.id, { status: "connected" });
    }

    onClose();
  };

  const availableDevices = allDevices.filter(d => d.id !== sourceDevice.id);

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
            <CardTitle className="text-white flex items-center gap-2">
              <Cable className="w-5 h-5" />
              Create Connection
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/10">
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="glass-card border-blue-500/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-400 mb-1">Source</p>
                <p className="text-white font-semibold">{sourceDevice.name}</p>
                <p className="text-sm text-blue-400">{sourcePort.port_number}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="destDevice" className="text-gray-300">Destination Device *</Label>
                  <Select value={destDeviceId} onValueChange={setDestDeviceId}>
                    <SelectTrigger className="glass border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      {availableDevices.map(device => (
                        <SelectItem key={device.id} value={device.id}>
                          {device.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destPort" className="text-gray-300">Destination Port *</Label>
                  <Select value={destPort} onValueChange={setDestPort} disabled={!destDeviceId}>
                    <SelectTrigger className="glass border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      {destPorts.map(port => (
                        <SelectItem key={port.id} value={port.port_number}>
                          {port.port_number} {port.status !== 'available' && `(${port.status})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cableType" className="text-gray-300">Cable Type</Label>
                  <Select value={cableType} onValueChange={(value) => setCableType(value as Connection['cable_type'])}>
                    <SelectTrigger className="glass border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      {cableTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type.toUpperCase().replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cableLength" className="text-gray-300">Cable Length (ft)</Label>
                  <Input
                    id="cableLength"
                    type="number"
                    value={cableLength}
                    onChange={(e) => setCableLength(e.target.value)}
                    placeholder="Optional"
                    className="glass border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vlan" className="text-gray-300">VLAN</Label>
                  <Input
                    id="vlan"
                    value={vlan}
                    onChange={(e) => setVlan(e.target.value)}
                    placeholder="e.g., 100"
                    className="glass border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-gray-300">Description</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Connection purpose"
                    className="glass border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onClose} className="glass border-white/10 hover:bg-white/10">
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                  <Cable className="w-4 h-4 mr-2" />
                  Create Connection
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default ConnectionCreator;