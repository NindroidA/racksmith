import { motion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import RackList from "../components/dashboard/RackList";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { DeviceService, RackConfigurationService } from "../services/api";
import type { Device, RackConfiguration } from "../types/entities";

const Racks: React.FC = () => {
  const [racks, setRacks] = useState<RackConfiguration[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const loadData = async () => {
    setIsLoading(true);
    const [racksData, devicesData] = await Promise.all([
      RackConfigurationService.list("-created_date"),
      DeviceService.list()
    ]);
    setRacks(racksData);
    setDevices(devicesData);
    setIsLoading(false);
  };

  const filteredRacks = racks.filter(rack => 
    rack.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (rack.location && rack.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">Rack Configurations</h1>
            <p className="text-gray-400">Manage all your rack configurations in one place</p>
          </div>
          <Link to={"racks/new"}>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg glow">
              <Plus className="w-5 h-5 mr-2" />
              New Rack Configuration
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card border-white/10 rounded-xl p-4"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search racks by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 glass border-white/10 text-white placeholder:text-gray-500"
            />
          </div>
        </motion.div>

        <RackList
          racks={filteredRacks}
          devices={devices}
          isLoading={isLoading}
          onRackDeleted={loadData}
        />
      </div>
    </div>
  );
}

export default Racks;