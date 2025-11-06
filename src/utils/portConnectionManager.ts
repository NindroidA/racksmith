import { Connection, Port } from '../types/entities';

export interface CableRoute {
  id: string;
  connection: Connection;
  pathPoints: { x: number; y: number }[];
  length: number; // in feet
  color: string;
  validated: boolean;
  warnings: string[];
}

export interface PortUtilization {
  deviceId: string;
  totalPorts: number;
  usedPorts: number;
  availablePorts: number;
  utilizationPercent: number;
  ports: Port[];
}

/**
 * Calculate cable routing path between two devices
 */
export function calculateCableRoute(
  sourcePos: { x: number; y: number; u: number },
  targetPos: { x: number; y: number; u: number },
  connection: Connection
): CableRoute {
  const pathPoints: { x: number; y: number }[] = [];

  // Simple L-shaped routing
  // Start point
  pathPoints.push({ x: sourcePos.x, y: sourcePos.y });

  // Mid-point (vertical then horizontal or vice versa)
  if (Math.abs(sourcePos.x - targetPos.x) > Math.abs(sourcePos.y - targetPos.y)) {
    // Horizontal-first routing
    pathPoints.push({ x: targetPos.x, y: sourcePos.y });
  } else {
    // Vertical-first routing
    pathPoints.push({ x: sourcePos.x, y: targetPos.y });
  }

  // End point
  pathPoints.push({ x: targetPos.x, y: targetPos.y });

  // Calculate cable length (Manhattan distance + slack)
  const manhattanDist = Math.abs(sourcePos.x - targetPos.x) + Math.abs(sourcePos.y - targetPos.y);
  const verticalDist = Math.abs(sourcePos.u - targetPos.u) * 1.75; // 1.75 inches per U
  const length = Math.ceil((manhattanDist + verticalDist + 10) / 12); // Convert to feet with slack

  // Assign color based on cable type
  const color = getCableColor(connection.cable_type);

  // Validate connection
  const warnings = validateCableConnection(connection, length);

  return {
    id: connection.id,
    connection,
    pathPoints,
    length,
    color,
    validated: warnings.length === 0,
    warnings,
  };
}

/**
 * Get cable color based on type
 */
function getCableColor(cableType: Connection['cable_type']): string {
  const colorMap: Record<Connection['cable_type'], string> = {
    'cat5e': '#808080',    // Gray
    'cat6': '#0000FF',     // Blue
    'cat6a': '#00FF00',    // Green
    'cat7': '#FFFF00',     // Yellow
    'fiber_om3': '#00FFFF', // Cyan
    'fiber_om4': '#FF00FF', // Magenta
    'fiber_sm': '#FFA500',  // Orange
    'sfp': '#8B4513',      // Brown
    'sfp_plus': '#A52A2A', // Dark Brown
    'qsfp': '#4B0082',     // Indigo
    'qsfp28': '#9400D3',   // Violet
    'dac': '#C0C0C0',      // Silver
    'power': '#FF0000',    // Red
  };

  return colorMap[cableType] || '#808080';
}

/**
 * Validate cable connection
 */
function validateCableConnection(connection: Connection, length: number): string[] {
  const warnings: string[] = [];

  // Check cable length limits
  const lengthLimits: Record<Connection['cable_type'], number> = {
    'cat5e': 328,
    'cat6': 328,
    'cat6a': 328,
    'cat7': 328,
    'fiber_om3': 984,
    'fiber_om4': 1312,
    'fiber_sm': 32808,
    'sfp': 328,
    'sfp_plus': 328,
    'qsfp': 328,
    'qsfp28': 328,
    'dac': 16,
    'power': 50,
  };

  const limit = lengthLimits[connection.cable_type];
  if (length > limit) {
    warnings.push(`Cable length (${length}ft) exceeds ${connection.cable_type} limit (${limit}ft)`);
  }

  // Warn about power cables
  if (connection.cable_type === 'power' && length > 10) {
    warnings.push('Power cable may experience voltage drop at this length');
  }

  // Warn about DAC cables
  if (connection.cable_type === 'dac' && length > 10) {
    warnings.push('DAC cables are typically used for very short distances (<10ft)');
  }

  return warnings;
}

/**
 * Calculate port utilization for a device
 */
export function calculatePortUtilization(
  deviceId: string,
  totalPorts: number,
  ports: Port[]
): PortUtilization {
  const devicePorts = ports.filter(p => p.device_id === deviceId);
  const usedPorts = devicePorts.filter(p => p.status === 'connected').length;
  const availablePorts = devicePorts.filter(p => p.status === 'available').length;
  const utilizationPercent = totalPorts > 0 ? Math.round((usedPorts / totalPorts) * 100) : 0;

  return {
    deviceId,
    totalPorts,
    usedPorts,
    availablePorts,
    utilizationPercent,
    ports: devicePorts,
  };
}

/**
 * Find available ports on a device
 */
export function findAvailablePorts(
  deviceId: string,
  ports: Port[],
  portType?: Port['port_type']
): Port[] {
  let availablePorts = ports.filter(
    p => p.device_id === deviceId && p.status === 'available'
  );

  if (portType) {
    availablePorts = availablePorts.filter(p => p.port_type === portType);
  }

  return availablePorts;
}

/**
 * Validate port connection compatibility
 */
export function validatePortCompatibility(
  sourcePort: Port,
  targetPort: Port,
  cableType: Connection['cable_type']
): { isCompatible: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check if both ports are available
  if (sourcePort.status !== 'available') {
    warnings.push(`Source port ${sourcePort.port_number} is ${sourcePort.status}`);
  }
  if (targetPort.status !== 'available') {
    warnings.push(`Target port ${targetPort.port_number} is ${targetPort.status}`);
  }

  // Check port type compatibility
  const fiberCables = ['fiber_om3', 'fiber_om4', 'fiber_sm', 'sfp', 'sfp_plus', 'qsfp', 'qsfp28'];
  const fiberPorts = ['sfp', 'sfp_plus', 'qsfp', 'qsfp28', 'fiber'];

  if (fiberCables.includes(cableType) && !fiberPorts.includes(sourcePort.port_type)) {
    warnings.push(`Source port type ${sourcePort.port_type} may not support fiber/SFP cables`);
  }

  if (fiberCables.includes(cableType) && !fiberPorts.includes(targetPort.port_type)) {
    warnings.push(`Target port type ${targetPort.port_type} may not support fiber/SFP cables`);
  }

  // Check speed compatibility
  if (sourcePort.speed && targetPort.speed && sourcePort.speed !== targetPort.speed) {
    warnings.push(`Port speed mismatch: ${sourcePort.speed} vs ${targetPort.speed}`);
  }

  return {
    isCompatible: warnings.length === 0,
    warnings,
  };
}

/**
 * Generate port mapping documentation
 */
export function generatePortMappingDoc(connections: Connection[], ports: Port[]): string {
  let doc = '# Port Connection Mapping\n\n';
  doc += '## Connection Table\n\n';
  doc += '| Source Device | Source Port | Cable Type | Destination Device | Destination Port | VLAN | Length |\n';
  doc += '|---------------|-------------|------------|-------------------|------------------|------|--------|\n';

  connections.forEach(conn => {
    const sourcePort = ports.find(p => p.id === conn.source_port_id);
    const destPort = ports.find(p => p.id === conn.destination_port_id);

    doc += `| ${conn.source_device_id} | ${sourcePort?.port_number || conn.source_port} | `;
    doc += `${conn.cable_type} | ${conn.destination_device_id} | `;
    doc += `${destPort?.port_number || conn.destination_port} | ${conn.vlan || '-'} | `;
    doc += `${conn.cable_length_ft || '-'}ft |\n`;
  });

  return doc;
}

/**
 * Generate cable label suggestions
 */
export function generateCableLabels(connection: Connection): {
  sourceLabel: string;
  targetLabel: string;
} {
  return {
    sourceLabel: `${connection.source_device_id.slice(0, 8)}-${connection.source_port}->${connection.destination_port}`,
    targetLabel: `${connection.destination_device_id.slice(0, 8)}-${connection.destination_port}<-${connection.source_port}`,
  };
}

/**
 * Detect connection loops
 */
export function detectConnectionLoops(connections: Connection[]): string[][] {
  const graph = new Map<string, string[]>();

  // Build adjacency list
  connections.forEach(conn => {
    if (!graph.has(conn.source_device_id)) {
      graph.set(conn.source_device_id, []);
    }
    if (!graph.has(conn.destination_device_id)) {
      graph.set(conn.destination_device_id, []);
    }

    graph.get(conn.source_device_id)!.push(conn.destination_device_id);
    graph.get(conn.destination_device_id)!.push(conn.source_device_id);
  });

  const loops: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(deviceId: string, path: string[]): void {
    visited.add(deviceId);
    recursionStack.add(deviceId);
    path.push(deviceId);

    const neighbors = graph.get(deviceId) || [];
    neighbors.forEach(neighbor => {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recursionStack.has(neighbor)) {
        const loopStartIndex = path.indexOf(neighbor);
        const loop = path.slice(loopStartIndex);
        loops.push([...loop, neighbor]);
      }
    });

    recursionStack.delete(deviceId);
  }

  graph.forEach((_, deviceId) => {
    if (!visited.has(deviceId)) {
      dfs(deviceId, []);
    }
  });

  return loops;
}

/**
 * Calculate cable bill of materials
 */
export function generateCableBOM(routes: CableRoute[]): Array<{
  cableType: string;
  count: number;
  totalLength: number;
  color: string;
}> {
  const bom = new Map<string, { count: number; totalLength: number; color: string }>();

  routes.forEach(route => {
    const type = route.connection.cable_type;
    const existing = bom.get(type) || { count: 0, totalLength: 0, color: route.color };

    bom.set(type, {
      count: existing.count + 1,
      totalLength: existing.totalLength + route.length,
      color: route.color,
    });
  });

  return Array.from(bom.entries()).map(([cableType, data]) => ({
    cableType,
    ...data,
  }));
}

/**
 * Suggest optimal cable type based on requirements
 */
export function suggestCableType(
  distance: number,
  bandwidth: string,
  environment: 'indoor' | 'outdoor' | 'plenum'
): Connection['cable_type'] {
  const bandwidthNum = parseInt(bandwidth);

  // For very short distances, suggest DAC
  if (distance <= 10 && bandwidthNum >= 10) {
    return 'dac';
  }

  // For 10G+ over longer distances, suggest fiber
  if (bandwidthNum >= 10 && distance > 100) {
    return 'fiber_om4';
  }

  // For 10G and short/medium distance
  if (bandwidthNum >= 10 && distance <= 100) {
    return 'cat6a';
  }

  // For 1G standard networking
  if (bandwidthNum === 1) {
    return environment === 'plenum' ? 'cat6' : 'cat5e';
  }

  // Default to Cat6
  return 'cat6';
}
