import { motion } from "framer-motion";
import { Save, X } from "lucide-react";
import { useState } from "react";
import { PortService } from "../../services/api";
import { Port } from "../../types/entities";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";

interface PortEditorProps {
  port?: Port;
  deviceId: string;
  onClose: () => void;
}

const PortEditor: React.FC<PortEditorProps> = ({ port, deviceId, onClose }) => {
  const [formData, setFormData] = useState<Omit<Port, 'id'>>(port || {
    device_id: deviceId,
    port_number: "",
    port_type: "ethernet",
    status: "available",
    description: "",
    vlan: "",
    speed: "1G",
    notes: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.port_number) {
      alert("Please enter a port number");
      return;
    }

    if (port) {
      await PortService.update(port.id, formData);
    } else {
      await PortService.create(formData);
    }
    onClose();
  };

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
            <CardTitle className="text-white">
              {port ? "Edit Port" : "Add New Port"}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/10">
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="port_number" className="text-gray-300">Port Number *</Label>
                  <Input
                    id="port_number"
                    value={formData.port_number}
                    onChange={(e) => setFormData({ ...formData, port_number: e.target.value })}
                    placeholder="e.g., Gi1/0/1, eth0, Port 24"
                    className="glass border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="port_type" className="text-gray-300">Port Type</Label>
                  <Select value={formData.port_type!} onValueChange={(v) => setFormData({ ...formData, port_type: v as Port['port_type'] })}>
                    <SelectTrigger className="glass border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      <SelectItem value="ethernet">Ethernet</SelectItem>
                      <SelectItem value="sfp">SFP</SelectItem>
                      <SelectItem value="sfp_plus">SFP+</SelectItem>
                      <SelectItem value="qsfp">QSFP</SelectItem>
                      <SelectItem value="qsfp28">QSFP28</SelectItem>
                      <SelectItem value="fiber">Fiber</SelectItem>
                      <SelectItem value="power">Power</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-gray-300">Status</Label>
                  <Select value={formData.status!} onValueChange={(v) => setFormData({ ...formData, status: v as Port['status'] })}>
                    <SelectTrigger className="glass border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="connected">Connected</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="speed" className="text-gray-300">Speed</Label>
                  <Select value={formData.speed!} onValueChange={(v) => setFormData({ ...formData, speed: v as Port['speed'] })}>
                    <SelectTrigger className="glass border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      <SelectItem value="10M">10 Mbps</SelectItem>
                      <SelectItem value="100M">100 Mbps</SelectItem>
                      <SelectItem value="1G">1 Gbps</SelectItem>
                      <SelectItem value="2.5G">2.5 Gbps</SelectItem>
                      <SelectItem value="5G">5 Gbps</SelectItem>
                      <SelectItem value="10G">10 Gbps</SelectItem>
                      <SelectItem value="25G">25 Gbps</SelectItem>
                      <SelectItem value="40G">40 Gbps</SelectItem>
                      <SelectItem value="100G">100 Gbps</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vlan" className="text-gray-300">VLAN</Label>
                  <Input
                    id="vlan"
                    value={formData.vlan}
                    onChange={(e) => setFormData({ ...formData, vlan: e.target.value })}
                    placeholder="e.g., 100"
                    className="glass border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-gray-300">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Uplink to core"
                    className="glass border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-gray-300">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add additional notes about this port..."
                  className="glass border-white/10 text-white placeholder:text-gray-500 min-h-[100px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onClose} className="glass border-white/10 hover:bg-white/10">
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                  <Save className="w-4 h-4 mr-2" />
                  {port ? "Update Port" : "Create Port"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default PortEditor;