import { Building, Calculator, Camera, ChevronRight, HardDrive, Layers, Network, Phone, Plus, Trash2, Wifi, Wrench } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectItem } from '../components/ui/select';
import { PlanData, ToolType, VLANConfig } from '../types/pages';

export default function NetworkTools() {
  const [activeTool, setActiveTool] = useState<ToolType>('builder');
  const [currentStep, setCurrentStep] = useState(1);

  // network builder state
  const [planData, setPlanData] = useState<PlanData>({
    plan_name: '',
    facility_size: 'medium',
    square_feet: 5000,
    floors: 1,
    wired_devices: 60,
    wireless_devices: 40,
    cameras: 0,
    phones: 0
  });

  // subnet calculator state
  const [ipAddress, setIpAddress] = useState('192.168.1.0');
  const [cidr, setCidr] = useState(24);

  // VLAN configurator state
  const [vlans, setVlans] = useState<VLANConfig[]>([
    { vlan_id: '10', name: 'Management', description: 'Network management and monitoring', ports: '1-8', color: 'blue' },
    { vlan_id: '20', name: 'Servers', description: 'Production server network', ports: '9-16', color: 'purple' },
    { vlan_id: '30', name: 'Users', description: 'End user workstations', ports: '17-48', color: 'cyan' }
  ]);
  const [newVlan, setNewVlan] = useState<VLANConfig>({
    vlan_id: '',
    name: '',
    description: '',
    ports: '',
    color: 'blue'
  });

  // NAS builder state
  const [nasConfig, setNasConfig] = useState({
    name: '',
    chassis: '8-Bay',
    raid: 'RAID 6 (2 Parity)',
    network: '2x 1GbE (Link Aggregation)',
    drives: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Network plan saved!');
  };

  const calculateSubnet = () => {
    const totalHosts = Math.pow(2, 32 - cidr) - 2;
    toast.success(`Network can support ${totalHosts} hosts`);
  };

  const addVlan = () => {
    if (!newVlan.vlan_id || !newVlan.name) {
      toast.error('VLAN ID and Name are required');
      return;
    }
    setVlans([...vlans, newVlan]);
    setNewVlan({ vlan_id: '', name: '', description: '', ports: '', color: 'blue' });
    toast.success('VLAN added');
  };

  const removeVlan = (index: number) => {
    setVlans(vlans.filter((_, i) => i !== index));
    toast.success('VLAN removed');
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glass-card border-white/10 rounded-2xl p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center glow">
              <Wrench className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-3">Network Planning Tools</h1>
              <p className="text-gray-300 text-lg">Professional tools to help you design and configure your network infrastructure</p>
            </div>
          </div>
        </div>

        {/* Tool Tabs */}
        <div className="glass-card border-white/10 p-1 inline-flex rounded-lg mb-8">
          {[
            { id: 'builder' as ToolType, label: 'Network Builder', icon: Network },
            { id: 'subnet' as ToolType, label: 'Subnet Calculator', icon: Calculator },
            { id: 'vlan' as ToolType, label: 'VLAN Configurator', icon: Layers },
            { id: 'nas' as ToolType, label: 'NAS Builder', icon: HardDrive }
          ].map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-md font-medium transition-all ${
                activeTool === tool.id
                  ? 'bg-gradient-to-r from-blue-500/30 to-purple-500/30 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tool.icon className="w-4 h-4" />
              {tool.label}
            </button>
          ))}
        </div>

        {/* Network Builder */}
        {activeTool === 'builder' && (
          <div className="space-y-6">
            {/* Progress Steps */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between">
                {[
                  { num: 1, label: 'Device Count' },
                  { num: 2, label: 'IP Planning' },
                  { num: 3, label: 'VLAN Config' },
                  { num: 4, label: 'Review & Save' }
                ].map((step, idx) => (
                  <div key={step.num} className="flex items-center">
                    <div className={`flex items-center gap-3 ${idx > 0 ? 'ml-4' : ''}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                        currentStep === step.num
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                          : currentStep > step.num
                          ? 'bg-blue-500/30 text-blue-400'
                          : 'bg-white/5 text-gray-500'
                      }`}>
                        {step.num}
                      </div>
                      <span className={`font-medium ${
                        currentStep >= step.num ? 'text-white' : 'text-gray-500'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {idx < 3 && (
                      <div className={`h-0.5 w-24 mx-4 ${
                        currentStep > step.num ? 'bg-blue-500' : 'bg-white/10'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step 1: Device & Facility Info */}
            <Card className="glass-card border-white/10">
              <CardContent className="p-8">
                <div className="flex items-start gap-4 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Network className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white pt-1.5">Step 1: Device & Facility Information</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm font-medium">Plan Name *</Label>
                      <Input
                        value={planData.plan_name}
                        onChange={(e) => setPlanData({ ...planData, plan_name: e.target.value })}
                        placeholder="e.g., Office Network Plan"
                        className="glass border-white/10 text-white placeholder:text-gray-500"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm font-medium">Facility Size</Label>
                      <Select
                        value={planData.facility_size}
                        onValueChange={(v) => setPlanData({ ...planData, facility_size: v as PlanData['facility_size'] })}
                        className="glass border-white/10 text-white"
                      >
                        <SelectItem value="small">Small (1-25 devices)</SelectItem>
                        <SelectItem value="medium">Medium (26-100 devices)</SelectItem>
                        <SelectItem value="large">Large (101-500 devices)</SelectItem>
                        <SelectItem value="enterprise">Enterprise (500+ devices)</SelectItem>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm font-medium flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        Square Footage
                      </Label>
                      <Input
                        type="number"
                        value={planData.square_feet}
                        onChange={(e) => setPlanData({ ...planData, square_feet: Number(e.target.value) })}
                        className="glass border-white/10 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm font-medium flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        Number of Floors
                      </Label>
                      <Input
                        type="number"
                        value={planData.floors}
                        onChange={(e) => setPlanData({ ...planData, floors: Number(e.target.value) })}
                        className="glass border-white/10 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm font-medium flex items-center gap-2">
                        <Network className="w-4 h-4" />
                        Wired Devices
                      </Label>
                      <Input
                        type="number"
                        value={planData.wired_devices}
                        onChange={(e) => setPlanData({ ...planData, wired_devices: Number(e.target.value) })}
                        className="glass border-white/10 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm font-medium flex items-center gap-2">
                        <Wifi className="w-4 h-4" />
                        Wireless Devices
                      </Label>
                      <Input
                        type="number"
                        value={planData.wireless_devices}
                        onChange={(e) => setPlanData({ ...planData, wireless_devices: Number(e.target.value) })}
                        className="glass border-white/10 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm font-medium flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        Security Cameras
                      </Label>
                      <Input
                        type="number"
                        value={planData.cameras}
                        onChange={(e) => setPlanData({ ...planData, cameras: Number(e.target.value) })}
                        className="glass border-white/10 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm font-medium flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        VoIP Phones
                      </Label>
                      <Input
                        type="number"
                        value={planData.phones}
                        onChange={(e) => setPlanData({ ...planData, phones: Number(e.target.value) })}
                        className="glass border-white/10 text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-white/10">
                    <Button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                      Continue to IP Planning
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Subnet Calculator */}
        {activeTool === 'subnet' && (
          <div className="grid grid-cols-2 gap-6">
            <Card className="glass-card border-white/10">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Subnet Calculator</h2>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm font-medium">IP Address</Label>
                    <Input
                      value={ipAddress}
                      onChange={(e) => setIpAddress(e.target.value)}
                      placeholder="e.g., 192.168.1.0"
                      className="glass border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm font-medium">CIDR Notation (/{cidr})</Label>
                    <input
                      type="range"
                      min="8"
                      max="30"
                      value={cidr}
                      onChange={(e) => setCidr(Number(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(139 92 246) ${((cidr - 8) / 22) * 100}%, rgba(255,255,255,0.1) ${((cidr - 8) / 22) * 100}%, rgba(255,255,255,0.1) 100%)`
                      }}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>/8</span>
                      <span>/{cidr}</span>
                      <span>/30</span>
                    </div>
                  </div>

                  <Button
                    onClick={calculateSubnet}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculate
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-white/10">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-white mb-6">Results & Recommendations</h3>
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <Calculator className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <p>Enter values and calculate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* VLAN Configurator */}
        {activeTool === 'vlan' && (
          <div className="grid grid-cols-2 gap-6">
            <Card className="glass-card border-white/10">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Add New VLAN</h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm font-medium">VLAN ID *</Label>
                      <Input
                        value={newVlan.vlan_id}
                        onChange={(e) => setNewVlan({ ...newVlan, vlan_id: e.target.value })}
                        placeholder="e.g., 100"
                        className="glass border-white/10 text-white placeholder:text-gray-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm font-medium">VLAN Name *</Label>
                      <Input
                        value={newVlan.name}
                        onChange={(e) => setNewVlan({ ...newVlan, name: e.target.value })}
                        placeholder="e.g., Guest WiFi"
                        className="glass border-white/10 text-white placeholder:text-gray-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm font-medium">Description</Label>
                    <textarea
                      value={newVlan.description}
                      onChange={(e) => setNewVlan({ ...newVlan, description: e.target.value })}
                      placeholder="Purpose of this VLAN..."
                      className="w-full h-20 px-3 py-2 rounded-md glass border border-white/10 text-white placeholder:text-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm font-medium">Port Assignment</Label>
                    <Input
                      value={newVlan.ports}
                      onChange={(e) => setNewVlan({ ...newVlan, ports: e.target.value })}
                      placeholder="e.g., 1-24, 48"
                      className="glass border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm font-medium">Color Tag</Label>
                    <div className="flex gap-2">
                      {['blue', 'purple', 'green', 'orange', 'cyan', 'red'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewVlan({ ...newVlan, color })}
                          className={`w-10 h-10 rounded-full bg-${color}-500 transition-all ${
                            newVlan.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800' : 'opacity-50 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <Button onClick={addVlan} className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add VLAN
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-white/10">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">VLAN Configuration ({vlans.length})</h3>
                  <Button variant="ghost" className="text-sm text-gray-400 hover:text-white glass-button">
                    Export
                  </Button>
                </div>

                <div className="space-y-3">
                  {vlans.map((vlan, index) => (
                    <div key={index} className="glass p-4 rounded-lg border border-white/10 hover:border-white/20 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`w-3 h-3 rounded-full bg-${vlan.color}-500 mt-1.5 flex-shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-white">VLAN {vlan.vlan_id}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium bg-${vlan.color}-500/20 text-${vlan.color}-400`}>
                                {vlan.name}
                              </span>
                            </div>
                            <p className="text-sm text-gray-400 mb-2">{vlan.description}</p>
                            <p className="text-xs text-gray-500">Ports: {vlan.ports}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVlan(index)}
                          className="text-red-400 hover:bg-red-500/20 ml-2 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* NAS Builder */}
        {activeTool === 'nas' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <Card className="glass-card border-white/10">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <HardDrive className="w-6 h-6 text-purple-400" />
                    <h2 className="text-2xl font-bold text-white">NAS Configuration</h2>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-gray-300 text-sm font-medium">Configuration Name *</Label>
                        <Input
                          value={nasConfig.name}
                          onChange={(e) => setNasConfig({ ...nasConfig, name: e.target.value })}
                          placeholder="e.g., Main Storage Server"
                          className="glass border-white/10 text-white placeholder:text-gray-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300 text-sm font-medium">Chassis Type</Label>
                        <Select
                          value={nasConfig.chassis}
                          onValueChange={(v) => setNasConfig({ ...nasConfig, chassis: v })}
                          className="glass border-white/10 text-white"
                        >
                          <SelectItem value="4-Bay">4-Bay</SelectItem>
                          <SelectItem value="8-Bay">8-Bay</SelectItem>
                          <SelectItem value="12-Bay">12-Bay</SelectItem>
                          <SelectItem value="16-Bay">16-Bay</SelectItem>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300 text-sm font-medium">RAID Type</Label>
                        <Select
                          value={nasConfig.raid}
                          onValueChange={(v) => setNasConfig({ ...nasConfig, raid: v })}
                          className="glass border-white/10 text-white"
                        >
                          <SelectItem value="RAID 0 (Striping)">RAID 0 (Striping)</SelectItem>
                          <SelectItem value="RAID 1 (Mirroring)">RAID 1 (Mirroring)</SelectItem>
                          <SelectItem value="RAID 5 (Single Parity)">RAID 5 (Single Parity)</SelectItem>
                          <SelectItem value="RAID 6 (2 Parity)">RAID 6 (2 Parity)</SelectItem>
                          <SelectItem value="RAID 10 (1+0)">RAID 10 (1+0)</SelectItem>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300 text-sm font-medium">Network Interfaces</Label>
                        <Select
                          value={nasConfig.network}
                          onValueChange={(v) => setNasConfig({ ...nasConfig, network: v })}
                          className="glass border-white/10 text-white"
                        >
                          <SelectItem value="1x 1GbE">1x 1GbE</SelectItem>
                          <SelectItem value="2x 1GbE (Link Aggregation)">2x 1GbE (Link Aggregation)</SelectItem>
                          <SelectItem value="1x 10GbE">1x 10GbE</SelectItem>
                          <SelectItem value="2x 10GbE">2x 10GbE</SelectItem>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-white/10">
                      <h3 className="text-lg font-semibold text-white">Drive Bay Configuration</h3>
                      <div className="grid grid-cols-4 gap-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setNasConfig({ ...nasConfig, drives: nasConfig.drives === i + 1 ? 0 : i + 1 })}
                            className={`aspect-square rounded-lg border-2 transition-all flex items-center justify-center ${
                              nasConfig.drives >= i + 1
                                ? 'border-purple-500 bg-purple-500/20'
                                : 'border-white/10 hover:border-white/30'
                            }`}
                          >
                            <div className="text-center">
                              <HardDrive className={`w-8 h-8 mx-auto mb-1 ${nasConfig.drives >= i + 1 ? 'text-purple-400' : 'text-gray-600'}`} />
                              <span className="text-xs text-gray-500">{i + 1}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-card border-white/10">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-white mb-6">Capacity Summary</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Raw Capacity</p>
                    <p className="text-2xl font-bold text-white">0.00 TB</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Usable Capacity (RAID6)</p>
                    <p className="text-2xl font-bold text-green-400">0.00 TB</p>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-sm text-gray-400 mb-1">Drives Installed</p>
                    <p className="text-xl font-bold text-white">{nasConfig.drives}/8</p>
                  </div>
                  <div className="pt-4">
                    <p className="text-sm text-gray-400 mb-2">Drive Breakdown</p>
                    {nasConfig.drives === 0 ? (
                      <p className="text-sm text-gray-500">No drives configured</p>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-300">{nasConfig.drives} x Active</p>
                        <p className="text-sm text-gray-500">{8 - nasConfig.drives} x Empty</p>
                      </div>
                    )}
                  </div>
                  <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 mt-6">
                    Save Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}