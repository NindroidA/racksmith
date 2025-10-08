
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Cable, Camera, Check, Network, Phone, Save, Wifi, Zap } from "lucide-react";
import React, { useState } from "react";
import { NetworkPlanService } from "../../services/api";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface PlanData {
  name: string;
  facility_size: 'small' | 'medium' | 'large' | 'enterprise';
  total_devices: number;
  wired_devices: number;
  wireless_devices: number;
  access_points: number;
  cameras: number;
  phones: number;
  floors: number;
  square_feet: number;
}

interface IPScheme {
  base: string;
  management?: string;
  servers?: string;
  users?: string;
  guest?: string;
  iot?: string;
}

interface VLANConfig {
  vlan_id: string;
  name: string;
  description: string;
  subnet: string;
  ports?: string;
  device_count?: string;
}

export const NetworkBuilder: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [planData, setPlanData] = useState<PlanData>({
    name: "",
    facility_size: "medium",
    total_devices: 100,
    wired_devices: 60,
    wireless_devices: 40,
    access_points: 0,
    cameras: 0,
    phones: 0,
    floors: 1,
    square_feet: 5000
  });
  const [ipPlan, setIpPlan] = useState<IPScheme | undefined>(undefined);
  const [vlanPlan, setVlanPlan] = useState<VLANConfig[]>([]);

  const calculateRecommendations = () => {
    const { wireless_devices, square_feet, floors } = planData;
    
    // AP calculation: ~2500 sq ft per AP, or 30-50 devices per AP
    const apsByArea = Math.ceil(square_feet / 2500);
    const apsByDevices = Math.ceil(wireless_devices / 40);
    const recommendedAPs = Math.max(apsByArea, apsByDevices) * floors;

    // IP scheme recommendation
    let ipScheme = {
        base: "",
        management: "",
        servers: "",
        users: "",
        guest: "",
        iot: "",
    };
    if (planData.total_devices < 50) {
      ipScheme = {
        base: "192.168.1.0/24",
        management: "192.168.1.0/27",
        servers: "192.168.1.32/27",
        users: "192.168.1.64/26",
        guest: "192.168.1.128/26",
        iot: ""
      };
    } else if (planData.total_devices < 500) {
      ipScheme = {
        base: "10.0.0.0/16",
        management: "10.0.0.0/24",
        servers: "10.0.1.0/24",
        users: "10.0.10.0/23",
        guest: "10.0.20.0/24",
        iot: "10.0.30.0/24"
      };
    } else {
      ipScheme = {
        base: "10.0.0.0/8",
        management: "10.0.0.0/24",
        servers: "10.1.0.0/16",
        users: "10.10.0.0/16",
        guest: "10.100.0.0/16",
        iot: "10.200.0.0/16"
      };
    }

    setIpPlan(ipScheme);

    // VLAN recommendations
    const recommendedVLANs = [
      { vlan_id: "1", name: "Management", description: "Network management and admin", subnet: ipScheme.management },
      { vlan_id: "10", name: "Servers", description: "Production servers", subnet: ipScheme.servers },
      { vlan_id: "20", name: "Users", description: "End user workstations", subnet: ipScheme.users },
      { vlan_id: "30", name: "Guest WiFi", description: "Guest wireless network", subnet: ipScheme.guest }
    ];

    if (ipScheme.iot) {
      recommendedVLANs.push({ vlan_id: "40", name: "IoT/Cameras", description: "IoT devices and cameras", subnet: ipScheme.iot });
    }

    setVlanPlan(recommendedVLANs);

    return { recommendedAPs, ipScheme };
  };

  const handleNext = () => {
    if (step === 1) {
      calculateRecommendations();
    }
    setStep(step + 1);
  };

  const handleSavePlan = async () => {
    await NetworkPlanService.create({
      ...planData,
      ip_scheme: ipPlan,
      vlan_config: vlanPlan,
      poe_budget: (planData.access_points * 25) + (planData.cameras * 15) + (planData.phones * 7)
    });
    alert("Network plan saved successfully!");
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <Card className="glass-card border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {[
              { num: 1, name: "Device Count" },
              { num: 2, name: "IP Planning" },
              { num: 3, name: "VLAN Config" },
              { num: 4, name: "Review & Save" }
            ].map((s, idx) => (
              <React.Fragment key={s.num}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    step >= s.num 
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white glow' 
                      : 'glass border-white/20 text-gray-400'
                  }`}>
                    {step > s.num ? <Check className="w-5 h-5" /> : s.num}
                  </div>
                  <span className={`text-sm font-medium ${step >= s.num ? 'text-white' : 'text-gray-400'}`}>
                    {s.name}
                  </span>
                </div>
                {idx < 3 && (
                  <div className={`flex-1 h-1 mx-4 rounded-full ${step > s.num ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'glass'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {/* Step 1: Device Count */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Network className="w-5 h-5" />
                  Step 1: Device & Facility Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-300">Plan Name *</Label>
                    <Input
                      id="name"
                      value={planData.name}
                      onChange={(e) => setPlanData({ ...planData, name: e.target.value })}
                      placeholder="e.g., Office Network Plan"
                      className="glass border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="facility_size" className="text-gray-300">Facility Size</Label>
                    <select
                        value={planData.facility_size}
                        onChange={(e) => setPlanData({...planData, facility_size: e.target.value as PlanData['facility_size']})}
                        className="flex h-10 w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ring glass"
                    >
                        <option value="small">Small (1-25 devices)</option>
                        <option value="medium">Medium (26-100 devices)</option>
                        <option value="large">Large (101-500 devices)</option>
                        <option value="enterprise">Enterprise (500+ devices)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="square_feet" className="text-gray-300">Square Footage</Label>
                    <Input
                      id="square_feet"
                      type="number"
                      value={planData.square_feet}
                      onChange={(e) => setPlanData({ ...planData, square_feet: parseInt(e.target.value) || 0 })}
                      className="glass border-white/10 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="floors" className="text-gray-300">Number of Floors</Label>
                    <Input
                      id="floors"
                      type="number"
                      value={planData.floors}
                      onChange={(e) => setPlanData({ ...planData, floors: parseInt(e.target.value) || 1 })}
                      className="glass border-white/10 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wired_devices" className="text-gray-300">
                      <span className="flex items-center gap-2">
                        <Cable className="w-4 h-4" />
                        Wired Devices
                      </span>
                    </Label>
                    <Input
                      id="wired_devices"
                      type="number"
                      value={planData.wired_devices}
                      onChange={(e) => setPlanData({ ...planData, wired_devices: parseInt(e.target.value) || 0 })}
                      className="glass border-white/10 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wireless_devices" className="text-gray-300">
                      <span className="flex items-center gap-2">
                        <Wifi className="w-4 h-4" />
                        Wireless Devices
                      </span>
                    </Label>
                    <Input
                      id="wireless_devices"
                      type="number"
                      value={planData.wireless_devices}
                      onChange={(e) => setPlanData({ ...planData, wireless_devices: parseInt(e.target.value) || 0 })}
                      className="glass border-white/10 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cameras" className="text-gray-300">
                      <span className="flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        Security Cameras
                      </span>
                    </Label>
                    <Input
                      id="cameras"
                      type="number"
                      value={planData.cameras}
                      onChange={(e) => setPlanData({ ...planData, cameras: parseInt(e.target.value) || 0 })}
                      className="glass border-white/10 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phones" className="text-gray-300">
                      <span className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        VoIP Phones
                      </span>
                    </Label>
                    <Input
                      id="phones"
                      type="number"
                      value={planData.phones}
                      onChange={(e) => setPlanData({ ...planData, phones: parseInt(e.target.value) || 0 })}
                      className="glass border-white/10 text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleNext} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                    Continue to IP Planning
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: IP Planning */}
        {step === 2 && ipPlan && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Step 2: IP Address Planning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="glass-card border-blue-500/20 rounded-lg p-4">
                  <h3 className="font-bold text-white mb-3">Recommended IP Scheme</h3>
                  <p className="text-sm text-gray-400 mb-4">Base Network: <code className="text-blue-400">{ipPlan.base}</code></p>
                  
                  <div className="grid md:grid-cols-2 gap-3">
                    {Object.entries(ipPlan).filter(([key]) => key !== 'base').map(([key, value]) => (
                      <div key={key} className="glass border-white/10 rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">{key.toUpperCase()}</p>
                        <code className="text-sm text-green-400 font-mono">{value}</code>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-yellow-400 mt-1" />
                    <div>
                      <h4 className="font-semibold text-white mb-2">PoE Devices Detected</h4>
                      <div className="space-y-2 text-sm text-gray-300">
                        <p>• Recommended Access Points: <Badge className="ml-2">{Math.ceil(planData.square_feet / 2500) * planData.floors}</Badge></p>
                        <p>• Security Cameras: <Badge className="ml-2">{planData.cameras}</Badge></p>
                        <p>• VoIP Phones: <Badge className="ml-2">{planData.phones}</Badge></p>
                        <p className="mt-3 font-semibold text-yellow-400">
                          Estimated PoE Budget: {(Math.ceil(planData.square_feet / 2500) * planData.floors * 25) + (planData.cameras * 15) + (planData.phones * 7)}W
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(1)} className="glass border-white/10 hover:bg-white/10">
                    Back
                  </Button>
                  <Button onClick={handleNext} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                    Continue to VLAN Config
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: VLAN Configuration */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Step 3: VLAN Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {vlanPlan.map((vlan, idx) => (
                  <div key={idx} className="glass-card border-white/10 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-white">VLAN {vlan.vlan_id} - {vlan.name}</h3>
                        <p className="text-sm text-gray-400 mt-1">{vlan.description}</p>
                      </div>
                      <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                        {vlan.subnet}
                      </Badge>
                    </div>
                    <div className="grid md:grid-cols-2 gap-2">
                      <Input
                        placeholder="Port range (e.g., 1-24)"
                        className="glass border-white/10 text-white placeholder:text-gray-500"
                        onChange={(e) => {
                          const updated = [...vlanPlan];
                          updated[idx]!.ports = e.target.value;
                          setVlanPlan(updated);
                        }}
                      />
                      <Input
                        placeholder="Device count"
                        type="number"
                        className="glass border-white/10 text-white placeholder:text-gray-500"
                        onChange={(e) => {
                          const updated = [...vlanPlan];
                          updated[idx]!.device_count = e.target.value;
                          setVlanPlan(updated);
                        }}
                      />
                    </div>
                  </div>
                ))}

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(2)} className="glass border-white/10 hover:bg-white/10">
                    Back
                  </Button>
                  <Button onClick={handleNext} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                    Review Plan
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 4: Review & Save */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Step 4: Review & Save Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="glass-card border-green-500/20 rounded-lg p-6">
                  <h3 className="text-2xl font-bold text-white mb-4">{planData.name}</h3>
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-400">Total Devices</p>
                      <p className="text-2xl font-bold text-white">{planData.wired_devices + planData.wireless_devices}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">VLANs Configured</p>
                      <p className="text-2xl font-bold text-white">{vlanPlan.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">PoE Budget</p>
                      <p className="text-2xl font-bold text-yellow-400">
                        {(Math.ceil(planData.square_feet / 2500) * planData.floors * 25) + (planData.cameras * 15) + (planData.phones * 7)}W
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <h4 className="font-semibold text-white mb-3">Network Summary</h4>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li>• Base Network: <code className="text-blue-400">{ipPlan!.base}</code></li>
                      <li>• {vlanPlan.length} VLANs configured for segmentation</li>
                      <li>• {planData.wired_devices} wired + {planData.wireless_devices} wireless devices</li>
                      <li>• {Math.ceil(planData.square_feet / 2500) * planData.floors} access points recommended</li>
                      <li>• {planData.cameras} cameras + {planData.phones} phones</li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(3)} className="glass border-white/10 hover:bg-white/10">
                    Back
                  </Button>
                  <Button onClick={handleSavePlan} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                    <Save className="w-4 h-4 mr-2" />
                    Save Network Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NetworkBuilder;