import { motion } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import React from 'react';
import { DeviceConnectionsViewProps } from '../../types/components';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const DeviceConnectionsView: React.FC<DeviceConnectionsViewProps> = ({ device, connections, allDevices, onClose }) => {
  const getConnectedDevice = (connection, isSource) => {
    const deviceId = isSource ? connection.destination_device_id : connection.source_device_id;
    return allDevices.find(d => d.id === deviceId);
  };

  const getPortInfo = (connection, isSource) => {
    return isSource ? connection.source_port : connection.destination_port;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <Card className="glass-card border-white/10">
        <CardHeader className="flex flex-row items-center justify-between border-b border-white/10">
          <CardTitle className="text-white text-lg">Device Connections</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/10">
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-white mb-1">{device.name}</h3>
            <p className="text-sm text-gray-400">
              {device.manufacturer} • {device.device_type.replace(/_/g, ' ')}
            </p>
            {device.port_count! > 0 && (
              <p className="text-sm text-gray-400 mt-1">{device.port_count} ports available</p>
            )}
          </div>

          <div className="border-t border-white/10 pt-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">
              Connections ({connections.length})
            </h4>
            {connections.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No connections yet</p>
            ) : (
              <div className="space-y-3">
                {connections.map(conn => {
                  const isSource = conn.source_device_id === device.id;
                  const connectedDevice = getConnectedDevice(conn, isSource);
                  const localPort = getPortInfo(conn, isSource);
                  const remotePort = getPortInfo(conn, !isSource);

                  return (
                    <div key={conn.id} className="glass border-white/10 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="border-blue-500/50 text-blue-400 text-xs">
                          {localPort}
                        </Badge>
                        <ArrowRight className="w-3 h-3 text-gray-500" />
                        <Badge variant="outline" className="border-purple-500/50 text-purple-400 text-xs">
                          {remotePort}
                        </Badge>
                      </div>
                      <p className="text-sm text-white font-medium">
                        {connectedDevice?.name || 'Unknown Device'}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="border-white/20 text-gray-400 text-xs">
                          {conn.cable_type.toUpperCase().replace(/_/g, ' ')}
                        </Badge>
                        {conn.cable_length_ft && (
                          <Badge variant="outline" className="border-white/20 text-gray-400 text-xs">
                            {conn.cable_length_ft}ft
                          </Badge>
                        )}
                      </div>
                      {conn.description && (
                        <p className="text-xs text-gray-500 mt-2">{conn.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DeviceConnectionsView;