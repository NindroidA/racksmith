import { motion } from "framer-motion";
import { Cpu, HardDrive, Plus, Save, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { NASConfigurationService } from "../../services/api";
import { NASConfiguration } from "../../types/entities";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const chassisOptions = [
  { value: "2bay", label: "2-Bay", bays: 2 },
  { value: "4bay", label: "4-Bay", bays: 4 },
  { value: "8bay", label: "8-Bay", bays: 8 },
  { value: "12bay", label: "12-Bay", bays: 12 },
  { value: "16bay", label: "16-Bay", bays: 16 },
  { value: "24bay", label: "24-Bay", bays: 24 },
  { value: "45bay", label: "45-Bay (45drives)", bays: 45 }
];

const driveTypes = {
  hdd: { name: "HDD", color: "from-blue-500 to-blue-600", icon: "💾" },
  ssd: { name: "SSD", color: "from-purple-500 to-purple-600", icon: "⚡" },
  nvme: { name: "NVMe", color: "from-orange-500 to-orange-600", icon: "🚀" }
};

interface DriveConfig {
  bay_number: number;
  drive_type: 'hdd' | 'ssd' | 'nvme';
  capacity_tb: number;
  rpm?: number;
  interface: 'sata' | 'sas' | 'nvme';
}


const NASBuilder: React.FC = () => {
  const [config, setConfig] = useState({
    name: "",
    chassis_type: "8bay" as NASConfiguration['chassis_type'],
    raid_type: "raid6" as NASConfiguration['raid_type'],
    network_interfaces: 2
  });
  const [drives, setDrives] = useState<DriveConfig[]>([]);
  const [selectedBay, setSelectedBay] = useState<number | null>(null);

  const chassisBays = chassisOptions.find(c => c.value === config.chassis_type)?.bays || 8;

  const addDrive = (bayNumber) => {
    setDrives([...drives, {
      bay_number: bayNumber,
      drive_type: "hdd",
      capacity_tb: 4,
      rpm: 7200,
      interface: "sata"
    }]);
    setSelectedBay(null);
  };

  const removeDrive = (bayNumber) => {
    setDrives(drives.filter(d => d.bay_number !== bayNumber));
  };

  const updateDrive = (bayNumber, updates) => {
    setDrives(drives.map(d => d.bay_number === bayNumber ? { ...d, ...updates } : d));
  };

  const getDrive = (bayNumber) => drives.find(d => d.bay_number === bayNumber);

  const calculateCapacity = () => {
    const totalRaw = drives.reduce((sum, d) => sum + d.capacity_tb, 0);
    let usable = totalRaw;
    
    // Simple RAID calculations
    switch (config.raid_type) {
      case "raid0":
        usable = totalRaw;
        break;
      case "raid1":
        usable = totalRaw / 2;
        break;
      case "raid5":
        usable = totalRaw - (drives[0]?.capacity_tb || 0);
        break;
      case "raid6":
        usable = totalRaw - (2 * (drives[0]?.capacity_tb || 0));
        break;
      case "raid10":
        usable = totalRaw / 2;
        break;
      default:
        usable = totalRaw;
    }

    return { totalRaw, usable: Math.max(0, usable) };
  };

  const capacity = calculateCapacity();

  const handleSave = async () => {
    if (!config.name) {
      alert("Please enter a configuration name");
      return;
    }

    await NASConfigurationService.create({
      ...config,
      drives,
      total_capacity_tb: capacity.totalRaw,
      usable_capacity_tb: capacity.usable
    });
    alert("NAS configuration saved!");
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              NAS Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">Configuration Name *</Label>
                <Input
                  id="name"
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  placeholder="e.g., Main Storage Server"
                  className="glass border-white/10 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chassis" className="text-gray-300">Chassis Type</Label>
                <Select value={config.chassis_type} onValueChange={(v) => setConfig({ ...config, chassis_type: v as NASConfiguration['chassis_type'] })}>
                  <SelectTrigger className="glass border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-white/10">
                    {chassisOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="raid" className="text-gray-300">RAID Type</Label>
                <Select value={config.raid_type} onValueChange={(v) => setConfig({ ...config, raid_type: v as NASConfiguration['raid_type'] })}>
                  <SelectTrigger className="glass border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-white/10">
                    <SelectItem value="raid0">RAID 0 (Striping)</SelectItem>
                    <SelectItem value="raid1">RAID 1 (Mirroring)</SelectItem>
                    <SelectItem value="raid5">RAID 5 (1 Parity)</SelectItem>
                    <SelectItem value="raid6">RAID 6 (2 Parity)</SelectItem>
                    <SelectItem value="raid10">RAID 10 (1+0)</SelectItem>
                    <SelectItem value="jbod">JBOD (No RAID)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="network" className="text-gray-300">Network Interfaces</Label>
                <Select value={config.network_interfaces.toString()} onValueChange={(v) => setConfig({ ...config, network_interfaces: parseInt(v) })}>
                  <SelectTrigger className="glass border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-white/10">
                    <SelectItem value="1">1x 1GbE</SelectItem>
                    <SelectItem value="2">2x 1GbE (Link Aggregation)</SelectItem>
                    <SelectItem value="4">2x 10GbE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Drive Bay Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-3 ${chassisBays > 24 ? 'grid-cols-9' : chassisBays > 12 ? 'grid-cols-6' : 'grid-cols-4'}`}>
              {Array.from({ length: chassisBays }, (_, i) => i + 1).map(bayNum => {
                const drive = getDrive(bayNum);
                const driveType = (drive ? driveTypes[drive.drive_type] : null)!;
                
                return (
                  <motion.button
                    key={bayNum}
                    onClick={() => drive ? setSelectedBay(bayNum) : addDrive(bayNum)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`aspect-square rounded-lg border-2 transition-all relative overflow-hidden ${
                      drive 
                        ? `bg-gradient-to-br ${driveType.color} border-white/30 glow`
                        : 'glass border-white/20 border-dashed hover:border-white/40'
                    }`}
                  >
                    {drive ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                        <HardDrive className="w-6 h-6 mb-1" />
                        <span className="text-xs font-bold">{drive.capacity_tb}TB</span>
                        <span className="text-xs opacity-80">{driveType.name}</span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <Plus className="w-5 h-5" />
                      </div>
                    )}
                    <div className="absolute top-1 left-1 text-xs font-mono text-white/60">
                      {bayNum}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {selectedBay && getDrive(selectedBay) && (
          <Card className="glass-card border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Bay {selectedBay}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeDrive(selectedBay)}
                className="hover:bg-red-500/10 text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const drive = getDrive(selectedBay)!;
                return (
                  <>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Drive Type</Label>
                      <Select 
                        value={drive.drive_type} 
                        onValueChange={(v) => updateDrive(selectedBay, { drive_type: v })}
                      >
                        <SelectTrigger className="glass border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass-card border-white/10">
                          <SelectItem value="hdd">HDD (7200 RPM)</SelectItem>
                          <SelectItem value="ssd">SSD (SATA)</SelectItem>
                          <SelectItem value="nvme">NVMe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Capacity (TB)</Label>
                      <Select 
                        value={drive.capacity_tb.toString()} 
                        onValueChange={(v) => updateDrive(selectedBay, { capacity_tb: parseFloat(v) })}
                      >
                        <SelectTrigger className="glass border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass-card border-white/10">
                          {[1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20].map(size => (
                            <SelectItem key={size} value={size.toString()}>{size} TB</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {drive.drive_type === 'hdd' && (
                      <div className="space-y-2">
                        <Label className="text-gray-300">RPM</Label>
                        <Select 
                          value={drive.rpm!.toString()} 
                          onValueChange={(v) => updateDrive(selectedBay, { rpm: parseInt(v) })}
                        >
                          <SelectTrigger className="glass border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="glass-card border-white/10">
                            <SelectItem value="5400">5400 RPM</SelectItem>
                            <SelectItem value="7200">7200 RPM</SelectItem>
                            <SelectItem value="10000">10000 RPM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        )}

        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Capacity Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">Raw Capacity</p>
              <p className="text-2xl font-bold text-white">{capacity.totalRaw.toFixed(2)} TB</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Usable Capacity ({config.raid_type.toUpperCase()})</p>
              <p className="text-2xl font-bold text-green-400">{capacity.usable.toFixed(2)} TB</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Drives Installed</p>
              <p className="text-2xl font-bold text-blue-400">{drives.length} / {chassisBays}</p>
            </div>

            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-gray-400 mb-2">Drive Breakdown</p>
              <div className="space-y-2">
                {Object.entries(
                  drives.reduce((acc, d) => {
                    acc[d.drive_type] = (acc[d.drive_type] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([type, count]) => (
                  <Badge key={type} className={`bg-gradient-to-r ${driveTypes[type].color}`}>
                    {count}x {driveTypes[type].name}
                  </Badge>
                ))}
              </div>
            </div>

            <Button onClick={handleSave} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default NASBuilder;