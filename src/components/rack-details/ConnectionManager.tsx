import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2, X } from "lucide-react";
import React, { useState } from "react";
import { ConnectionService } from "../../services/api";
import { Connection, Device } from "../../types/entities";
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

interface ConnectionManagerProps {
  devices: Device[];
  connections: Connection[];
  onClose: () => void;
}

const ConnectionManager: React.FC<ConnectionManagerProps> = ({ devices, connections, onClose }) => {
  const [sourceDevice, setSourceDevice] = useState("");
  const [sourcePort, setSourcePort] = useState("");
  const [destDevice, setDestDevice] = useState("");
  const [destPort, setDestPort] = useState("");
  const [cableType, setCableType] = useState<Connection['cable_type']>("cat6");
  const [cableLength, setCableLength] = useState("");
  const [description, setDescription] = useState("");

  const handleAddConnection = async () => {
    if (!sourceDevice || !sourcePort || !destDevice || !destPort) {
      alert("Please fill in all required fields");
      return;
    }

    await ConnectionService.create({
      source_device_id: sourceDevice,
      source_port: sourcePort,
      destination_device_id: destDevice,
      destination_port: destPort,
      cable_type: cableType,
      cable_length_ft: cableLength ? parseFloat(cableLength) : undefined,
      description
    });

    setSourceDevice("");
    setSourcePort("");
    setDestDevice("");
    setDestPort("");
    setCableLength("");
    setDescription("");
    onClose();
  };

  const handleDeleteConnection = async (connectionId) => {
    if (window.confirm("Delete this connection?")) {
      await ConnectionService.delete(connectionId);
      onClose();
    }
  };

  const getDeviceName = (deviceId) => {
    const device = devices.find(d => d.id === deviceId);
    return device ? device.name : "Unknown Device";
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-auto"
      >
        <Card className="glass-card border-white/10">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/10">
            <CardTitle className="text-white">Connection Manager</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/10">
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Add New Connection</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Source Device</Label>
                  <Select value={sourceDevice} onValueChange={setSourceDevice}>
                    <SelectTrigger className="glass border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      {devices.map(device => (
                        <SelectItem key={device.id} value={device.id}>
                          {device.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Source Port</Label>
                  <Input
                    value={sourcePort}
                    onChange={(e) => setSourcePort(e.target.value)}
                    placeholder="e.g., Gi1/0/1"
                    className="glass border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Destination Device</Label>
                  <Select value={destDevice} onValueChange={setDestDevice}>
                    <SelectTrigger className="glass border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      {devices.map(device => (
                        <SelectItem key={device.id} value={device.id}>
                          {device.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Destination Port</Label>
                  <Input
                    value={destPort}
                    onChange={(e) => setDestPort(e.target.value)}
                    placeholder="e.g., Gi1/0/2"
                    className="glass border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Cable Type</Label>
                  <Select value={cableType} onValueChange={(v) => setCableType(v as Connection['cable_type'])}>
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
                  <Label className="text-gray-300">Cable Length (ft)</Label>
                  <Input
                    type="number"
                    value={cableLength}
                    onChange={(e) => setCableLength(e.target.value)}
                    placeholder="Optional"
                    className="glass border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Description (Optional)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Uplink to core switch"
                  className="glass border-white/10 text-white placeholder:text-gray-500"
                />
              </div>

              <Button
                onClick={handleAddConnection}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Connection
              </Button>
            </div>

            <div className="border-t border-white/10 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Existing Connections ({connections.length})
              </h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                <AnimatePresence>
                  {connections.map(conn => (
                    <motion.div
                      key={conn.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="glass border-white/10 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-white font-medium">
                              {getDeviceName(conn.source_device_id)}
                            </span>
                            <span className="text-gray-500">→</span>
                            <span className="text-white font-medium">
                              {getDeviceName(conn.destination_device_id)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400">
                            {conn.source_port} ↔ {conn.destination_port} • {conn.cable_type.toUpperCase().replace(/_/g, ' ')}
                            {conn.cable_length_ft && ` • ${conn.cable_length_ft}ft`}
                          </p>
                          {conn.description && (
                            <p className="text-sm text-gray-500 mt-1">{conn.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteConnection(conn.id)}
                          className="hover:bg-red-500/10 text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default ConnectionManager;