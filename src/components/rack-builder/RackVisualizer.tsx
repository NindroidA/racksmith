import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, BarChart3, Cable, Database, Power, Server, Shield, Wifi, Zap } from 'lucide-react';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { DropEffect, RackVisualizerProps } from '../../types/components';
import { Device } from '../../types/entities';
import { calculateRackUtilization, validateDevicePlacement } from '../../utils/validators';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const deviceTypeColors = {
  router: 'from-blue-500 to-blue-600',
  switch: 'from-purple-500 to-purple-600',
  fiber_switch: 'from-cyan-500 to-cyan-600',
  ups: 'from-yellow-500 to-yellow-600',
  patch_panel: 'from-green-500 to-emerald-600',
  server: 'from-red-500 to-red-600',
  firewall: 'from-orange-500 to-orange-600',
  load_balancer: 'from-pink-500 to-pink-600',
  storage: 'from-indigo-500 to-indigo-600',
  pdu: 'from-lime-500 to-lime-600',
  other: 'from-gray-500 to-gray-600'
};

const deviceTypeIcons = {
  router: Wifi,
  switch: Cable,
  fiber_switch: Cable,
  ups: Zap,
  patch_panel: BarChart3,
  server: Server,
  firewall: Shield,
  load_balancer: BarChart3,
  storage: Database,
  pdu: Power,
  other: Server
};


const RackVisualizer: React.FC<RackVisualizerProps> = ({ rackSize, devices, selectedDevice, onDeviceSelect, onDeviceRemove, onDeviceMove, colorTag }) => {
  const [draggedDevice, setDraggedDevice] = useState<Device | null>(null);
  const [dragOverUnit, setDragOverUnit] = useState<number | null>(null);
  const [dropEffects, setDropEffects] = useState<DropEffect[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const rackUnits = Array.from({ length: rackSize }, (_, i) => rackSize - i);
  
  // Calculate rack utilization with warnings
  const utilization = calculateRackUtilization(
    { id: '', name: '', size_u: rackSize, location: '', color_tag: (colorTag as any) || 'blue' },
    devices
  );
  
  const isUnitOccupied = (unitNumber: number) => {
    return devices.find(device => {
      const deviceEnd = (device.position_u || 0) + device.size_u - 1;
      return unitNumber >= (device.position_u || 0) && unitNumber <= deviceEnd;
    });
  };

  const getDeviceAtUnit = (unitNumber: number) => {
    return devices.find(device => device.position_u === unitNumber);
  };

  const canPlaceDevice = (device: Device, targetUnit: number) => {
    // Use validation utility for comprehensive checking
    const validation = validateDevicePlacement(
      device,
      targetUnit,
      { id: '', name: '', size_u: rackSize, location: '', color_tag: (colorTag as any) || 'blue' },
      devices
    );
    
    if (!validation.isValid) {
      setValidationError(validation.errors[0] || 'Cannot place device here');
      return false;
    }
    
    setValidationError(null);
    return true;
  };

  const handleDragStart = (device: Device, e: React.DragEvent) => {
    setDraggedDevice(device);
    e.dataTransfer.effectAllowed = 'move';
    setValidationError(null);
  };

  const handleDragOver = (unit: number, e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedDevice) return;
    
    if (canPlaceDevice(draggedDevice, unit)) {
      setDragOverUnit(unit);
      e.dataTransfer.dropEffect = 'move';
    } else {
      setDragOverUnit(null);
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDrop = (unit: number, e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedDevice) return;
    
    if (!canPlaceDevice(draggedDevice, unit)) {
      if (validationError) {
        toast.error(validationError);
      }
      setDraggedDevice(null);
      setDragOverUnit(null);
      return;
    }
    
    onDeviceMove(draggedDevice.id, unit);
    
    // Show success toast with validation info
    toast.success(`${draggedDevice.name} moved to ${unit}U`);
    
    // Create multiple ripples for water drop effect
    const newEffects = [
      { id: Date.now(), unit, delay: 0 },
      { id: Date.now() + 1, unit, delay: 0.15 },
      { id: Date.now() + 2, unit, delay: 0.3 }
    ];
    setDropEffects(prev => [...prev, ...newEffects]);
    
    setTimeout(() => {
      setDropEffects(prev => prev.filter(e => !newEffects.find(ne => ne.id === e.id)));
    }, 1000);
    
    setDraggedDevice(null);
    setDragOverUnit(null);
    setValidationError(null);
  };

  const handleDragEnd = () => {
    setDraggedDevice(null);
    setDragOverUnit(null);
  };

  return (
    <Card className="glass-card border-white/10 overflow-hidden">
      <CardHeader className="border-b border-white/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Server className="w-5 h-5" />
            Rack Layout ({rackSize}U)
          </CardTitle>
          <div className="flex items-center gap-4">
            {utilization.percentage >= 80 && (
              <div className="flex items-center gap-1 text-amber-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>{utilization.percentage.toFixed(0)}% Full</span>
              </div>
            )}
            <div className="text-sm text-white/60">
              {utilization.usedUnits}U / {rackSize}U used
            </div>
          </div>
        </div>
        {validationError && (
          <div className="mt-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{validationError}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-1 max-h-[700px] overflow-y-auto custom-scrollbar pr-2">
          <AnimatePresence>
            {rackUnits.map(unit => {
              const deviceAtThisUnit = getDeviceAtUnit(unit);
              const occupiedByAnyDevice = isUnitOccupied(unit);
              const isDropTarget = dragOverUnit === unit;
              const activeEffects = dropEffects.filter(e => e.unit === unit);
              
              const isDraggingThis = draggedDevice && deviceAtThisUnit && draggedDevice.id === deviceAtThisUnit.id;
              
              if (deviceAtThisUnit) {
                const device = deviceAtThisUnit;
                const isSelected = selectedDevice?.id === device.id;
                const DeviceIcon = deviceTypeIcons[device.device_type] || Server;
                
                return (
                  <div
                    key={device.id}
                    draggable
                    onDragStart={(e) => handleDragStart(device, e)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onDeviceSelect(device)}
                    className={`relative cursor-move ${
                      isSelected ? 'ring-2 ring-fuchsia-500/50 glow z-10' : ''
                    }`}
                    style={{ height: `${device.size_u * 64}px` }}
                  >
                    <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${deviceTypeColors[device.device_type]} p-4 flex items-center justify-between group hover:shadow-2xl overflow-hidden transition-all duration-300`}>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      {activeEffects.map(effect => (
                        <motion.div
                          key={effect.id}
                          initial={{ scale: 0, opacity: 0.8 }}
                          animate={{ scale: 4, opacity: 0 }}
                          transition={{ 
                            duration: 0.8, 
                            delay: effect.delay,
                            ease: [0.34, 1.56, 0.64, 1]
                          }}
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        >
                          <div className="w-full h-full rounded-xl bg-blue-400/30 blur-sm" />
                        </motion.div>
                      ))}
                      
                      <div className="flex items-center gap-3 flex-1 min-w-0 relative z-10">
                        <motion.div 
                          className="w-14 h-14 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm"
                          whileHover={{ rotate: [0, -10, 10, -10, 0], transition: { duration: 0.5 } }}
                        >
                          <DeviceIcon className="w-7 h-7 text-white" />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white truncate text-lg">{device.name}</p>
                          <p className="text-xs text-white/90 mt-1">
                            {device.manufacturer} • {device.size_u}U • U{unit}-U{unit + device.size_u - 1}
                          </p>
                          {device.port_count! > 0 && (
                            <div className="flex gap-1 mt-2">
                              {Array.from({ length: Math.min(device.port_count!, 8) }).map((_, i) => (
                                <motion.div 
                                  key={i} 
                                  className="w-2 h-2 rounded-full bg-white/40"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: i * 0.05 }}
                                />
                              ))}
                              {device.port_count! > 8 && (
                                <span className="text-xs text-white/60 ml-1">+{device.port_count! - 8}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              
              if (!occupiedByAnyDevice) {
                return (
                  <motion.div
                    key={unit}
                    onDragOver={(e) => handleDragOver(unit, e)}
                    onDrop={(e) => handleDrop(unit, e)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`h-16 flex items-center frosted rounded transition-all duration-300 ${
                      isDropTarget ? 'bg-blue-500/20 border-2 border-blue-500 scale-[1.02] shadow-lg shadow-blue-500/30' : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span className="text-xs text-gray-500 ml-3 font-mono">U{unit}</span>
                    <div className="flex-1 border-t border-dashed border-white/10 mx-3" />
                    {isDropTarget && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-xs text-blue-400 mr-3 font-semibold"
                      >
                        Drop here
                      </motion.div>
                    )}
                  </motion.div>
                );
              }
              
              return null;
            })}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};

export default RackVisualizer;