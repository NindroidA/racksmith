/**
 * Device Cloning Utilities
 * Duplicate devices and racks with customizable configurations
 */

import type { Connection, Device, Port, RackConfiguration } from '../types/entities';

export interface CloneOptions {
  includeConnections?: boolean;
  includePorts?: boolean;
  namePattern?: string; // e.g., "{original} - Copy {num}"
  positionOffset?: number; // Offset U positions
  newRackId?: string; // Clone to different rack
  preservePosition?: boolean; // Keep original position
}

export interface CloneResult {
  device?: Device;
  devices?: Device[];
  connections?: Connection[];
  ports?: Port[];
  errors?: string[];
}

/**
 * Clone a single device
 */
export function cloneDevice(
  device: Device,
  options: CloneOptions = {},
  cloneNumber: number = 1
): Device {
  const newName = options.namePattern
    ? options.namePattern
        .replace('{original}', device.name)
        .replace('{num}', String(cloneNumber))
    : `${device.name} - Copy ${cloneNumber}`;

  const newPosition = options.preservePosition
    ? device.position_u
    : options.positionOffset
      ? device.position_u + options.positionOffset
      : device.position_u;

  return {
    ...device,
    id: `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    rack_config_id: options.newRackId || device.rack_config_id,
    name: newName,
    position_u: newPosition,
  };
}

/**
 * Clone multiple devices
 */
export function cloneMultipleDevices(
  devices: Device[],
  options: CloneOptions = {}
): Device[] {
  return devices.map((device, index) =>
    cloneDevice(device, options, index + 1)
  );
}

/**
 * Clone device with its connections
 */
export function cloneDeviceWithConnections(
  device: Device,
  connections: Connection[],
  options: CloneOptions = {}
): { device: Device; connections: Connection[] } {
  const clonedDevice = cloneDevice(device, options);
  const deviceConnections = connections.filter(
    (conn) =>
      conn.source_device_id === device.id || conn.destination_device_id === device.id
  );

  const clonedConnections = deviceConnections.map((conn) => ({
    ...conn,
    id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    source_device_id:
      conn.source_device_id === device.id
        ? clonedDevice.id
        : conn.source_device_id,
    destination_device_id:
      conn.destination_device_id === device.id
        ? clonedDevice.id
        : conn.destination_device_id,
  }));

  return {
    device: clonedDevice,
    connections: options.includeConnections ? clonedConnections : [],
  };
}

/**
 * Clone device with its ports
 */
export function cloneDeviceWithPorts(
  device: Device,
  ports: Port[],
  options: CloneOptions = {}
): { device: Device; ports: Port[] } {
  const clonedDevice = cloneDevice(device, options);
  const devicePorts = ports.filter((port) => port.device_id === device.id);

  const clonedPorts = devicePorts.map((port) => ({
    ...port,
    id: `port-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    device_id: clonedDevice.id,
    // Reset status to available for cloned ports
    status: 'available' as const,
  }));

  return {
    device: clonedDevice,
    ports: options.includePorts ? clonedPorts : [],
  };
}

/**
 * Clone an entire rack with all its devices
 */
export function cloneRack(
  rack: RackConfiguration,
  devices: Device[],
  newName?: string,
  options: CloneOptions = {}
): { rack: RackConfiguration; devices: Device[] } {
  const newRackId = `rack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const clonedRack: RackConfiguration = {
    ...rack,
    id: newRackId,
    name: newName || `${rack.name} - Copy`,
    created_date: new Date().toISOString(),
  };

  const rackDevices = devices.filter((d) => d.rack_config_id === rack.id);
  const clonedDevices = cloneMultipleDevices(rackDevices, {
    ...options,
    newRackId,
  });

  return {
    rack: clonedRack,
    devices: clonedDevices,
  };
}

/**
 * Clone rack with connections
 */
export function cloneRackWithConnections(
  rack: RackConfiguration,
  devices: Device[],
  connections: Connection[],
  newName?: string,
  options: CloneOptions = {}
): { rack: RackConfiguration; devices: Device[]; connections: Connection[] } {
  const newRackId = `rack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const clonedRack: RackConfiguration = {
    ...rack,
    id: newRackId,
    name: newName || `${rack.name} - Copy`,
    created_date: new Date().toISOString(),
  };

  const rackDevices = devices.filter((d) => d.rack_config_id === rack.id);
  const clonedDevices = cloneMultipleDevices(rackDevices, {
    ...options,
    newRackId,
  });

  // Map old device IDs to new device IDs
  const deviceIdMap = new Map<string, string>();
  rackDevices.forEach((oldDevice, index) => {
    const newDevice = clonedDevices[index];
    if (newDevice) {
      deviceIdMap.set(oldDevice.id, newDevice.id);
    }
  });

  // Clone connections between devices in this rack
  const rackDeviceIds = new Set(rackDevices.map((d) => d.id));
  const rackConnections = connections.filter(
    (conn) =>
      rackDeviceIds.has(conn.source_device_id) &&
      rackDeviceIds.has(conn.destination_device_id)
  );

  const clonedConnections = rackConnections.map((conn) => ({
    ...conn,
    id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    source_device_id: deviceIdMap.get(conn.source_device_id) || conn.source_device_id,
    destination_device_id:
      deviceIdMap.get(conn.destination_device_id) || conn.destination_device_id,
  }));

  return {
    rack: clonedRack,
    devices: clonedDevices,
    connections: options.includeConnections ? clonedConnections : [],
  };
}

/**
 * Batch clone devices to a specific position
 */
export function batchCloneDevices(
  devices: Device[],
  targetRackId: string,
  startPositionU: number,
  namePattern?: string
): Device[] {
  const cloned: Device[] = [];
  let currentPosition = startPositionU;

  devices.forEach((device, index) => {
    const newName = namePattern
      ? namePattern
          .replace('{original}', device.name)
          .replace('{num}', String(index + 1))
      : `${device.name} - Copy ${index + 1}`;

    cloned.push({
      ...device,
      id: `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      rack_config_id: targetRackId,
      name: newName,
      position_u: currentPosition,
    });

    currentPosition += device.size_u;
  });

  return cloned;
}

/**
 * Clone device and increment model number
 */
export function cloneDeviceWithIncrement(
  device: Device,
  incrementField: 'name' | 'model' = 'name'
): Device {
  const incrementPattern = /(\d+)$/;
  const field = device[incrementField];

  let newValue = field;
  if (typeof field === 'string') {
    const match = field.match(incrementPattern);
    if (match && match[1]) {
      const currentNumber = parseInt(match[1], 10);
      const newNumber = currentNumber + 1;
      newValue = field.replace(incrementPattern, String(newNumber).padStart(match[1].length, '0'));
    } else {
      newValue = `${field} 01`;
    }
  }

  return {
    ...device,
    id: `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    [incrementField]: newValue,
  };
}

/**
 * Mirror device to another rack (same position, opposite side)
 */
export function mirrorDevice(
  device: Device,
  targetRackId: string,
  mirrorName?: string
): Device {
  return {
    ...device,
    id: `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    rack_config_id: targetRackId,
    name: mirrorName || `${device.name} (Mirror)`,
  };
}

/**
 * Clone device array to create HA pair
 */
export function createHAPair(
  device: Device,
  primarySuffix: string = 'Primary',
  secondarySuffix: string = 'Secondary',
  positionOffset: number = 0
): [Device, Device] {
  const primary: Device = {
    ...device,
    id: `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: `${device.name} - ${primarySuffix}`,
  };

  const secondary: Device = {
    ...device,
    id: `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: `${device.name} - ${secondarySuffix}`,
    position_u: device.position_u + positionOffset,
  };

  return [primary, secondary];
}

/**
 * Validate clone operation
 */
export function validateClone(
  device: Device,
  targetRack: RackConfiguration,
  existingDevices: Device[],
  options: CloneOptions
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const newPosition = options.preservePosition
    ? device.position_u
    : options.positionOffset
      ? device.position_u + options.positionOffset
      : device.position_u;

  // Check if device fits in rack
  if (newPosition < 1) {
    errors.push('Position must be at least 1U');
  }

  if (newPosition + device.size_u - 1 > targetRack.size_u) {
    errors.push(`Device exceeds rack capacity (${targetRack.size_u}U)`);
  }

  // Check for collisions
  const targetDevices = existingDevices.filter(
    (d) => d.rack_config_id === (options.newRackId || device.rack_config_id)
  );

  targetDevices.forEach((existingDevice) => {
    const deviceEnd = newPosition + device.size_u - 1;
    const existingEnd = existingDevice.position_u + existingDevice.size_u - 1;

    const overlaps =
      (newPosition >= existingDevice.position_u && newPosition <= existingEnd) ||
      (deviceEnd >= existingDevice.position_u && deviceEnd <= existingEnd) ||
      (newPosition <= existingDevice.position_u && deviceEnd >= existingEnd);

    if (overlaps) {
      errors.push(
        `Position conflict with device "${existingDevice.name}" at ${existingDevice.position_u}U`
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get clone summary statistics
 */
export function getCloneSummary(cloneResult: {
  devices: Device[];
  connections?: Connection[];
  ports?: Port[];
}): {
  deviceCount: number;
  connectionCount: number;
  portCount: number;
  totalSizeU: number;
  totalPowerW: number;
} {
  const deviceCount = cloneResult.devices.length;
  const connectionCount = cloneResult.connections?.length || 0;
  const portCount = cloneResult.ports?.length || 0;
  const totalSizeU = cloneResult.devices.reduce((sum, d) => sum + d.size_u, 0);
  const totalPowerW = cloneResult.devices.reduce(
    (sum, d) => sum + (d.power_watts || 0),
    0
  );

  return {
    deviceCount,
    connectionCount,
    portCount,
    totalSizeU,
    totalPowerW,
  };
}
