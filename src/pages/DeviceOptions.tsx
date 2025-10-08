import { motion } from "framer-motion";
import { Camera, Cpu, DoorOpen, HardDrive, Phone, Server, Wifi } from "lucide-react";
import React from "react";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

const deviceCategories = {
  compute: {
    icon: Cpu,
    color: "from-blue-500 to-blue-600",
    devices: [
      { name: "Raspberry Pi 4", model: "8GB", type: "Single Board Computer", size_u: 0, power: 15, description: "ARM-based SBC perfect for clusters" },
      { name: "Raspberry Pi Cluster", model: "4-Node", type: "Compute Cluster", size_u: 1, power: 60, description: "4x Pi 4 with networking" },
      { name: "Intel NUC", model: "i7-12th Gen", type: "Mini PC", size_u: 0, power: 65, description: "Compact x86 compute node" },
      { name: "Dell PowerEdge R740", model: "R740", type: "Rack Server", size_u: 2, power: 750, description: "2U enterprise server" },
      { name: "HP ProLiant DL380", model: "Gen10", type: "Rack Server", size_u: 2, power: 800, description: "2U general purpose server" },
    ]
  },
  storage: {
    icon: HardDrive,
    color: "from-purple-500 to-purple-600",
    devices: [
      { name: "Synology DS920+", model: "DS920+", type: "4-Bay NAS", size_u: 0, power: 60, description: "Small business NAS" },
      { name: "QNAP TS-h973AX", model: "TS-h973AX", type: "9-Bay Hybrid NAS", size_u: 0, power: 250, description: "High-performance NAS" },
      { name: "TrueNAS Mini X", model: "Mini X", type: "Enterprise NAS", size_u: 1, power: 150, description: "Compact enterprise storage" },
      { name: "45Drives Storinator", model: "S45", type: "45-Bay Storage", size_u: 4, power: 600, description: "Massive storage capacity" },
      { name: "Supermicro Storage", model: "6049P-E1CR24L", type: "24-Bay Server", size_u: 4, power: 1200, description: "Enterprise storage server" },
    ]
  },
  wireless: {
    icon: Wifi,
    color: "from-cyan-500 to-cyan-600",
    devices: [
      { name: "UniFi AP-AC-Pro", model: "UAP-AC-PRO", type: "Access Point", size_u: 0, power: 9, poe: true, description: "Dual-band WiFi 5 AP" },
      { name: "UniFi AP-6-Pro", model: "U6-Pro", type: "Access Point", size_u: 0, power: 13, poe: true, description: "WiFi 6 access point" },
      { name: "UniFi AP-6-LR", model: "U6-LR", type: "Long Range AP", size_u: 0, power: 16, poe: true, description: "Extended range WiFi 6" },
      { name: "Cisco Catalyst 9120", model: "C9120AXI", type: "Enterprise AP", size_u: 0, power: 26, poe: true, description: "WiFi 6 enterprise AP" },
      { name: "Aruba AP-515", model: "AP-515", type: "Access Point", size_u: 0, power: 22, poe: true, description: "High-performance WiFi 6" },
    ]
  },
  security: {
    icon: Camera,
    color: "from-red-500 to-red-600",
    devices: [
      { name: "UniFi G4 Bullet", model: "UVC-G4-BULLET", type: "IP Camera", size_u: 0, power: 9, poe: true, description: "4MP outdoor camera" },
      { name: "UniFi G4 Dome", model: "UVC-G4-DOME", type: "IP Camera", size_u: 0, power: 9, poe: true, description: "4MP indoor dome" },
      { name: "UniFi G4 Pro", model: "UVC-G4-PRO", type: "PTZ Camera", size_u: 0, power: 25, poe: true, description: "4K PTZ camera" },
      { name: "Axis P3245-LVE", model: "P3245-LVE", type: "IP Camera", size_u: 0, power: 13, poe: true, description: "Professional dome camera" },
      { name: "Hikvision DS-2CD2385G1", model: "DS-2CD2385G1", type: "IP Camera", size_u: 0, power: 12, poe: true, description: "8MP turret camera" },
    ]
  },
  voice: {
    icon: Phone,
    color: "from-green-500 to-emerald-600",
    devices: [
      { name: "Cisco IP Phone 8845", model: "CP-8845", type: "VoIP Phone", size_u: 0, power: 5, poe: true, description: "HD video phone" },
      { name: "Yealink T46S", model: "SIP-T46S", type: "VoIP Phone", size_u: 0, power: 5, poe: true, description: "Color screen IP phone" },
      { name: "Grandstream GXP2170", model: "GXP2170", type: "VoIP Phone", size_u: 0, power: 4, poe: true, description: "High-end IP phone" },
      { name: "Polycom VVX 450", model: "VVX 450", type: "VoIP Phone", size_u: 0, power: 5, poe: true, description: "Business media phone" },
      { name: "2N IP Intercom", model: "2N-IP-VERSO", type: "Intercom", size_u: 0, power: 15, poe: true, description: "Video door intercom" },
    ]
  },
  access: {
    icon: DoorOpen,
    color: "from-yellow-500 to-yellow-600",
    devices: [
      { name: "UniFi Door Access Pro", model: "UA-Pro", type: "Access Controller", size_u: 0, power: 10, poe: true, description: "PoE door controller" },
      { name: "HID Edge EVO", model: "EVO-EH400", type: "Access Controller", size_u: 0, power: 12, poe: true, description: "Network access control" },
      { name: "Paxton Net2 Plus", model: "Net2 Plus", type: "Access Controller", size_u: 1, power: 24, description: "Full access control system" },
      { name: "Suprema BioStar 2", model: "BioStar 2", type: "Biometric Reader", size_u: 0, power: 8, poe: true, description: "Fingerprint + card reader" },
      { name: "Honeywell ProWatch", model: "ProWatch", type: "Enterprise Access", size_u: 2, power: 150, description: "Enterprise access control" },
    ]
  }
};

const DeviceOptions: React.FC = () => {
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
              <h1 className="text-4xl font-bold gradient-text mb-3">Device Options & Catalog</h1>
              <p className="text-gray-300 text-lg">Comprehensive catalog of network and infrastructure devices</p>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="compute" className="w-full">
          <TabsList className="glass border-white/10 p-1 grid grid-cols-6 w-full">
            <TabsTrigger value="compute" className="data-[state=active]:glass data-[state=active]:glow">
              <Cpu className="w-4 h-4 mr-2" />
              Compute
            </TabsTrigger>
            <TabsTrigger value="storage" className="data-[state=active]:glass data-[state=active]:glow">
              <HardDrive className="w-4 h-4 mr-2" />
              Storage
            </TabsTrigger>
            <TabsTrigger value="wireless" className="data-[state=active]:glass data-[state=active]:glow">
              <Wifi className="w-4 h-4 mr-2" />
              Wireless
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:glass data-[state=active]:glow">
              <Camera className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="voice" className="data-[state=active]:glass data-[state=active]:glow">
              <Phone className="w-4 h-4 mr-2" />
              Voice/Intercom
            </TabsTrigger>
            <TabsTrigger value="access" className="data-[state=active]:glass data-[state=active]:glow">
              <DoorOpen className="w-4 h-4 mr-2" />
              Access Control
            </TabsTrigger>
          </TabsList>

          {Object.entries(deviceCategories).map(([key, { icon: Icon, color, devices }]) => (
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
      </div>
    </div>
  );
}

function DeviceCard({ device, icon: Icon, color, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="glass-card border-white/10 hover:border-white/20 transition-all duration-300 group glow-hover overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
          <div className={`w-full h-full bg-gradient-to-br ${color} rounded-full blur-2xl`} />
        </div>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${color} group-hover:scale-110 transition-transform duration-300 glow relative overflow-hidden`}>
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
              <Icon className="w-6 h-6 text-white relative z-10" />
            </div>
            {device.size_u > 0 && (
              <Badge variant="outline" className="border-white/20 text-gray-300 glass">
                {device.size_u}U
              </Badge>
            )}
          </div>
          <CardTitle className="text-white mt-4 text-xl">{device.name}</CardTitle>
          <p className="text-sm text-gray-400 font-mono">{device.model}</p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-300 mb-4 leading-relaxed">{device.description}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-white/20 text-gray-400 glass">
              {device.type}
            </Badge>
            {device.power && (
              <Badge variant="outline" className="border-white/20 text-yellow-400 glass">
                {device.power}W
              </Badge>
            )}
            {device.poe && (
              <Badge variant="outline" className="border-white/20 text-green-400 glass">
                PoE
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default DeviceOptions;