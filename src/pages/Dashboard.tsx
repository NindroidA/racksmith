import { Activity, Eye, HardDrive, Plus, Server, TrendingUp, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { DeviceService, RackConfigurationService } from '../services/api';
import { Device, RackConfiguration } from '../types/entities';

export default function Dashboard() {
  const navigate = useNavigate();
  const [racks, setRacks] = useState<RackConfiguration[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState({
    totalRacks: 0,
    totalDevices: 0,
    utilizationPercent: 0,
    totalPower: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [racksData, devicesData] = await Promise.all([
        RackConfigurationService.list(),
        DeviceService.list()
      ]);
      
      setRacks(racksData);
      setDevices(devicesData);
      
      // calculate stats
      const totalPower = devicesData.reduce((sum, d) => sum + (d.power_watts || 0), 0);
      const totalSpace = devicesData.reduce((sum, d) => sum + d.size_u, 0);
      const totalRackSpace = racksData.reduce((sum, r) => sum + r.size_u, 0);
      const utilization = totalRackSpace > 0 ? Math.round((totalSpace / totalRackSpace) * 100) : 0;
      
      setStats({
        totalRacks: racksData.length,
        totalDevices: devicesData.length,
        utilizationPercent: utilization,
        totalPower
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-emerald-500 to-emerald-600',
    red: 'from-rose-500 to-rose-600',
    orange: 'from-orange-500 to-orange-600',
    cyan: 'from-cyan-500 to-cyan-600',
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Infrastructure Overview</h1>
          <p className="text-gray-400">Manage your network hardware and rack configurations</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="glass-card border-white/10">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-24 bg-white/5" />
                      <Skeleton className="h-8 w-16 bg-white/5" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <Card className="glass-card border-white/10 hover:border-white/20 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-400">Total Racks</p>
                    <Server className="w-5 h-5 text-blue-400" />
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.totalRacks}</p>
                  <p className="text-xs text-gray-500 mt-1">Configured</p>
                </CardContent>
              </Card>

              <Card className="glass-card border-white/10 hover:border-white/20 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-400">Total Devices</p>
                    <HardDrive className="w-5 h-5 text-purple-400" />
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.totalDevices}</p>
                  <p className="text-xs text-gray-500 mt-1">Installed</p>
                </CardContent>
              </Card>

              <Card className="glass-card border-white/10 hover:border-white/20 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-400">Utilization</p>
                    <Activity className="w-5 h-5 text-cyan-400" />
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.utilizationPercent}%</p>
                  <p className="text-xs text-gray-500 mt-1">Average</p>
                </CardContent>
              </Card>

              <Card className="glass-card border-white/10 hover:border-white/20 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-400">Power Draw</p>
                    <Zap className="w-5 h-5 text-yellow-400" />
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.totalPower}W</p>
                  <p className="text-xs text-gray-500 mt-1">Total</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Rack Configurations Section */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Rack Configurations</h2>
            <Button 
              onClick={() => navigate('/racks/new')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Rack Configuration
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="glass border-white/10">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-14 w-14 rounded-xl bg-white/5" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-32 bg-white/5" />
                          <Skeleton className="h-4 w-24 bg-white/5" />
                        </div>
                      </div>
                      <Skeleton className="h-4 w-full bg-white/5" />
                      <Skeleton className="h-10 w-full bg-white/5" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : racks.length === 0 ? (
            <div className="text-center py-12">
              <Server className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Racks Configured</h3>
              <p className="text-gray-400 mb-6">Get started by creating your first rack configuration</p>
              <Button 
                onClick={() => navigate('/racks/new')}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Rack
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {racks.slice(0, 3).map((rack) => {
                const gradient = colorMap[rack.color_tag || 'blue'];
                const rackDevices = devices.filter(d => d.rack_config_id === rack.id);
                const usedSpace = rackDevices.reduce((sum, d) => sum + d.size_u, 0);
                const utilization = Math.round((usedSpace / rack.size_u) * 100);

                return (
                  <Card key={rack.id} className="glass border-white/10 hover:border-white/20 transition-all group">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                          <Server className="w-7 h-7 text-white" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-white mb-1 truncate">{rack.name}</h3>
                          <p className="text-sm text-gray-400 truncate">{rack.location || 'No location'}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Utilization</span>
                          <span className="text-white font-semibold">{utilization}%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${gradient} transition-all`}
                            style={{ width: `${utilization}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{rack.size_u}U Total</span>
                          <span>{rackDevices.length} Devices</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/racks/${rack.id}`)}
                        className="w-full glass-button text-white hover:bg-white/10"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {racks.length > 3 && (
            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={() => navigate('/racks')}
                className="text-blue-400 hover:text-blue-300 hover:bg-white/5"
              >
                View All Racks
                <TrendingUp className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}