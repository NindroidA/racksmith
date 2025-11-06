/**
 * Enhanced Rack Visualizer Utilities
 * Drag-and-drop with precise U-position placement and collision detection
 */

import type { Device, RackConfiguration } from '../types/entities';

export interface DragState {
  isDragging: boolean;
  deviceId: string | null;
  startPosition: number;
  currentPosition: number;
  offset: { x: number; y: number };
}

export interface DropZone {
  positionU: number;
  sizeU: number;
  isValid: boolean;
  reason?: string;
}

export interface CollisionInfo {
  hasCollision: boolean;
  collidingDevices: Device[];
  availableSpaces: { startU: number; endU: number; sizeU: number }[];
}

export interface SnapGuide {
  position: number;
  type: 'top' | 'bottom' | 'center';
  label: string;
}

/**
 * Calculate the U position based on mouse Y coordinate
 */
export function calculateUPositionFromMouse(
  mouseY: number,
  rackTopY: number,
  uHeight: number
): number {
  const relativeY = mouseY - rackTopY;
  const uPosition = Math.floor(relativeY / uHeight) + 1;
  return Math.max(1, uPosition);
}

/**
 * Calculate Y coordinate from U position
 */
export function calculateYFromUPosition(
  positionU: number,
  rackTopY: number,
  uHeight: number
): number {
  return rackTopY + (positionU - 1) * uHeight;
}

/**
 * Snap device position to nearest valid U position
 */
export function snapToUPosition(
  currentY: number,
  rackTopY: number,
  uHeight: number,
  deviceSizeU: number,
  rackSizeU: number
): number {
  let targetU = calculateUPositionFromMouse(currentY, rackTopY, uHeight);

  // Ensure device fits within rack
  if (targetU + deviceSizeU - 1 > rackSizeU) {
    targetU = rackSizeU - deviceSizeU + 1;
  }

  return Math.max(1, targetU);
}

/**
 * Check for collisions with existing devices
 */
export function detectCollision(
  targetPositionU: number,
  deviceSizeU: number,
  existingDevices: Device[],
  excludeDeviceId?: string
): CollisionInfo {
  const targetEnd = targetPositionU + deviceSizeU - 1;
  const collidingDevices: Device[] = [];

  existingDevices.forEach((device) => {
    if (device.id === excludeDeviceId) return;

    const deviceEnd = device.position_u + device.size_u - 1;

    // Check if ranges overlap
    const overlaps =
      (targetPositionU >= device.position_u && targetPositionU <= deviceEnd) ||
      (targetEnd >= device.position_u && targetEnd <= deviceEnd) ||
      (targetPositionU <= device.position_u && targetEnd >= deviceEnd);

    if (overlaps) {
      collidingDevices.push(device);
    }
  });

  const availableSpaces = findAvailableSpaces(existingDevices, excludeDeviceId);

  return {
    hasCollision: collidingDevices.length > 0,
    collidingDevices,
    availableSpaces,
  };
}

/**
 * Find all available contiguous spaces in the rack
 */
export function findAvailableSpaces(
  devices: Device[],
  excludeDeviceId?: string,
  rackSizeU = 42
): Array<{ startU: number; endU: number; sizeU: number }> {
  const occupiedPositions = new Set<number>();

  // Mark all occupied U positions
  devices.forEach((device) => {
    if (device.id === excludeDeviceId) return;

    for (let u = device.position_u; u < device.position_u + device.size_u; u++) {
      occupiedPositions.add(u);
    }
  });

  // Find contiguous available spaces
  const availableSpaces: Array<{ startU: number; endU: number; sizeU: number }> = [];
  let currentStart: number | null = null;

  for (let u = 1; u <= rackSizeU; u++) {
    if (!occupiedPositions.has(u)) {
      if (currentStart === null) {
        currentStart = u;
      }
    } else {
      if (currentStart !== null) {
        availableSpaces.push({
          startU: currentStart,
          endU: u - 1,
          sizeU: u - currentStart,
        });
        currentStart = null;
      }
    }
  }

  // Handle case where rack ends with available space
  if (currentStart !== null) {
    availableSpaces.push({
      startU: currentStart,
      endU: rackSizeU,
      sizeU: rackSizeU - currentStart + 1,
    });
  }

  return availableSpaces;
}

/**
 * Find the nearest available position for a device
 */
export function findNearestAvailablePosition(
  preferredPositionU: number,
  deviceSizeU: number,
  devices: Device[],
  rackSizeU = 42
): number | null {
  const availableSpaces = findAvailableSpaces(devices, undefined, rackSizeU);

  // First try to fit in preferred position's space
  for (const space of availableSpaces) {
    if (preferredPositionU >= space.startU && preferredPositionU <= space.endU) {
      // Check if device fits starting at preferred position
      if (preferredPositionU + deviceSizeU - 1 <= space.endU) {
        return preferredPositionU;
      }
      // Try to fit at the start of this space
      if (space.sizeU >= deviceSizeU) {
        return space.startU;
      }
    }
  }

  // Find nearest space that can fit the device
  let nearestPosition: number | null = null;
  let minDistance = Infinity;

  for (const space of availableSpaces) {
    if (space.sizeU >= deviceSizeU) {
      const distance = Math.abs(space.startU - preferredPositionU);
      if (distance < minDistance) {
        minDistance = distance;
        nearestPosition = space.startU;
      }
    }
  }

  return nearestPosition;
}

/**
 * Generate snap guides for better visual feedback
 */
export function generateSnapGuides(
  devices: Device[],
  rackSizeU: number
): SnapGuide[] {
  const guides: SnapGuide[] = [];

  // Add guide at rack top
  guides.push({
    position: 1,
    type: 'top',
    label: 'Rack Top (1U)',
  });

  // Add guides at device boundaries
  devices.forEach((device) => {
    guides.push({
      position: device.position_u,
      type: 'top',
      label: `${device.name} Top (${device.position_u}U)`,
    });

    const bottomU = device.position_u + device.size_u - 1;
    guides.push({
      position: bottomU + 1,
      type: 'bottom',
      label: `${device.name} Bottom (${bottomU + 1}U)`,
    });
  });

  // Add guide at rack bottom
  guides.push({
    position: rackSizeU + 1,
    type: 'bottom',
    label: `Rack Bottom (${rackSizeU}U)`,
  });

  return guides;
}

/**
 * Validate drop zone
 */
export function validateDropZone(
  positionU: number,
  sizeU: number,
  rack: RackConfiguration,
  devices: Device[],
  excludeDeviceId?: string
): DropZone {
  const collision = detectCollision(positionU, sizeU, devices, excludeDeviceId);

  // Check if device exceeds rack bounds
  if (positionU < 1) {
    return {
      positionU,
      sizeU,
      isValid: false,
      reason: 'Position below rack minimum (1U)',
    };
  }

  if (positionU + sizeU - 1 > rack.size_u) {
    return {
      positionU,
      sizeU,
      isValid: false,
      reason: `Device exceeds rack capacity (${rack.size_u}U)`,
    };
  }

  if (collision.hasCollision) {
    return {
      positionU,
      sizeU,
      isValid: false,
      reason: `Collision with ${collision.collidingDevices.map((d) => d.name).join(', ')}`,
    };
  }

  return {
    positionU,
    sizeU,
    isValid: true,
  };
}

/**
 * Calculate visual feedback color based on drop zone validity
 */
export function getDropZoneColor(dropZone: DropZone): string {
  if (dropZone.isValid) {
    return 'rgba(34, 197, 94, 0.3)'; // Green
  }
  return 'rgba(239, 68, 68, 0.3)'; // Red
}

/**
 * Auto-arrange devices to eliminate gaps (compact mode)
 */
export function compactDevices(
  devices: Device[],
  startFromBottom = false
): Device[] {
  const sorted = [...devices].sort((a, b) =>
    startFromBottom
      ? b.position_u - a.position_u // Bottom to top
      : a.position_u - b.position_u // Top to bottom
  );

  const compacted: Device[] = [];
  let nextAvailableU = 1;

  sorted.forEach((device) => {
    compacted.push({
      ...device,
      position_u: nextAvailableU,
    });
    nextAvailableU += device.size_u;
  });

  return compacted;
}

/**
 * Distribute devices evenly across rack
 */
export function distributeDevicesEvenly(
  devices: Device[],
  rackSizeU: number
): Device[] {
  if (devices.length === 0) return [];

  const totalDeviceSpace = devices.reduce((sum, d) => sum + d.size_u, 0);
  const availableSpace = rackSizeU - totalDeviceSpace;
  const gap = Math.floor(availableSpace / (devices.length + 1));

  const distributed: Device[] = [];
  let currentU = gap + 1;

  devices.forEach((device) => {
    distributed.push({
      ...device,
      position_u: currentU,
    });
    currentU += device.size_u + gap;
  });

  return distributed;
}

/**
 * Get rack utilization percentage
 */
export function calculateRackUtilization(
  devices: Device[],
  rackSizeU: number
): {
  used: number;
  available: number;
  percentage: number;
  efficiency: 'low' | 'optimal' | 'high' | 'critical';
} {
  const used = devices.reduce((sum, device) => sum + device.size_u, 0);
  const available = rackSizeU - used;
  const percentage = (used / rackSizeU) * 100;

  let efficiency: 'low' | 'optimal' | 'high' | 'critical' = 'optimal';
  if (percentage < 30) efficiency = 'low';
  else if (percentage > 80) efficiency = 'high';
  else if (percentage > 95) efficiency = 'critical';

  return {
    used,
    available,
    percentage: parseFloat(percentage.toFixed(2)),
    efficiency,
  };
}

/**
 * Suggest optimal device placement
 */
export function suggestOptimalPlacement(
  device: Device,
  devices: Device[],
  rackSizeU: number,
  strategy: 'top' | 'bottom' | 'center' | 'compact' = 'top'
): number | null {
  const availableSpaces = findAvailableSpaces(devices, undefined, rackSizeU);

  // Filter spaces that can fit the device
  const fitSpaces = availableSpaces.filter((space) => space.sizeU >= device.size_u);

  if (fitSpaces.length === 0) return null;

  switch (strategy) {
    case 'top':
      return fitSpaces[0]?.startU || null;

    case 'bottom': {
      const lastSpace = fitSpaces[fitSpaces.length - 1];
      return lastSpace ? lastSpace.endU - device.size_u + 1 : null;
    }

    case 'center': {
      const centerU = Math.floor(rackSizeU / 2);
      let closestSpace = fitSpaces[0];
      let minDistance = Math.abs((fitSpaces[0]?.startU || 0) - centerU);

      fitSpaces.forEach((space) => {
        const distance = Math.abs(space.startU - centerU);
        if (distance < minDistance) {
          minDistance = distance;
          closestSpace = space;
        }
      });

      return closestSpace?.startU || null;
    }

    case 'compact':
      // Find first available space from top
      return fitSpaces[0]?.startU || null;

    default:
      return fitSpaces[0]?.startU || null;
  }
}

/**
 * Generate drag ghost element data
 */
export function generateDragGhost(device: Device): {
  width: number;
  height: number;
  content: string;
  backgroundColor: string;
} {
  const heightPerU = 25; // pixels per U

  return {
    width: 300,
    height: device.size_u * heightPerU,
    content: `${device.name} (${device.size_u}U)`,
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
  };
}
