import { Settings, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { RackVisualizerProps } from '../../types/components';
import { Device } from '../../types/entities';
import { Button } from '../ui/button';
import DeviceGraphic from './DeviceGraphic';

const DEVICE_TYPE_COLORS: Record<string, string> = {
  router: 'bg-gradient-to-br from-blue-400/80 to-blue-500/80',
  switch: 'bg-gradient-to-br from-blue-500/80 to-indigo-500/80',
  fiber_switch: 'bg-gradient-to-br from-indigo-500/80 to-purple-500/80',
  server: 'bg-gradient-to-br from-purple-500/80 to-violet-500/80',
  firewall: 'bg-gradient-to-br from-violet-500/80 to-fuchsia-500/80',
  storage: 'bg-gradient-to-br from-fuchsia-500/80 to-pink-500/80',
  ups: 'bg-gradient-to-br from-pink-500/80 to-rose-500/80',
  pdu: 'bg-gradient-to-br from-blue-600/80 to-cyan-500/80',
  patch_panel: 'bg-gradient-to-br from-cyan-500/80 to-teal-500/80',
  load_balancer: 'bg-gradient-to-br from-indigo-600/80 to-blue-600/80',
  other: 'bg-gradient-to-br from-slate-500/80 to-gray-500/80'
};

export default function RackVisualizer({
  rackSizeU,
  devices,
  onDeviceClick,
  onDeviceRemove,
  onPositionClick,
  onDeviceDrop,
  selectedPosition,
  draggedDeviceSize = 1
}: RackVisualizerProps) {
  const [hoveredDevice, setHoveredDevice] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null);
  const [ripplePosition, setRipplePosition] = useState<number | null>(null);
  const [draggedInstalledDeviceSize, setDraggedInstalledDeviceSize] = useState<number>(1);

  const occupiedPositions = new Set<number>();
  devices.forEach(device => {
    const startPos = device.position_u - device.size_u + 1;
    for (let i = 0; i < device.size_u; i++) {
      occupiedPositions.add(startPos + i);
    }
  });

  const getDeviceAtPosition = (position: number): Device | null => {
    return devices.find(d => {
      const startPos = d.position_u - d.size_u + 1;
      return position >= startPos && position <= d.position_u;
    }) || null;
  };

  const wouldOccupy = (position: number, size: number): number[] => {
    const positions: number[] = [];
    for (let i = 0; i < size; i++) {
      positions.push(position - i);
    }
    return positions;
  };

  const handleDragOver = (e: React.DragEvent, position: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverPosition(position);
  };

  const handleDrop = (e: React.DragEvent, position: number) => {
    e.preventDefault();
    
    const installedDeviceData = e.dataTransfer.getData('installed-device');
    
    if (installedDeviceData) {
        const movedDevice = JSON.parse(installedDeviceData);
        onDeviceDrop(position, movedDevice, true);
        setRipplePosition(position);
        setTimeout(() => setRipplePosition(null), 600);
        setDragOverPosition(null);
        setDraggedInstalledDeviceSize(1);
        return;
    }
    
    const deviceData = e.dataTransfer.getData('device');
    if (deviceData) {
        const device = JSON.parse(deviceData);
        onDeviceDrop(position, device, false);
        setRipplePosition(position);
        setTimeout(() => setRipplePosition(null), 600);
    }
    setDragOverPosition(null);
  };

  return (
    <div className="glass-card p-6 h-full">
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Rack Layout ({rackSizeU}U)</h3>
            <div className="text-sm text-gray-400">
                {devices.length} device{devices.length !== 1 ? 's' : ''} installed
            </div>
        </div>

        <div className="relative border-2 border-white/10 rounded-xl bg-black/30 p-4 backdrop-blur-sm overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-gray-800/80 to-gray-700/60 rounded-l-xl border-r border-white/5" />
                <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-gray-800/80 to-gray-700/60 rounded-r-xl border-l border-white/5" />

                    <div className="space-y-0.5 mx-10">
                        {Array.from({ length: rackSizeU }, (_, i) => {
                            const position = rackSizeU - i;
                            const device = getDeviceAtPosition(position);
                            const isHovered = device && hoveredDevice === device.id;
                            const isDragOver = dragOverPosition === position;
                        
                        // calculate if position would be highlighted during drag
                        let wouldHighlight = false;
                        if (dragOverPosition !== null) {
                            const deviceSize = draggedInstalledDeviceSize > 1 ? draggedInstalledDeviceSize : draggedDeviceSize;
                            const occupyPositions = wouldOccupy(dragOverPosition, deviceSize);
                            wouldHighlight = occupyPositions.includes(position);
                        }

                        if (device && device.position_u === position) {
                            const color = DEVICE_TYPE_COLORS[device.device_type] || DEVICE_TYPE_COLORS.other;
                            const startPos = device.position_u - device.size_u + 1;
                
                            return (
                                    <div
                                    key={position}
                                    draggable={true}
                                    onDragStart={(e) => {
                                        e.dataTransfer.effectAllowed = 'move';
                                        e.dataTransfer.setData('installed-device', JSON.stringify(device));
                                        setDraggedInstalledDeviceSize(device.size_u);
                                    }}
                                    onDragEnd={() => {
                                        setDraggedInstalledDeviceSize(1);
                                        setDragOverPosition(null);
                                    }}
                                    style={{ height: `${device.size_u * 2.5}rem` }}
                                    className={`relative flex items-center gap-3 px-4 rounded-xl cursor-move transition-all ${color} border border-white/20 overflow-hidden ${
                                        isHovered ? 'ring-2 ring-white/60 scale-[1.01] shadow-2xl' : ''
                                    }`}
                                    onClick={() => onDeviceClick(device)}
                                    onMouseEnter={() => setHoveredDevice(device.id)}
                                    onMouseLeave={() => setHoveredDevice(null)}
                                    >
                                        <div className="absolute -left-9 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-mono">
                                            {startPos}-{position}U
                                        </div>

                                        <DeviceGraphic type={device.device_type} className="w-32 h-16 text-white opacity-90 flex-shrink-0" />

                                        <div className="flex-1 min-w-0">
                                            <div className="text-white font-semibold text-sm truncate">{device.name}</div>
                                            <div className="text-white/70 text-xs truncate">{device.model} • {device.size_u}U</div>
                                        </div>

                                        <div className="flex gap-2 flex-shrink-0">
                                            <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0 text-white hover:bg-white/20"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeviceClick(device);
                                            }}
                                            >
                                                <Settings className="w-4 h-4" />
                                            </Button>
                                            <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0 text-white hover:bg-red-500/50"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeviceRemove(device.id);
                                            }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                        }

                        if (device) {
                            return null;
                        }

                        return (
                            <div
                            key={position}
                            onDragEnter={(e) => {
                                e.preventDefault();
                                setDragOverPosition(position);
                            }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                            }}
                            onDragLeave={(e) => {
                                // only clear if we actually leaving this element
                                if (e.currentTarget === e.target) {
                                    setDragOverPosition(null);
                                }
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                const installedDeviceData = e.dataTransfer.getData('installed-device');
                                
                                if (installedDeviceData) {
                                    const movedDevice = JSON.parse(installedDeviceData);
                                    onDeviceDrop(position, movedDevice, true);
                                    setRipplePosition(position);
                                    setTimeout(() => setRipplePosition(null), 600);
                                    setDragOverPosition(null);
                                    setDraggedInstalledDeviceSize(1);
                                    return;
                                }
                                
                                const deviceData = e.dataTransfer.getData('device');
                                
                                if (deviceData) {
                                    const device = JSON.parse(deviceData);
                                    onDeviceDrop(position, device, false);
                                    setRipplePosition(position);
                                    setTimeout(() => setRipplePosition(null), 600);
                                }
                                setDragOverPosition(null);
                            }}
                            onClick={() => onPositionClick(position)}
                            className={`h-10 border rounded-lg flex items-center justify-between px-4 cursor-pointer transition-all relative overflow-hidden ${wouldHighlight ? 'bg-blue-500/30 border-blue-400/60 ring-2 ring-blue-400/40': 'border-white/10 hover:bg-white/5 hover:border-white/20'}`}
                            >
                                <div className="text-xs text-gray-500 font-mono">{position}U</div>
                                <div className="text-xs text-gray-600">Empty</div>
                                
                                    {ripplePosition === position && (
                                        <div className="absolute inset-0 pointer-events-none">
                                            <div className="absolute inset-0 bg-blue-400/40 rounded-lg animate-[ripple_0.6s_ease-out]" />
                                        </div>
                                    )}
                            </div>
                        );
                    })}
            </div>
        </div>
    </div>
    );
}