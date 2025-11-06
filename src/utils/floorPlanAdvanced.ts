/**
 * Advanced Floor Plan Utilities
 * Multi-floor support, device grouping, and connection path visualization
 */

import type { Connection, Device } from '../types/entities';

export interface Floor {
  id: string;
  name: string;
  level: number;
  width: number;
  height: number;
  devices: Device[];
}

export interface DeviceGroup {
  id: string;
  name: string;
  color: string;
  deviceIds: string[];
  floorId: string;
  description?: string;
}

export interface FloorConnection {
  id: string;
  fromFloor: string;
  toFloor: string;
  fromDeviceId: string;
  toDeviceId: string;
  connectionType: 'fiber' | 'copper' | 'wireless';
  distance?: number;
}

export interface PathSegment {
  from: { x: number; y: number; floor: string };
  to: { x: number; y: number; floor: string };
  type: 'horizontal' | 'vertical' | 'inter-floor';
  distance: number;
}

/**
 * Create a new floor configuration
 */
export function createFloor(
  name: string,
  level: number,
  width = 1000,
  height = 800
): Floor {
  return {
    id: `floor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    level,
    width,
    height,
    devices: [],
  };
}

/**
 * Add a device to a specific floor
 */
export function addDeviceToFloor(
  floor: Floor,
  device: Device,
  x: number,
  y: number
): Floor {
  const deviceWithPosition = {
    ...device,
    position: { x, y },
  };

  return {
    ...floor,
    devices: [...floor.devices, deviceWithPosition],
  };
}

/**
 * Create a device group for organizational purposes
 */
export function createDeviceGroup(
  name: string,
  deviceIds: string[],
  floorId: string,
  color = '#3b82f6'
): DeviceGroup {
  return {
    id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    color,
    deviceIds,
    floorId,
  };
}

/**
 * Calculate the optimal path between devices, potentially across multiple floors
 */
export function calculateConnectionPath(
  fromDevice: Device & { position: { x: number; y: number }; floorId: string },
  toDevice: Device & { position: { x: number; y: number }; floorId: string },
  floors: Floor[]
): PathSegment[] {
  const segments: PathSegment[] = [];

  // Same floor - direct path
  if (fromDevice.floorId === toDevice.floorId) {
    const distance = Math.sqrt(
      Math.pow(toDevice.position.x - fromDevice.position.x, 2) +
        Math.pow(toDevice.position.y - fromDevice.position.y, 2)
    );

    segments.push({
      from: { ...fromDevice.position, floor: fromDevice.floorId },
      to: { ...toDevice.position, floor: toDevice.floorId },
      type: 'horizontal',
      distance,
    });
  } else {
    // Different floors - need inter-floor connection
    const fromFloor = floors.find((f) => f.id === fromDevice.floorId);
    const toFloor = floors.find((f) => f.id === toDevice.floorId);

    if (fromFloor && toFloor) {
      // Horizontal segment on source floor to riser location (assumed at 0, 0)
      const riserX = 50;
      const riserY = 50;

      segments.push({
        from: { ...fromDevice.position, floor: fromDevice.floorId },
        to: { x: riserX, y: riserY, floor: fromDevice.floorId },
        type: 'horizontal',
        distance: Math.sqrt(
          Math.pow(riserX - fromDevice.position.x, 2) +
            Math.pow(riserY - fromDevice.position.y, 2)
        ),
      });

      // Vertical segment between floors
      const floorDistance = Math.abs(toFloor.level - fromFloor.level) * 4; // 4 meters per floor
      segments.push({
        from: { x: riserX, y: riserY, floor: fromDevice.floorId },
        to: { x: riserX, y: riserY, floor: toDevice.floorId },
        type: 'inter-floor',
        distance: floorDistance,
      });

      // Horizontal segment on destination floor
      segments.push({
        from: { x: riserX, y: riserY, floor: toDevice.floorId },
        to: { ...toDevice.position, floor: toDevice.floorId },
        type: 'horizontal',
        distance: Math.sqrt(
          Math.pow(toDevice.position.x - riserX, 2) +
            Math.pow(toDevice.position.y - riserY, 2)
        ),
      });
    }
  }

  return segments;
}

/**
 * Calculate total cable distance for a connection path
 */
export function calculatePathDistance(segments: PathSegment[]): number {
  return segments.reduce((total, segment) => total + segment.distance, 0);
}

/**
 * Get all devices within a specific group
 */
export function getDevicesInGroup(
  group: DeviceGroup,
  allDevices: Device[]
): Device[] {
  return allDevices.filter((device) => group.deviceIds.includes(device.id));
}

/**
 * Find all inter-floor connections
 */
export function getInterFloorConnections(
  connections: Connection[],
  devices: (Device & { floorId: string })[]
): FloorConnection[] {
  const interFloorConnections: FloorConnection[] = [];

  connections.forEach((conn) => {
    const fromDevice = devices.find((d) => d.id === conn.source_device_id);
    const toDevice = devices.find((d) => d.id === conn.destination_device_id);

    if (fromDevice && toDevice && fromDevice.floorId !== toDevice.floorId) {
      interFloorConnections.push({
        id: conn.id,
        fromFloor: fromDevice.floorId,
        toFloor: toDevice.floorId,
        fromDeviceId: conn.source_device_id,
        toDeviceId: conn.destination_device_id,
        connectionType: determineConnectionType(fromDevice, toDevice),
      });
    }
  });

  return interFloorConnections;
}

/**
 * Determine connection type based on device types
 */
function determineConnectionType(
  fromDevice: Device,
  toDevice: Device
): 'fiber' | 'copper' | 'wireless' {
  const deviceTypes = [
    fromDevice.device_type.toLowerCase(),
    toDevice.device_type.toLowerCase(),
  ];

  if (deviceTypes.some((type) => type.includes('wireless') || type.includes('ap'))) {
    return 'wireless';
  }

  if (
    deviceTypes.some((type) => type.includes('switch') || type.includes('router'))
  ) {
    return 'fiber'; // Inter-floor switches typically use fiber
  }

  return 'copper';
}

/**
 * Group devices automatically by proximity
 */
export function autoGroupDevicesByProximity(
  devices: (Device & { position: { x: number; y: number } })[],
  floorId: string,
  threshold = 100
): DeviceGroup[] {
  const groups: DeviceGroup[] = [];
  const visited = new Set<string>();

  devices.forEach((device) => {
    if (visited.has(device.id)) return;

    const nearbyDevices = devices.filter((d) => {
      if (d.id === device.id || visited.has(d.id)) return false;

      const distance = Math.sqrt(
        Math.pow(d.position.x - device.position.x, 2) +
          Math.pow(d.position.y - device.position.y, 2)
      );

      return distance <= threshold;
    });

    if (nearbyDevices.length > 0) {
      const deviceIds = [device.id, ...nearbyDevices.map((d) => d.id)];
      deviceIds.forEach((id) => visited.add(id));

      groups.push(
        createDeviceGroup(`Group ${groups.length + 1}`, deviceIds, floorId)
      );
    }
  });

  return groups;
}

/**
 * Calculate floor utilization percentage
 */
export function calculateFloorUtilization(floor: Floor): number {
  if (floor.devices.length === 0) return 0;

  // Estimate each device occupies a 50x50 pixel area
  const deviceArea = 50 * 50;
  const totalDeviceArea = floor.devices.length * deviceArea;
  const floorArea = floor.width * floor.height;

  return Math.min((totalDeviceArea / floorArea) * 100, 100);
}

/**
 * Get a summary of all floors
 */
export function getFloorsSummary(floors: Floor[]): {
  totalFloors: number;
  totalDevices: number;
  averageUtilization: number;
  floorBreakdown: { floorName: string; deviceCount: number; utilization: number }[];
} {
  const totalDevices = floors.reduce((sum, floor) => sum + floor.devices.length, 0);
  const utilizations = floors.map((floor) => calculateFloorUtilization(floor));
  const averageUtilization =
    utilizations.reduce((sum, util) => sum + util, 0) / floors.length || 0;

  return {
    totalFloors: floors.length,
    totalDevices,
    averageUtilization: parseFloat(averageUtilization.toFixed(2)),
    floorBreakdown: floors.map((floor) => ({
      floorName: floor.name,
      deviceCount: floor.devices.length,
      utilization: parseFloat(calculateFloorUtilization(floor).toFixed(2)),
    })),
  };
}

/**
 * Validate device placement on floor (check boundaries)
 */
export function validateDevicePlacement(
  floor: Floor,
  x: number,
  y: number,
  deviceWidth = 50,
  deviceHeight = 50
): { valid: boolean; error?: string } {
  if (x < 0 || y < 0) {
    return { valid: false, error: 'Device position cannot be negative' };
  }

  if (x + deviceWidth > floor.width || y + deviceHeight > floor.height) {
    return { valid: false, error: 'Device exceeds floor boundaries' };
  }

  return { valid: true };
}

/**
 * Export floor plan as JSON configuration
 */
export function exportFloorPlan(floors: Floor[], groups: DeviceGroup[]): string {
  const config = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    floors,
    groups,
  };

  return JSON.stringify(config, null, 2);
}

/**
 * Import floor plan from JSON configuration
 */
export function importFloorPlan(json: string): {
  floors: Floor[];
  groups: DeviceGroup[];
} | null {
  try {
    const config = JSON.parse(json);
    return {
      floors: config.floors || [],
      groups: config.groups || [],
    };
  } catch (error) {
    console.error('Failed to import floor plan:', error);
    return null;
  }
}
