import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Network } from 'lucide-react';
import React, { useState } from 'react';
import { IPSegment } from '../../types/components';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const IPAddressPlanner: React.FC = () => {
  const [facilitySize, setFacilitySize] = useState('medium');
  const [deviceCount, setDeviceCount] = useState(100);
  const [segments, setSegments] = useState<IPSegment[]>([]);

  // placeholder data
  const generatePlan = () => {
    const plans = {
      small: {
        baseNetwork: '192.168.1.0/24',
        segments: [
          { name: 'Management', subnet: '192.168.1.0/27', hosts: '30', range: '192.168.1.1 - 192.168.1.30' },
          { name: 'Servers', subnet: '192.168.1.32/27', hosts: '30', range: '192.168.1.33 - 192.168.1.62' },
          { name: 'Users', subnet: '192.168.1.64/26', hosts: '62', range: '192.168.1.65 - 192.168.1.126' },
          { name: 'Guest WiFi', subnet: '192.168.1.128/26', hosts: '62', range: '192.168.1.129 - 192.168.1.190' },
        ]
      },
      medium: {
        baseNetwork: '10.0.0.0/16',
        segments: [
          { name: 'Management', subnet: '10.0.0.0/24', hosts: '254', range: '10.0.0.1 - 10.0.0.254' },
          { name: 'Servers', subnet: '10.0.1.0/24', hosts: '254', range: '10.0.1.1 - 10.0.1.254' },
          { name: 'Users - Floor 1', subnet: '10.0.10.0/23', hosts: '510', range: '10.0.10.1 - 10.0.11.254' },
          { name: 'Users - Floor 2', subnet: '10.0.12.0/23', hosts: '510', range: '10.0.12.1 - 10.0.13.254' },
          { name: 'Guest WiFi', subnet: '10.0.20.0/24', hosts: '254', range: '10.0.20.1 - 10.0.20.254' },
          { name: 'IoT Devices', subnet: '10.0.30.0/24', hosts: '254', range: '10.0.30.1 - 10.0.30.254' },
        ]
      },
      large: {
        baseNetwork: '10.0.0.0/8',
        segments: [
          { name: 'Management', subnet: '10.0.0.0/24', hosts: '254', range: '10.0.0.1 - 10.0.0.254' },
          { name: 'Server Farm', subnet: '10.1.0.0/16', hosts: '65,534', range: '10.1.0.1 - 10.1.255.254' },
          { name: 'Users - Building A', subnet: '10.10.0.0/16', hosts: '65,534', range: '10.10.0.1 - 10.10.255.254' },
          { name: 'Users - Building B', subnet: '10.20.0.0/16', hosts: '65,534', range: '10.20.0.1 - 10.20.255.254' },
          { name: 'Guest Networks', subnet: '10.100.0.0/16', hosts: '65,534', range: '10.100.0.1 - 10.100.255.254' },
          { name: 'IoT & Sensors', subnet: '10.200.0.0/16', hosts: '65,534', range: '10.200.0.1 - 10.200.255.254' },
        ]
      }
    };

    setSegments(plans[facilitySize].segments);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Network Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="facilitySize" className="text-gray-300">Facility Size</Label>
            <Select value={facilitySize} onValueChange={setFacilitySize}>
              <SelectTrigger className="glass border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10">
                <SelectItem value="small">Small (1-50 devices)</SelectItem>
                <SelectItem value="medium">Medium (50-500 devices)</SelectItem>
                <SelectItem value="large">Large (500+ devices)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deviceCount" className="text-gray-300">Estimated Devices</Label>
            <Input
              id="deviceCount"
              type="number"
              value={deviceCount}
              onChange={(e) => setDeviceCount(parseInt(e.target.value) || 0)}
              className="glass border-white/10 text-white"
            />
          </div>

          <Button
            onClick={generatePlan}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            <Network className="w-4 h-4 mr-2" />
            Generate Plan
          </Button>

          <div className="pt-4 border-t border-white/10 space-y-3">
            <div className="flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-gray-300">
                <p className="font-semibold mb-1">Best Practices:</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-gray-400">
                  <li>Use private IP ranges (10.x, 172.16-31.x, 192.168.x)</li>
                  <li>Plan for 30% growth capacity</li>
                  <li>Separate networks by function/security</li>
                  <li>Document IP assignments</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="lg:col-span-2">
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Recommended IP Addressing Scheme</CardTitle>
          </CardHeader>
          <CardContent>
            {segments.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Network className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Generate a plan to see recommendations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {segments.map((segment, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="glass border-white/10 rounded-lg p-4 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                        <h3 className="font-bold text-white">{segment.name}</h3>
                      </div>
                      <Badge variant="outline" className="border-green-500/50 text-green-400">
                        {segment.hosts} hosts
                      </Badge>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400">Subnet:</span>
                        <code className="ml-2 text-blue-400 glass px-2 py-1 rounded">{segment.subnet}</code>
                      </div>
                      <div>
                        <span className="text-gray-400">Range:</span>
                        <code className="ml-2 text-purple-400 glass px-2 py-1 rounded text-xs">{segment.range}</code>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IPAddressPlanner;