import { Search } from 'lucide-react';
import { useState } from 'react';
import { DevicePaletteProps } from '../../types/components';
import { CustomDevice, Device } from '../../types/entities';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import DeviceGraphic from './DeviceGraphic';

export default function DevicePalette({ devices, onDeviceDragStart }: DevicePaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDevices = devices.filter(device =>
    device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.model!.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDragStart = (e: React.DragEvent, device: Device | CustomDevice) => {
    e.dataTransfer.setData('device', JSON.stringify(device));
    e.dataTransfer.effectAllowed = 'copy';
    onDeviceDragStart?.(device, device.size_u);
  };

  return (
    <Card className="glass-card border-white/10 h-full flex flex-col">
      <CardContent className="p-6 flex flex-col h-full">
        <h3 className="text-lg font-semibold text-white mb-4">Device Library</h3>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search devices..."
            className="pl-10 glass border-white/10 text-white"
          />
        </div>

        {/* Device List */}
        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
          {filteredDevices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No devices found</p>
            </div>
          ) : (
            filteredDevices.map((device) => (
              <div
                key={device.id}
                draggable
                onDragStart={(e) => handleDragStart(e, device)}
                className="glass border border-white/10 rounded-lg p-3 cursor-move hover:border-white/30 transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <DeviceGraphic
                    type={device.device_type}
                    className="w-12 h-8 text-blue-400 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {device.name}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {device.manufacturer} {device.model}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded bg-white/5 text-gray-300">
                    {device.size_u}U
                  </span>
                  {device.port_count && device.port_count > 0 && (
                    <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                      {device.port_count} ports
                    </span>
                  )}
                  {device.power_watts && device.power_watts > 0 && (
                    <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">
                      {device.power_watts}W
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Helper Text */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-start gap-2 text-xs text-blue-400">
            <span className="text-lg">💡</span>
            <p>Drag devices into the rack or click to select, then click a position</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}