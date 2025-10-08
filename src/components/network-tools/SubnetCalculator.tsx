import { Calculator } from "lucide-react";
import React, { useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface SubnetResult {
  network: string;
  broadcast: string;
  subnetMask: string;
  firstUsable: string;
  lastUsable: string;
  totalHosts: number;
  usableHosts: number;
  recommendedDevices: {
    workstations: number;
    servers: number;
    printers: number;
    iot: number;
    reserved: number;
  };
}

export const SubnetCalculator: React.FC = () => {
  const [ipAddress, setIpAddress] = useState<string>("192.168.1.0");
  const [cidr, setCidr] = useState<number>(24);
  const [result, setResult] = useState<SubnetResult | null>(null);

  const calculate = () => {
    const ipPattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipPattern.test(ipAddress)) {
      alert("Please enter a valid IP address.");
      return;
    }

    const mask = (0xFFFFFFFF << (32 - cidr)) >>> 0;
    const maskOctets = [
      (mask >>> 24) & 0xFF,
      (mask >>> 16) & 0xFF,
      (mask >>> 8) & 0xFF,
      mask & 0xFF
    ];

    const ipOctets = ipAddress.split('.').map(Number);
    const networkOctets: number[] = ipOctets.map((octet, i) => octet & maskOctets[i]!);
    const invertedMaskOctets: number[] = maskOctets.map(octet => (~octet >>> 0) & 0xFF);
    const broadcastOctets: number[] = networkOctets.map((octet, i) => octet | invertedMaskOctets[i]!);

    const totalHosts = Math.pow(2, 32 - cidr);
    const usableHosts = Math.max(0, totalHosts - 2);

    const firstUsable: number[] = [...networkOctets];
    const lastUsable: number[] = [...broadcastOctets];

    if (usableHosts > 0) {
      firstUsable[3] = networkOctets[3]! + 1;
      lastUsable[3] = broadcastOctets[3]! - 1;
    } else {
      firstUsable[3] = networkOctets[3]!;
      lastUsable[3] = broadcastOctets[3]!;
    }

    const recommendedDevices = {
      workstations: Math.floor(usableHosts * 0.6),
      servers: Math.floor(usableHosts * 0.1),
      printers: Math.floor(usableHosts * 0.05),
      iot: Math.floor(usableHosts * 0.15),
      reserved: Math.floor(usableHosts * 0.1)
    };

    setResult({
      network: networkOctets.join('.'),
      broadcast: broadcastOctets.join('.'),
      subnetMask: maskOctets.join('.'),
      firstUsable: usableHosts > 0 ? firstUsable.join('.') : 'N/A',
      lastUsable: usableHosts > 0 ? lastUsable.join('.') : 'N/A',
      totalHosts,
      usableHosts,
      recommendedDevices
    });
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Subnet Calculator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ipAddress" className="text-gray-300">IP Address</Label>
            <Input
              id="ipAddress"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="192.168.1.0"
              className="glass border-white/10 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cidr" className="text-gray-300">CIDR Notation (/{cidr})</Label>
            <Input
              id="cidr"
              type="range"
              min="8"
              max="30"
              value={cidr}
              onChange={(e) => setCidr(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>/8</span>
              <span className="text-white font-bold">/{cidr}</span>
              <span>/30</span>
            </div>
          </div>

          <Button
            onClick={calculate}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Calculator className="w-4 h-4 mr-2" />
            Calculate
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Results & Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <ResultRow label="Network Address" value={result.network} />
                <ResultRow label="Subnet Mask" value={result.subnetMask} />
                <ResultRow label="Broadcast Address" value={result.broadcast} />
                <ResultRow label="First Usable" value={result.firstUsable} />
                <ResultRow label="Last Usable" value={result.lastUsable} />
                <ResultRow label="Total Hosts" value={result.totalHosts.toLocaleString()} />
                <ResultRow label="Usable Hosts" value={result.usableHosts.toLocaleString()} highlight />
              </div>

              {result.usableHosts > 0 && (
                <div className="pt-4 border-t border-white/10 mt-4">
                  <h4 className="font-semibold text-white mb-3">Device Allocation Recommendations</h4>
                  <p className="text-gray-400 text-sm mb-3">Based on {result.usableHosts.toLocaleString()} usable IP addresses:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center text-gray-300">
                      <span>Workstations (60%):</span>
                      <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                        {result.recommendedDevices.workstations}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-gray-300">
                      <span>Servers (10%):</span>
                      <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                        {result.recommendedDevices.servers}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-gray-300">
                      <span>Printers/MFPs (5%):</span>
                      <Badge variant="outline" className="border-green-500/30 text-green-400">
                        {result.recommendedDevices.printers}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-gray-300">
                      <span>IoT/Cameras (15%):</span>
                      <Badge variant="outline" className="border-orange-500/30 text-orange-400">
                        {result.recommendedDevices.iot}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-gray-300">
                      <span>Reserved (10%):</span>
                      <Badge variant="outline" className="border-gray-500/30 text-gray-400">
                        {result.recommendedDevices.reserved}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <Calculator className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Enter values and calculate</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface ResultRowProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function ResultRow({ label, value, highlight }: ResultRowProps) {
  return (
    <div className={`flex justify-between items-center p-3 rounded-lg ${highlight ? 'glass-card border-green-500/50' : 'glass border-white/10'}`}>
      <span className="text-gray-300 font-medium">{label}</span>
      <code className={`${highlight ? 'text-green-400' : 'text-blue-400'} font-mono text-lg`}>{value}</code>
    </div>
  );
}

export default SubnetCalculator;