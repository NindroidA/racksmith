import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { DeviceService, RackConfigurationService } from "../services/api";

import RackList from "../components/dashboard/RackList";
import StatsGrid from "../components/dashboard/StatsGrid";
import { Device, RackConfiguration } from "../types/entities";

const Dashboard: React.FC = () => {
  const [racks, setRacks] = useState<RackConfiguration[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
  
  const totalRackUnits = racks.reduce((sum, rack) => sum + rack.size_u, 0);
  const usedRackUnits = devices.reduce((sum, device) => sum + device.size_u, 0);
  const utilizationPercent = totalRackUnits > 0 ? parseFloat(((usedRackUnits / totalRackUnits) * 100).toFixed(1)) : 0;

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">Infrastructure Overview</h1>
            <p className="text-gray-400">Manage your network hardware and rack configurations</p>
          </div>
          <Link to={"/racks/new"}>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg glow">
              <Plus className="w-5 h-5 mr-2" />
              New Rack Configuration
            </Button>
          </Link>
        </motion.div>

        <StatsGrid
          totalRacks={racks.length}
          totalDevices={devices.length}
          utilizationPercent={utilizationPercent}
          isLoading={isLoading}
        />

        <RackList
          racks={racks}
          devices={devices}
          isLoading={isLoading}
          onRackDeleted={loadData}
        />
      </div>
    </div>
  );
}

export default Dashboard;