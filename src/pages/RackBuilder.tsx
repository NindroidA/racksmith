
import { motion } from "framer-motion";
import { ArrowLeft, Save } from "lucide-react";
import React, { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import DevicePropertiesPanel from "../components/rack-builder/DevicePropertiesPanel";
import DeviceSelector from "../components/rack-builder/DeviceSelector";
import RackVisualizer from "../components/rack-builder/RackVisualizer";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { DeviceService, RackConfigurationService } from "../services/api";
import type { Device, RackConfiguration } from "../types/entities";

const RackBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [rackName, setRackName] = useState<string>("");
  const [rackSize, setRackSize] = useState<number>(42);
  const [location, setLocation] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [colorTag, setColorTag] = useState<RackConfiguration['color_tag']>("blue");
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const loadRack = useCallback(async () => {
    if (!id) return;
    const racks = await RackConfigurationService.list();
    const foundRack = racks.find(r => r.id === id);
    if (foundRack) {
      setRackName(foundRack.name);
      setRackSize(foundRack.size_u);
      setLocation(foundRack.location || "");
      setDescription(foundRack.description || "");
      setColorTag(foundRack.color_tag || "blue");

      const rackDevices = await DeviceService.filter({ rack_config_id: id });
      setDevices(rackDevices);
    }
  }, [id]);

  const handleSave = async () => {
    if (!rackName) {
      toast.error("Please enter a rack name");
      return;
    }

    setIsSaving(true);
    try {
      let savedRackId = id;
      
      if (id) {
        await RackConfigurationService.update(id, {
          name: rackName,
          size_u: rackSize,
          location,
          description,
          color_tag: colorTag
        });
      } else {
        const newRack = await RackConfigurationService.create({
          name: rackName,
          size_u: rackSize,
          location,
          description,
          color_tag: colorTag
        });
        savedRackId = newRack.id;
      }

      // Device updates...
      navigate(`/racks/${savedRackId}`);
    } catch (error) {
      console.error("Error saving rack:", error);
      toast.error("Error saving rack configuration");
    }
    setIsSaving(false);
  };

  const addDevice = (deviceData) => {
    setDevices([...devices, { ...deviceData, id: `temp-${Date.now()}` }]);
  };

  const updateDevice = (deviceId, updates) => {
    setDevices(devices.map(d => d.id === deviceId ? { ...d, ...updates } : d));
    if (selectedDevice?.id === deviceId) {
      setSelectedDevice({ ...selectedDevice, ...updates });
    }
  };

  const moveDevice = (deviceId, newPosition) => {
    updateDevice(deviceId, { position_u: newPosition });
  };

  const removeDevice = (deviceId) => {
    setDevices(devices.filter(d => d.id !== deviceId));
    if (selectedDevice?.id === deviceId) {
      setSelectedDevice(null);
    }
  };

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
            onClick={() => navigate("dashboard")}
            className="glass border-white/10 hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold gradient-text">
              {id ? "Edit Rack Configuration" : "New Rack Configuration"}
            </h1>
            <p className="text-gray-400 mt-1">Design your rack layout and add devices</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg"
          >
            <Save className="w-5 h-5 mr-2" />
            {isSaving ? "Saving..." : "Save Configuration"}
          </Button>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Rack Properties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rackName" className="text-gray-300">Rack Name</Label>
                    <Input
                      id="rackName"
                      value={rackName}
                      onChange={(e) => setRackName(e.target.value)}
                      placeholder="e.g., Main Server Rack"
                      className="glass border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rackSize" className="text-gray-300">Rack Size (U)</Label>
                    <Select value={rackSize.toString()} onValueChange={(v) => setRackSize(parseInt(v))}>
                      <SelectTrigger className="glass border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-card border-white/10">
                        {[24, 36, 42, 45, 48, 52].map(size => (
                          <SelectItem key={size} value={size.toString()}>{size}U</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-gray-300">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Data Center A, Row 3"
                      className="glass border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="colorTag" className="text-gray-300">Color Tag</Label>
                    <Select value={colorTag} onValueChange={(v) => setColorTag(v as RackConfiguration['color_tag'])}>
                      <SelectTrigger className="glass border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-card border-white/10">
                        <SelectItem value="blue">Blue</SelectItem>
                        <SelectItem value="purple">Purple</SelectItem>
                        <SelectItem value="cyan">Cyan</SelectItem>
                        <SelectItem value="green">Green</SelectItem>
                        <SelectItem value="orange">Orange</SelectItem>
                        <SelectItem value="red">Red</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-gray-300">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add notes about this rack configuration..."
                    className="glass border-white/10 text-white placeholder:text-gray-500 min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>

            <RackVisualizer
              rackSize={rackSize}
              devices={devices}
              selectedDevice={selectedDevice as Device}
              onDeviceSelect={setSelectedDevice}
              onDeviceRemove={removeDevice}
              onDeviceMove={moveDevice}
              colorTag={colorTag}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {selectedDevice ? (
              <DevicePropertiesPanel
                device={selectedDevice}
                onUpdate={(updates) => updateDevice(selectedDevice.id, updates)}
                onClose={() => setSelectedDevice(null)}
              />
            ) : (
              <DeviceSelector
                rackSize={rackSize}
                existingDevices={devices}
                onAddDevice={addDevice}
              />
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default RackBuilder;