import { Eye, EyeOff, Grid3x3, Layers, Plus, Save, ZoomIn, ZoomOut } from 'lucide-react';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import StandaloneDeviceDialog from '../components/floor-plan/StandaloneDeviceDialog';
import TopologyConnectionDialog from '../components/floor-plan/TopologyConnectionDialog';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { DeviceService, RackConfigurationService, RackPositionService, StandaloneDeviceService, TopologyConnectionService } from '../services/api';
import type { Device, RackConfiguration, StandaloneDevice, TopologyConnection } from '../types/entities';
import { DraggedItem } from '../types/pages';

const FloorPlan: React.FC = () => {
  const navigate = useNavigate();

  const [racks, setRacks] = useState<RackConfiguration[]>([]);
  const [rackPositions, setRackPositions] = useState<Record<string, { x: number; y: number; rotation: number }>>({});
  const [devices, setDevices] = useState<Device[]>([]);
  const [standaloneDevices, setStandaloneDevices] = useState<StandaloneDevice[]>([]);
  const [topologyConnections, setTopologyConnections] = useState<TopologyConnection[]>([]);
  const [zoom, setZoom] = useState<number>(0.8);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showConnections, setShowConnections] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showDeviceDialog, setShowDeviceDialog] = useState<boolean>(false);
  const [showConnectionDialog, setShowConnectionDialog] = useState<boolean>(false);
  const [selectedDevice, setSelectedDevice] = useState<StandaloneDevice | null>(null);
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const loadData = async () => {
    const [racksData, positionsData, devicesData, standaloneData, topoConnData] = await Promise.all([
      RackConfigurationService.list(),
      RackPositionService.list(),
      DeviceService.list(),
      StandaloneDeviceService.list(),
      TopologyConnectionService.list()
    ]);
    
    setRacks(racksData);
    setDevices(devicesData);
    setTopologyConnections(topoConnData);
    
    const positionsMap = {};
    positionsData.forEach(pos => {
      positionsMap[pos.rack_config_id] = {
        x: pos.x_position || 200,
        y: pos.y_position || 200,
        rotation: pos.rotation || 0
      };
    });
    
    racksData.forEach((rack, index) => {
      if (!positionsMap[rack.id]) {
        positionsMap[rack.id] = {
          x: 200 + (index * 250),
          y: 200,
          rotation: 0
        };
      }
    });
    
    setRackPositions(positionsMap);
    setStandaloneDevices(standaloneData);
  };

  const handleSaveLayout = async () => {
    setIsSaving(true);
    try {
      const existingPositions = await RackPositionService.list();
      
      for (const [rackId, pos] of Object.entries(rackPositions)) {
        const existing = existingPositions.find(p => p.rack_config_id === rackId);
        
        const posData = {
          rack_config_id: rackId,
          x_position: pos.x,
          y_position: pos.y,
          rotation: pos.rotation || 0
        };
        
        if (existing) {
          await RackPositionService.update(existing.id, posData);
        } else {
          await RackPositionService.create(posData);
        }
      }

      for (const standaloneDev of standaloneDevices) {
        if (standaloneDev.id) {
          await StandaloneDeviceService.update(standaloneDev.id, {
            x_position: standaloneDev.x_position,
            y_position: standaloneDev.y_position
          });
        }
      }
      
      toast.success('Floor plan saved successfully!');
    } catch (error) {
      console.error('Error saving floor plan:', error);
      toast.error('Failed to save floor plan');
    }
    setIsSaving(false);
  };

  const getRackDeviceCount = (rackId) => {
    return devices.filter(d => d.rack_config_id === rackId).length;
  };

  const handleMouseDown = (item, type, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    
    setDragOffset({
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom
    });
    
    setDraggedItem({ ...item, type });
  };

  const handleMouseMove = (e) => {
    if (!draggedItem) return;
    
    const container = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, (e.clientX - container.left) / zoom - dragOffset.x);
    const y = Math.max(0, (e.clientY - container.top) / zoom - dragOffset.y);

    if (draggedItem.type === 'standalone') {
      setStandaloneDevices(prev => prev.map(d =>
        d.id === draggedItem.id ? { ...d, x_position: x, y_position: y } : d
      ));
    } else if (draggedItem.type === 'rack') {
      setRackPositions(prev => ({
        ...prev,
        [draggedItem.id]: { ...prev[draggedItem.id], x, y, rotation: prev[draggedItem.id]?.rotation || 0 }
      }));
    }
  };

  const handleMouseUp = () => {
    setDraggedItem(null);
  };

  const handleContextMenu = (device, type, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (type === 'standalone' && device && device.id) {
      setSelectedDevice(device);
      setShowDeviceDialog(true);
    }
  };

  const handleCloseDeviceDialog = () => {
    setShowDeviceDialog(false);
    setSelectedDevice(null);
    loadData();
  };

  const renderConnections = () => {
    if (!showConnections || topologyConnections.length === 0) return null;
    
    return topologyConnections.map(conn => {
      let sourcePos, destPos;
      
      if (conn.source_type === 'standalone') {
        const sourceDev = standaloneDevices.find(d => d.id === conn.source_device_id);
        if (sourceDev) sourcePos = { x: (sourceDev.x_position || 0) + 48, y: (sourceDev.y_position || 0) + 48 };
      } else {
        const rackPos = rackPositions[conn.source_device_id];
        if (rackPos) sourcePos = { x: rackPos.x + 90, y: rackPos.y + 50 };
      }
      
      if (conn.destination_type === 'standalone') {
        const destDev = standaloneDevices.find(d => d.id === conn.destination_device_id);
        if (destDev) destPos = { x: (destDev.x_position || 0) + 48, y: (destDev.y_position || 0) + 48 };
      } else {
        const rackPos = rackPositions[conn.destination_device_id];
        if (rackPos) destPos = { x: rackPos.x + 90, y: rackPos.y + 50 };
      }
      
      if (!sourcePos || !destPos) return null;
      
      const connectionColors = {
        fiber: '#06b6d4',
        ethernet: '#8b5cf6',
        sfp: '#10b981',
        qsfp: '#3b82f6',
        wireless: '#f59e0b',
        dac: '#ec4899'
      };
      
      const color = connectionColors[conn.connection_type] || '#6366f1';
      
      const midX = (sourcePos.x + destPos.x) / 2;
      const midY = (sourcePos.y + destPos.y) / 2;
      const dx = destPos.x - sourcePos.x;
      const dy = destPos.y - sourcePos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const controlOffset = Math.min(dist * 0.1, 40);
      const controlX = midX + (-dy / dist) * controlOffset;
      const controlY = midY + (dx / dist) * controlOffset;
      
      const path = `M ${sourcePos.x} ${sourcePos.y} Q ${controlX} ${controlY}, ${destPos.x} ${destPos.y}`;
      
      return (
        <g key={conn.id}>
          <path
            d={path}
            stroke="rgba(0, 0, 0, 0.3)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={path}
            stroke={color}
            strokeWidth="2.5"
            fill="none"
            opacity="0.9"
            strokeLinecap="round"
          />
          {conn.bandwidth && (
            <g>
              <rect
                x={midX - 24}
                y={midY - 10}
                width="48"
                height="20"
                rx="10"
                fill="rgba(13, 17, 23, 0.95)"
                stroke={color}
                strokeWidth="1.5"
              />
              <text
                x={midX}
                y={midY + 5}
                textAnchor="middle"
                fill={color}
                fontSize="11"
                fontWeight="700"
              >
                {conn.bandwidth}
              </text>
            </g>
          )}
        </g>
      );
    });
  };

  const colorMap = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    cyan: 'from-cyan-500 to-cyan-600',
    green: 'from-green-500 to-emerald-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
    yellow: 'from-yellow-500 to-yellow-600',
    pink: 'from-pink-500 to-pink-600'
  };

  const createPageUrl = (path) => `/${path}`;

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: '#161b22' }}>
      <div className="max-w-full mx-auto space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">Floor Plan & Topology</h1>
              <p className="text-gray-400">Drag devices to reposition • Right-click standalone devices to edit</p>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => {
                setSelectedDevice(null);
                setShowDeviceDialog(true);
              }}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Device
            </Button>
            <Button
              onClick={() => setShowConnectionDialog(true)}
              className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Connection
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowConnections(!showConnections)}
              className="glass-button text-white border-white/20"
            >
              {showConnections ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
              Connections
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowGrid(!showGrid)}
              className="glass-button text-white border-white/20"
            >
              <Grid3x3 className="w-4 h-4 mr-2" />
              Grid
            </Button>
            <Button
              variant="outline"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              className="glass-button text-white border-white/20"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setZoom(Math.min(1.2, zoom + 0.1))}
              className="glass-button text-white border-white/20"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleSaveLayout}
              disabled={isSaving}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        <Card 
          className="glass-card border-white/10 p-0 overflow-auto"
          style={{ height: '650px' }}
          data-floor-plan
          onMouseMove={draggedItem ? handleMouseMove : undefined}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="relative select-none"
            style={{ 
              transform: `scale(${zoom})`,
              transformOrigin: '0 0',
              width: '2000px',
              height: '1400px'
            }}
          >
            {showGrid && (
              <div 
                className="absolute pointer-events-none"
                style={{
                  top: 0,
                  left: 0,
                  width: '2000px',
                  height: '1400px',
                  backgroundImage: `
                    linear-gradient(to right, rgba(96, 165, 250, 0.3) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(96, 165, 250, 0.3) 1px, transparent 1px)
                  `,
                  backgroundSize: '50px 50px'
                }}
              />
            )}

            <svg className="absolute inset-0 pointer-events-none" style={{ width: '2000px', height: '1400px' }}>
              {renderConnections()}
            </svg>

            {standaloneDevices.map(device => {
              if (!device || !device.id) return null;
              
              const isBeingDragged = draggedItem?.id === device.id && draggedItem?.type === 'standalone';
              
              return (
                <div
                  key={device.id}
                  onMouseDown={(e) => handleMouseDown(device, 'standalone', e)}
                  onContextMenu={(e) => handleContextMenu(device, 'standalone', e)}
                  style={{
                    position: 'absolute',
                    left: device.x_position || 100,
                    top: device.y_position || 100,
                    cursor: isBeingDragged ? 'grabbing' : 'grab',
                    zIndex: isBeingDragged ? 1000 : 1,
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  }}
                >
                  <div className={`glass-card border-white/10 rounded-xl p-4 w-24 h-24 flex flex-col items-center justify-center hover:border-white/30 transition-all glow-hover bg-gradient-to-br ${colorMap[device.icon_color] || colorMap.blue} ${isBeingDragged ? 'opacity-70 scale-105' : 'opacity-100'}`}>
                    <Layers className="w-8 h-8 text-white mb-2" />
                    <p className="text-xs text-white font-semibold text-center truncate w-full">{device.name}</p>
                  </div>
                </div>
              );
            })}

            {racks.map(rack => {
              const pos = rackPositions[rack.id] || { x: 200, y: 200, rotation: 0 };
              const isBeingDragged = draggedItem?.id === rack.id && draggedItem?.type === 'rack';
              
              return (
                <div
                  key={rack.id}
                  onMouseDown={(e) => handleMouseDown(rack, 'rack', e)}
                  onClick={() => navigate(createPageUrl(`RackDetails?id=${rack.id}`))}
                  style={{
                    position: 'absolute',
                    left: pos.x,
                    top: pos.y,
                    cursor: isBeingDragged ? 'grabbing' : 'grab',
                    zIndex: isBeingDragged ? 1000 : 1,
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  }}
                >
                  <div className={`glass-card border-white/10 rounded-xl p-4 min-w-[180px] hover:border-white/30 transition-all glow-hover bg-gradient-to-br ${
                    rack.color_tag === 'blue' ? 'from-blue-500/20 to-blue-600/10' :
                    rack.color_tag === 'purple' ? 'from-purple-500/20 to-purple-600/10' :
                    rack.color_tag === 'cyan' ? 'from-cyan-500/20 to-cyan-600/10' :
                    rack.color_tag === 'green' ? 'from-green-500/20 to-emerald-600/10' :
                    rack.color_tag === 'orange' ? 'from-orange-500/20 to-orange-600/10' :
                    'from-red-500/20 to-red-600/10'
                  } ${isBeingDragged ? 'opacity-70 scale-105' : 'opacity-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <Layers className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-bold text-white mb-1">{rack.name}</h4>
                    <p className="text-xs text-gray-400">{rack.size_u}U Rack</p>
                    <p className="text-xs text-gray-400">{getRackDeviceCount(rack.id)} devices</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {showDeviceDialog && (
          <StandaloneDeviceDialog
            device={selectedDevice!}
            onClose={handleCloseDeviceDialog}
          />
        )}

        {showConnectionDialog && (
          <TopologyConnectionDialog
            devices={[...standaloneDevices, ...racks]}
            onClose={() => {
              setShowConnectionDialog(false);
              loadData();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default FloorPlan;