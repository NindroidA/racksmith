import { GripVertical, Search } from 'lucide-react';
import { useState } from 'react';
import { DevicePaletteProps } from '../../types/components';
import { CustomDevice, Device } from '../../types/entities';
import { Input } from '../ui/input';
import DeviceGraphic from './DeviceGraphic';

export default function DevicePalette({ devices, onDeviceSelect, selectedDevice, onDragStart, onDragEnd }: DevicePaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDevices = devices.filter(device =>
    device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.model!.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDragStart = (e: React.DragEvent, device: Device | CustomDevice) => {
    e.dataTransfer.setData('device', JSON.stringify(device));
    e.dataTransfer.effectAllowed = 'copy';
    onDeviceSelect(device);
    onDragStart?.(device.size_u);
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  return (
    <div className="glass-card p-4 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-white mb-4">Device Library</h3>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search devices..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 glass border-white/10 text-white placeholder:text-gray-500"
        />
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar space-y-2">
        {filteredDevices.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No devices found</div>
        ) : (
          filteredDevices.map((device) => {
            const isSelected = selectedDevice?.id === device.id;

            return (
              <div
                key={device.id}
                draggable
                onDragStart={(e) => handleDragStart(e, device)}
                onDragEnd={handleDragEnd}
                onClick={() => onDeviceSelect(device)}
                className={`p-3 rounded-lg cursor-grab active:cursor-grabbing transition-all group ${
                  isSelected
                    ? 'bg-blue-500/30 border border-blue-500'
                    : 'glass border border-white/10 hover:border-white/30 hover:scale-[1.02]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <GripVertical className="w-4 h-4 text-gray-500 mt-1 group-hover:text-gray-300 transition-colors flex-shrink-0" />
                  <div className={`p-2 rounded flex-shrink-0 ${isSelected ? 'bg-blue-500/50' : 'bg-white/10'}`}>
                    <DeviceGraphic type={device.device_type} className="w-12 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">{device.name}</div>
                    <div className="text-xs text-gray-400 truncate">{device.manufacturer} {device.model}</div>
                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                      <span>{device.size_u}U</span>
                      <span>{device.port_count} ports</span>
                      {device.power_watts && <span>{device.power_watts}W</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-xs text-blue-300">
          💧 Drag devices into the rack or click to select, then click a position
        </p>
      </div>
    </div>
  );
}