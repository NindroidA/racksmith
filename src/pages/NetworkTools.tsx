import { motion } from "framer-motion";
import { Calculator, Cpu, Layers as LayersIcon, Network, Wrench } from "lucide-react";
import React from "react";
import NASBuilder from "../components/network-tools/NASBuilder";
import NetworkBuilder from "../components/network-tools/NetworkBuilder";
import SubnetCalculator from "../components/network-tools/SubnetCalculator";
import VLANConfigurator from "../components/network-tools/VLANConfigurator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

const NetworkTools: React.FC = () => {
  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card border-white/10 rounded-2xl p-8"
        >
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center glow">
              <Wrench className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold gradient-text mb-3">Network Planning Tools</h1>
              <p className="text-gray-300 text-lg">Professional tools to help you design and configure your network infrastructure</p>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="builder" className="w-full">
          <TabsList className="glass border-white/10 p-1 grid grid-cols-4 w-full">
            <TabsTrigger value="builder" className="data-[state=active]:glass data-[state=active]:glow">
              <Network className="w-4 h-4 mr-2" />
              Network Builder
            </TabsTrigger>
            <TabsTrigger value="subnet" className="data-[state=active]:glass data-[state=active]:glow">
              <Calculator className="w-4 h-4 mr-2" />
              Subnet Calculator
            </TabsTrigger>
            <TabsTrigger value="vlan" className="data-[state=active]:glass data-[state=active]:glow">
              <LayersIcon className="w-4 h-4 mr-2" />
              VLAN Configurator
            </TabsTrigger>
            <TabsTrigger value="nas" className="data-[state=active]:glass data-[state=active]:glow">
              <Cpu className="w-4 h-4 mr-2" />
              NAS Builder
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="mt-6">
            <NetworkBuilder />
          </TabsContent>

          <TabsContent value="subnet" className="mt-6">
            <SubnetCalculator />
          </TabsContent>

          <TabsContent value="vlan" className="mt-6">
            <VLANConfigurator />
          </TabsContent>

          <TabsContent value="nas" className="mt-6">
            <NASBuilder />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default NetworkTools;