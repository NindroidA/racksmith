import { Cpu, HardDrive, Phone, Router, Shield, Wifi } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';

const deviceCategories = [
  { id: 'compute', name: 'Compute', icon: Cpu },
  { id: 'storage', name: 'Storage', icon: HardDrive },
  { id: 'wireless', name: 'Wireless', icon: Wifi },
  { id: 'security', name: 'Security', icon: Shield },
  { id: 'voice', name: 'Voice/Intercom', icon: Phone },
  { id: 'access', name: 'Access Control', icon: Router },
];

// placeholder data
const allDevices = [
  {
    id: '1',
    name: 'Raspberry Pi 4',
    subtitle: '8GB',
    description: 'ARM-based SBC perfect for clusters',
    category: 'compute',
    type: 'Single Board Computer',
    power: '15W',
    size: null
  },
  {
    id: '2',
    name: 'Raspberry Pi Cluster',
    subtitle: '4-Node',
    description: '4x Pi 4 with networking',
    category: 'compute',
    type: 'Compute Cluster',
    power: '60W',
    size: '1U'
  },
  {
    id: '3',
    name: 'Intel NUC',
    subtitle: 'i7-12th Gen',
    description: 'Compact x86 compute node',
    category: 'compute',
    type: 'Mini PC',
    power: '65W',
    size: '1U'
  },
  {
    id: '4',
    name: 'Dell PowerEdge R740',
    subtitle: 'R740',
    description: '2U enterprise server',
    category: 'compute',
    type: 'Rack Server',
    power: '750W',
    size: '2U'
  },
  {
    id: '5',
    name: 'HP ProLiant DL380',
    subtitle: 'Gen10',
    description: '2U general purpose server',
    category: 'compute',
    type: 'Rack Server',
    power: '800W',
    size: '2U'
  },
  {
    id: '6',
    name: 'Synology DS920+',
    subtitle: 'DS920+',
    description: '4-bay NAS with expandability',
    category: 'storage',
    type: 'NAS',
    power: '60W',
    size: null
  },
  {
    id: '7',
    name: 'QNAP TS-h973AX',
    subtitle: 'TS-h973AX',
    description: '9-bay hybrid NAS',
    category: 'storage',
    type: 'NAS',
    power: '90W',
    size: null
  },
  {
    id: '8',
    name: 'UniFi Dream Machine Pro',
    subtitle: 'UDM-Pro',
    description: 'All-in-one security gateway',
    category: 'wireless',
    type: 'Router',
    power: '35W',
    size: '1U'
  },
  {
    id: '9',
    name: 'UniFi 6 Enterprise',
    subtitle: 'U6-Enterprise',
    description: 'WiFi 6 high-capacity AP',
    category: 'wireless',
    type: 'Access Point',
    power: '25W',
    size: null
  },
  {
    id: '10',
    name: 'Cisco ASA 5516-X',
    subtitle: 'ASA5516',
    description: 'Next-gen firewall',
    category: 'security',
    type: 'Firewall',
    power: '250W',
    size: '1U'
  },
  {
    id: '11',
    name: 'Grandstream GXP2170',
    subtitle: 'GXP2170',
    description: 'Enterprise IP phone',
    category: 'voice',
    type: 'VoIP Phone',
    power: '5W',
    size: null
  },
  {
    id: '12',
    name: 'HID VertX V100',
    subtitle: 'V100',
    description: 'Network door controller',
    category: 'access',
    type: 'Access Controller',
    power: '15W',
    size: null
  }
];

export default function DeviceOptions() {
  const [activeCategory, setActiveCategory] = useState('compute');
  const [isLoading] = useState(false);

  const filteredDevices = allDevices.filter(d => d.category === activeCategory);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glass-card p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Cpu className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">Device Options & Catalog</h1>
              <p className="text-gray-400">Comprehensive catalog of network and infrastructure devices</p>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="glass-card p-1 inline-flex rounded-lg mb-8">
          {deviceCategories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-md font-medium transition-all ${
                  activeCategory === category.id
                    ? 'bg-gradient-to-r from-blue-500/30 to-purple-500/30 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {category.name}
              </button>
            );
          })}
        </div>

        {/* Device Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="glass-card border-white/10">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-16 w-16 rounded-xl bg-white/5" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-32 bg-white/5" />
                        <Skeleton className="h-4 w-24 bg-white/5" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-full bg-white/5" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-24 bg-white/5" />
                      <Skeleton className="h-6 w-16 bg-white/5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDevices.map((device) => (
              <Card key={device.id} className="glass-card border-white/10 hover:border-white/20 transition-all group">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Cpu className="w-8 h-8 text-white" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white truncate">{device.name}</h3>
                        {device.size && (
                          <span className="px-2 py-1 rounded-md bg-white/10 text-xs font-semibold text-white flex-shrink-0">
                            {device.size}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{device.subtitle}</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-300 mb-4">{device.description}</p>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full bg-white/5 text-xs font-medium text-gray-300">
                      {device.type}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-xs font-medium text-yellow-400">
                      {device.power}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}