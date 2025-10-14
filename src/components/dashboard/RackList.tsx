import { AnimatePresence, motion } from 'framer-motion';
import { MapPin, Pencil, Server, Trash2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { RackConfigurationService } from '../../services/api';
import { RackListProps } from '../../types/components';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

const colorMap = {
  blue: 'from-blue-500 to-blue-600',
  purple: 'from-purple-500 to-purple-600',
  cyan: 'from-cyan-500 to-cyan-600',
  green: 'from-green-500 to-emerald-600',
  orange: 'from-orange-500 to-orange-600',
  red: 'from-red-500 to-red-600'
};

export default function RackList({ racks, devices, isLoading, onRackDeleted }: RackListProps) {
  const handleDelete = async (rackId: string) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="text-white font-medium">Delete this rack configuration?</p>
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.dismiss(t.id)}
            className="glass-button"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={async () => {
              await RackConfigurationService.delete(rackId);
              toast.success('Rack deleted successfully');
              onRackDeleted();
              toast.dismiss(t.id);
            }}
            className="bg-red-500 hover:bg-red-600"
          >
            Delete
          </Button>
        </div>
      </div>
    ), { 
      duration: Infinity, 
      style: { 
        background: 'rgba(255, 255, 255, 0.1)', 
        backdropFilter: 'blur(10px)', 
        border: '1px solid rgba(255, 255, 255, 0.15)' 
      } 
    });
  };

  const getRackDevices = (rackId: string) => {
    return devices.filter(d => d.rack_config_id === rackId);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass-card border-white/10">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-xl bg-white/5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32 bg-white/5" />
                    <Skeleton className="h-3 w-24 bg-white/5" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full bg-white/5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card className="glass-card border-white/10 overflow-hidden">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-white flex items-center gap-2">
          <Server className="w-5 h-5" />
          Rack Configurations
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {racks.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center glass glow">
              <Server className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Racks Yet</h3>
            <p className="text-gray-400 mb-6">Create your first rack configuration to get started</p>
            <Link to="/racks/new">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 glow-hover">
                Create Your First Rack
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {racks.map((rack, index) => {
                const rackDevices = getRackDevices(rack.id);
                const usedUnits = rackDevices.reduce((sum, d) => sum + d.size_u, 0);
                const utilization = ((usedUnits / rack.size_u) * 100).toFixed(0);

                return (
                  <motion.div
                    key={rack.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass-card border-white/10 rounded-xl p-6 hover:border-white/20 transition-all duration-300 group glow-hover cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                      <div className={`w-full h-full bg-gradient-to-br ${colorMap[rack.color_tag]} rounded-full blur-2xl`} />
                    </div>
                    
                    <div className="flex items-start justify-between mb-4 relative z-10">
                      <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${colorMap[rack.color_tag]} glow animate-pulse`} />
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Link to={`/racks/${rack.id}/edit`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 frosted hover:bg-white/20"
                          >
                            <Pencil className="w-4 h-4 text-gray-300" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 frosted hover:bg-red-500/20"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(rack.id); }}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </div>

                    <Link to={`/racks/${rack.id}`}>
                      <h3 className="text-xl font-bold text-white mb-2 hover:gradient-text transition-all">
                        {rack.name}
                      </h3>
                    </Link>

                    {rack.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                        <MapPin className="w-4 h-4" />
                        {rack.location}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="outline" className="border-white/20 text-gray-300 glass">
                        {rack.size_u}U Rack
                      </Badge>
                      <Badge variant="outline" className="border-white/20 text-gray-300 glass">
                        {rackDevices.length} Devices
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          Utilization
                        </span>
                        <span className="text-white font-semibold">{utilization}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden frosted">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${utilization}%` }}
                          transition={{ duration: 1, delay: index * 0.1 }}
                          className={`h-full bg-gradient-to-r ${colorMap[rack.color_tag]} shadow-lg`}
                          style={{ 
                            boxShadow: `0 0 10px ${rack.color_tag === 'blue' ? '#3b82f6' : '#a855f7'}`
                          }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}