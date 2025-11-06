/**
 * Cable Management Utilities
 * Cable labeling system, length calculation, and patch panel mapping
 */

import type { Connection, Device } from '../types/entities';

export interface CableLabel {
  id: string;
  connectionId: string;
  labelFormat: 'structured' | 'simple' | 'custom';
  sourceLabel: string;
  destinationLabel: string;
  generatedAt: Date;
}

export interface PatchPanel {
  id: string;
  name: string;
  rackId: string;
  positionU: number;
  portCount: number;
  ports: PatchPanelPort[];
}

export interface PatchPanelPort {
  portNumber: number;
  label: string;
  connectedTo?: string; // Device ID
  cableId?: string;
  status: 'available' | 'in-use' | 'reserved' | 'damaged';
  notes?: string;
}

export interface CablePath {
  connectionId: string;
  segments: CableSegment[];
  totalLength_ft: number;
  slackAllowance_ft: number;
  recommendedLength_ft: number;
}

export interface CableSegment {
  type: 'horizontal' | 'vertical' | 'service-loop';
  length_ft: number;
  description: string;
}

export interface CableInventory {
  cableType: Connection['cable_type'];
  length_ft: number;
  quantity: number;
  color?: string;
  inStock: boolean;
}

/**
 * Generate a structured cable label based on connection details
 */
export function generateCableLabel(
  connection: Connection,
  sourceDevice: Device,
  destDevice: Device,
  format: 'structured' | 'simple' | 'custom' = 'structured',
  customTemplate?: string
): CableLabel {
  let sourceLabel = '';
  let destinationLabel = '';

  switch (format) {
    case 'structured':
      // Format: RACK-DEVICE-PORT
      sourceLabel = `${sourceDevice.rack_config_id.substring(0, 4).toUpperCase()}-${sourceDevice.name.substring(0, 8).toUpperCase()}-P${connection.source_port}`;
      destinationLabel = `${destDevice.rack_config_id.substring(0, 4).toUpperCase()}-${destDevice.name.substring(0, 8).toUpperCase()}-P${connection.destination_port}`;
      break;

    case 'simple':
      // Format: DEVICE:PORT
      sourceLabel = `${sourceDevice.name}:${connection.source_port}`;
      destinationLabel = `${destDevice.name}:${connection.destination_port}`;
      break;

    case 'custom':
      if (customTemplate) {
        sourceLabel = customTemplate
          .replace('{rack}', sourceDevice.rack_config_id)
          .replace('{device}', sourceDevice.name)
          .replace('{port}', connection.source_port);
        destinationLabel = customTemplate
          .replace('{rack}', destDevice.rack_config_id)
          .replace('{device}', destDevice.name)
          .replace('{port}', connection.destination_port);
      } else {
        // Fall back to simple
        sourceLabel = `${sourceDevice.name}:${connection.source_port}`;
        destinationLabel = `${destDevice.name}:${connection.destination_port}`;
      }
      break;
  }

  return {
    id: `label-${connection.id}`,
    connectionId: connection.id,
    labelFormat: format,
    sourceLabel,
    destinationLabel,
    generatedAt: new Date(),
  };
}

/**
 * Calculate cable length with path segments
 */
export function calculateCableLength(
  sourceDevice: Device,
  destDevice: Device,
  pathType: 'direct' | 'overhead' | 'underfloor' = 'overhead'
): CablePath {
  const segments: CableSegment[] = [];

  // Vertical distance (U positions)
  const verticalDistance_u = Math.abs(
    sourceDevice.position_u - destDevice.position_u
  );
  const verticalLength_ft = (verticalDistance_u * 1.75) / 12; // 1.75" per U, convert to feet

  if (verticalDistance_u > 0) {
    segments.push({
      type: 'vertical',
      length_ft: verticalLength_ft,
      description: `Vertical run: ${verticalDistance_u}U`,
    });
  }

  // Horizontal distance (estimate based on rack depth and spacing)
  let horizontalLength_ft = 0;

  if (sourceDevice.rack_config_id === destDevice.rack_config_id) {
    // Same rack - minimal horizontal
    horizontalLength_ft = 2; // 2 feet for cable management within rack
  } else {
    // Different racks - estimate 6 feet per rack spacing
    horizontalLength_ft = 6;
  }

  segments.push({
    type: 'horizontal',
    length_ft: horizontalLength_ft,
    description:
      sourceDevice.rack_config_id === destDevice.rack_config_id
        ? 'Within rack'
        : 'Between racks',
  });

  // Add service loop (10% of total length)
  const totalBase = verticalLength_ft + horizontalLength_ft;
  const serviceLoop = totalBase * 0.1;

  segments.push({
    type: 'service-loop',
    length_ft: serviceLoop,
    description: 'Service loop allowance',
  });

  // Path type adjustments
  let pathMultiplier = 1;
  if (pathType === 'overhead') {
    pathMultiplier = 1.2; // 20% extra for overhead cable trays
  } else if (pathType === 'underfloor') {
    pathMultiplier = 1.15; // 15% extra for underfloor routing
  }

  const totalLength_ft = totalBase * pathMultiplier;
  const slackAllowance_ft = totalLength_ft * 0.1; // 10% slack
  const recommendedLength_ft = totalLength_ft + slackAllowance_ft;

  return {
    connectionId: `${sourceDevice.id}-${destDevice.id}`,
    segments,
    totalLength_ft: parseFloat(totalLength_ft.toFixed(2)),
    slackAllowance_ft: parseFloat(slackAllowance_ft.toFixed(2)),
    recommendedLength_ft: parseFloat(recommendedLength_ft.toFixed(2)),
  };
}

/**
 * Create a patch panel configuration
 */
export function createPatchPanel(
  name: string,
  rackId: string,
  positionU: number,
  portCount: 24 | 48 | 96 = 24
): PatchPanel {
  const ports: PatchPanelPort[] = [];

  for (let i = 1; i <= portCount; i++) {
    ports.push({
      portNumber: i,
      label: `Port ${i}`,
      status: 'available',
    });
  }

  return {
    id: `pp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    rackId,
    positionU,
    portCount,
    ports,
  };
}

/**
 * Map a device to a patch panel port
 */
export function mapToPatchPanel(
  patchPanel: PatchPanel,
  portNumber: number,
  deviceId: string,
  cableId: string,
  label?: string
): PatchPanel {
  const updatedPorts = patchPanel.ports.map((port) => {
    if (port.portNumber === portNumber) {
      return {
        ...port,
        connectedTo: deviceId,
        cableId,
        label: label || port.label,
        status: 'in-use' as const,
      };
    }
    return port;
  });

  return {
    ...patchPanel,
    ports: updatedPorts,
  };
}

/**
 * Get available ports on a patch panel
 */
export function getAvailablePorts(patchPanel: PatchPanel): PatchPanelPort[] {
  return patchPanel.ports.filter((port) => port.status === 'available');
}

/**
 * Generate a cable management report
 */
export function generateCableReport(
  connections: Connection[],
  _devices: Device[]
): string {
  const cablesByType: Record<string, number> = {};
  let totalCables = 0;

  connections.forEach((conn) => {
    const type = conn.cable_type;
    cablesByType[type] = (cablesByType[type] || 0) + 1;
    totalCables++;
  });

  const report = `
# Cable Management Report

## Summary
- Total Connections: ${totalCables}

## Cables by Type
${Object.entries(cablesByType)
  .map(([type, count]) => `- ${type.toUpperCase()}: ${count}`)
  .join('\n')}

## Cable Inventory Needed
${Object.entries(cablesByType)
  .map(([type, count]) => {
    const avgLength = 10; // Assume 10ft average
    return `- ${type.toUpperCase()}: ${count} cables (est. ${count * avgLength}ft total)`;
  })
  .join('\n')}
`;

  return report.trim();
}

/**
 * Generate a comprehensive cable schedule (spreadsheet-ready)
 */
export function generateCableSchedule(
  connections: Connection[],
  devices: Device[]
): Array<{
  cableId: string;
  sourceDevice: string;
  sourcePort: string;
  destDevice: string;
  destPort: string;
  cableType: string;
  length_ft?: number;
  label: string;
}> {
  return connections.map((conn) => {
    const sourceDevice = devices.find((d) => d.id === conn.source_device_id);
    const destDevice = devices.find((d) => d.id === conn.destination_device_id);

    const label =
      sourceDevice && destDevice
        ? generateCableLabel(conn, sourceDevice, destDevice, 'simple')
        : { sourceLabel: '', destinationLabel: '' };

    return {
      cableId: conn.id,
      sourceDevice: sourceDevice?.name || 'Unknown',
      sourcePort: conn.source_port,
      destDevice: destDevice?.name || 'Unknown',
      destPort: conn.destination_port,
      cableType: conn.cable_type,
      length_ft: conn.cable_length_ft,
      label: `${label.sourceLabel} → ${label.destinationLabel}`,
    };
  });
}

/**
 * Calculate total cable inventory requirements
 */
export function calculateCableInventory(
  connections: Connection[],
  devices: Device[]
): CableInventory[] {
  const inventory: Record<
    string,
    { totalLength: number; count: number; connections: Connection[] }
  > = {};

  connections.forEach((conn) => {
    const type = conn.cable_type;
    const sourceDevice = devices.find((d) => d.id === conn.source_device_id);
    const destDevice = devices.find((d) => d.id === conn.destination_device_id);

    let length = conn.cable_length_ft || 0;

    // Calculate length if not specified
    if (!length && sourceDevice && destDevice) {
      const cablePath = calculateCableLength(sourceDevice, destDevice);
      length = cablePath.recommendedLength_ft;
    }

    if (!inventory[type]) {
      inventory[type] = { totalLength: 0, count: 0, connections: [] };
    }

    inventory[type].totalLength += length;
    inventory[type].count += 1;
    inventory[type].connections.push(conn);
  });

  return Object.entries(inventory).map(([cableType, data]) => ({
    cableType: cableType as Connection['cable_type'],
    length_ft: parseFloat(data.totalLength.toFixed(2)),
    quantity: data.count,
    inStock: false,
  }));
}

/**
 * Suggest cable colors for organization
 */
export function suggestCableColors(connection: Connection): {
  color: string;
  reason: string;
} {
  const vlan = connection.vlan;
  const cableType = connection.cable_type;

  // VLAN-based coloring
  if (vlan) {
    const vlanNum = parseInt(vlan, 10);
    if (vlanNum >= 1 && vlanNum <= 10) {
      return { color: 'blue', reason: 'Management VLAN (1-10)' };
    } else if (vlanNum >= 100 && vlanNum <= 199) {
      return { color: 'green', reason: 'User VLAN (100-199)' };
    } else if (vlanNum >= 200 && vlanNum <= 299) {
      return { color: 'yellow', reason: 'Guest VLAN (200-299)' };
    } else if (vlanNum >= 300 && vlanNum <= 399) {
      return { color: 'orange', reason: 'IoT/Device VLAN (300-399)' };
    }
  }

  // Cable type-based coloring
  if (cableType.includes('fiber')) {
    return { color: 'yellow', reason: 'Fiber optic cable' };
  } else if (cableType === 'power') {
    return { color: 'black', reason: 'Power cable' };
  } else if (cableType.includes('cat6') || cableType.includes('cat7')) {
    return { color: 'blue', reason: 'High-speed ethernet' };
  }

  return { color: 'gray', reason: 'Standard ethernet' };
}

/**
 * Validate cable type compatibility with ports
 */
export function validateCableCompatibility(
  cableType: Connection['cable_type'],
  sourcePortType: string,
  destPortType: string
): { compatible: boolean; warning?: string } {
  const fiberCables = ['fiber_om3', 'fiber_om4', 'fiber_sm', 'sfp', 'sfp_plus', 'qsfp', 'qsfp28'];

  const isFiberCable = fiberCables.includes(cableType);
  const sourceIsFiber =
    sourcePortType.includes('sfp') ||
    sourcePortType.includes('qsfp') ||
    sourcePortType.includes('fiber');
  const destIsFiber =
    destPortType.includes('sfp') ||
    destPortType.includes('qsfp') ||
    destPortType.includes('fiber');

  if (isFiberCable && (!sourceIsFiber || !destIsFiber)) {
    return {
      compatible: false,
      warning: 'Fiber cable requires fiber-capable ports on both ends',
    };
  }

  if (!isFiberCable && cableType !== 'power') {
    // Copper cable
    if (sourceIsFiber || destIsFiber) {
      return {
        compatible: false,
        warning: 'Copper cable not compatible with fiber-only ports',
      };
    }
  }

  return { compatible: true };
}

/**
 * Export cable labels as CSV for printing
 */
export function exportCableLabelsCSV(labels: CableLabel[]): string {
  const header = 'Cable ID,Source Label,Destination Label,Format,Generated At\n';
  const rows = labels
    .map(
      (label) =>
        `${label.connectionId},"${label.sourceLabel}","${label.destinationLabel}",${label.labelFormat},${label.generatedAt.toISOString()}`
    )
    .join('\n');

  return header + rows;
}

/**
 * Generate patch panel port mapping document
 */
export function generatePatchPanelMap(patchPanel: PatchPanel): string {
  const inUsePorts = patchPanel.ports.filter((p) => p.status === 'in-use');
  const availablePorts = patchPanel.ports.filter((p) => p.status === 'available');

  const report = `
# Patch Panel Map: ${patchPanel.name}

## Details
- Rack: ${patchPanel.rackId}
- Position: ${patchPanel.positionU}U
- Total Ports: ${patchPanel.portCount}
- In Use: ${inUsePorts.length}
- Available: ${availablePorts.length}

## Port Assignments
${inUsePorts
  .map(
    (port) => `
### Port ${port.portNumber} - ${port.label}
- Status: ${port.status}
- Connected To: ${port.connectedTo || 'N/A'}
- Cable ID: ${port.cableId || 'N/A'}
${port.notes ? `- Notes: ${port.notes}` : ''}
`
  )
  .join('\n')}

## Available Ports
${availablePorts.map((port) => `- Port ${port.portNumber}`).join('\n')}
`;

  return report.trim();
}
