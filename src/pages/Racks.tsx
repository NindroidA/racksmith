import { Download, Edit, Eye, Plus, Search, Server, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { DeviceService, RackConfigurationService } from '../services/api';
import { Device, RackConfiguration } from '../types/entities';
import { downloadAllRacks } from '../utils/exportUtils';

export default function Racks() {
  const navigate = useNavigate();
  const [racks, setRacks] = useState<RackConfiguration[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRacks();
  }, []);

  const loadRacks = async () => {
    try {
      const [racksData, devicesData] = await Promise.all([
        RackConfigurationService.list(),
        DeviceService.list()
      ]);
      setRacks(racksData);
      setDevices(devicesData);
    } catch (error) {
      toast.error('Failed to load racks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rack?')) return;
    
    try {
      await RackConfigurationService.delete(id);
      setRacks(racks.filter(r => r.id !== id));
      toast.success('Rack deleted');
    } catch (error) {
      toast.error('Failed to delete rack');
    }
  };

  const handleExportAll = (format: 'json' | 'csv') => {
    try {
      downloadAllRacks(racks, devices, format);
      toast.success(`Exported ${racks.length} rack${racks.length !== 1 ? 's' : ''} as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export racks');
    }
  };

  const filteredRacks = racks.filter(rack =>
    rack.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rack.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-emerald-500 to-emerald-600',
    red: 'from-rose-500 to-rose-600',
    orange: 'from-orange-500 to-orange-600',
    cyan: 'from-cyan-500 to-cyan-600',
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Rack Configurations</h1>
            <p className="text-gray-400">Manage all your rack configurations in one place</p>
          </div>
          <div className="flex gap-3">
            {racks.length > 0 && (
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleExportAll('json')} 
                  variant="ghost"
                  className="glass-button text-white hover:bg-white/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export JSON
                </Button>
                <Button 
                  onClick={() => handleExportAll('csv')} 
                  variant="ghost"
                  className="glass-button text-white hover:bg-white/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            )}
            <Button onClick={() => navigate('/racks/new')} className="bg-gradient-to-r from-blue-500 to-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              New Rack Configuration
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search racks by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 glass border-white/10 text-white"
            />
          </div>
        </div>

        {filteredRacks.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Server className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Racks Found</h3>
            <p className="text-gray-400 mb-6">Get started by creating your first rack configuration</p>
            <Button onClick={() => navigate('/racks/new')} className="bg-gradient-to-r from-blue-500 to-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              Create First Rack
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRacks.map((rack) => {
              const gradient = colorMap[rack.color_tag || 'blue'];
              
              return (
                <Card key={rack.id} className="glass-card border-white/10 hover:border-white/20 transition-all group">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-6">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                        <Server className="w-7 h-7 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0 pt-1">
                        <h3 className="text-lg font-semibold text-white mb-1 truncate">{rack.name}</h3>
                        <p className="text-sm text-gray-400 truncate">{rack.location || 'No location set'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-6 pb-4 border-b border-white/10">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-white">{rack.size_u}U</span>
                      </div>
                      {rack.description && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span className="truncate">{rack.description}</span>
                        </>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/racks/${rack.id}`)}
                        className="flex-1 glass-button text-white hover:bg-white/10"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/racks/${rack.id}/edit`)}
                        className="glass-button text-white hover:bg-white/10"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(rack.id)}
                        className="glass-button text-red-400 hover:bg-red-500/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}