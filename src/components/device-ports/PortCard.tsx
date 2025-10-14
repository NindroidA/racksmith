import { motion } from 'framer-motion';
import { Cable, CheckCircle, Circle, Pencil, Trash2, XCircle, Zap } from 'lucide-react';
import { ConnectionService, PortService } from '../../services/api';
import { PortCardProps } from '../../types/components';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

const statusConfig = {
  available: { icon: Circle, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  connected: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  disabled: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  reserved: { icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' }
};

const PortCard: React.FC<PortCardProps> = ({ port, connection, allDevices, index, onEdit, onConnect, onRefresh }) => {
  const config = statusConfig[port.status] || statusConfig.available;
  const Icon = config.icon;

  const handleDelete = async () => {
    if (window.confirm(`Delete port ${port.port_number}?`)) {
      await PortService.delete(port.id);
      if (connection) {
        await ConnectionService.delete(connection.id);
      }
      onRefresh();
    }
  };

  const getConnectedDeviceName = () => {
    if (!connection) return null;
    const deviceId = connection.source_device_id === port.device_id 
      ? connection.destination_device_id 
      : connection.source_device_id;
    const device = allDevices.find(d => d.id === deviceId);
    return device?.name || 'Unknown Device';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card className={`glass-card ${config.border} hover:border-white/20 transition-all duration-300 group cursor-pointer relative overflow-hidden`}>
        <div className={`absolute top-0 right-0 w-32 h-32 ${config.bg} rounded-full blur-3xl opacity-20`} />
        
        <CardContent className="p-4 relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${config.bg} ${config.border} border`}>
                <Icon className={`w-4 h-4 ${config.color}`} />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">{port.port_number}</h3>
                {port.speed && (
                  <Badge variant="outline" className="border-white/20 text-gray-400 text-xs mt-1">
                    {port.speed}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-white/10"
                onClick={onEdit}
              >
                <Pencil className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-red-500/10 text-red-400"
                onClick={handleDelete}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {port.description && (
              <p className="text-sm text-gray-300">{port.description}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={`${config.border} ${config.color} text-xs`}>
                {port.status}
              </Badge>
              <Badge variant="outline" className="border-white/20 text-gray-400 text-xs">
                {port.port_type.replace(/_/g, ' ').toUpperCase()}
              </Badge>
              {port.vlan && (
                <Badge variant="outline" className="border-purple-500/30 text-purple-400 text-xs">
                  VLAN {port.vlan}
                </Badge>
              )}
            </div>

            {connection ? (
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Cable className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-400 font-medium">Connected</span>
                </div>
                <p className="text-sm text-white font-medium mb-1">{getConnectedDeviceName()}</p>
                <p className="text-xs text-gray-400">
                  {connection.cable_type.toUpperCase().replace(/_/g, ' ')}
                  {connection.cable_length_ft && ` • ${connection.cable_length_ft}ft`}
                </p>
              </div>
            ) : (
              <Button
                onClick={onConnect}
                size="sm"
                variant="outline"
                className="w-full mt-3 glass border-white/10 hover:bg-white/10"
              >
                <Cable className="w-3 h-3 mr-2" />
                Create Connection
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PortCard;