import { Connection, Device, RackConfiguration, StandaloneDevice, TopologyConnection } from '../types/entities';

export interface TopologyNode {
  id: string;
  label: string;
  type: 'device' | 'rack' | 'standalone';
  deviceType?: Device['device_type'] | StandaloneDevice['device_type'];
  x: number;
  y: number;
  connections: string[]; // IDs of connected nodes
  metadata?: {
    manufacturer?: string;
    model?: string;
    portCount?: number;
    ipAddress?: string;
    rackId?: string;
  };
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  type: 'connection' | 'topology';
  connectionType?: Connection['cable_type'] | TopologyConnection['connection_type'];
  label?: string;
  bandwidth?: string;
  vlan?: string;
}

export interface NetworkTopology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  layers: {
    core: TopologyNode[];
    distribution: TopologyNode[];
    access: TopologyNode[];
    endpoint: TopologyNode[];
  };
}

/**
 * Generate network topology from devices and connections
 */
export function generateNetworkTopology(
  racks: RackConfiguration[],
  devices: Device[],
  connections: Connection[],
  standaloneDevices: StandaloneDevice[] = [],
  topologyConnections: TopologyConnection[] = []
): NetworkTopology {
  const nodes: TopologyNode[] = [];
  const edges: TopologyEdge[] = [];

  // Create nodes from devices
  devices.forEach((device, index) => {
    nodes.push({
      id: device.id,
      label: device.name,
      type: 'device',
      deviceType: device.device_type,
      x: (index % 5) * 200,
      y: Math.floor(index / 5) * 150,
      connections: [],
      metadata: {
        manufacturer: device.manufacturer,
        model: device.model,
        portCount: device.port_count,
        rackId: device.rack_config_id,
      },
    });
  });

  // Create nodes from standalone devices
  standaloneDevices.forEach(device => {
    nodes.push({
      id: device.id,
      label: device.name,
      type: 'standalone',
      deviceType: device.device_type,
      x: device.x_position,
      y: device.y_position,
      connections: [],
      metadata: {
        manufacturer: device.manufacturer,
        model: device.model,
        portCount: device.port_count,
      },
    });
  });

  // Create edges from connections
  connections.forEach(connection => {
    const sourceNode = nodes.find(n => n.id === connection.source_device_id);
    const targetNode = nodes.find(n => n.id === connection.destination_device_id);

    if (sourceNode && targetNode) {
      sourceNode.connections.push(targetNode.id);
      targetNode.connections.push(sourceNode.id);

      edges.push({
        id: connection.id,
        source: connection.source_device_id,
        target: connection.destination_device_id,
        type: 'connection',
        connectionType: connection.cable_type,
        label: `${connection.source_port} → ${connection.destination_port}`,
        vlan: connection.vlan,
      });
    }
  });

  // Create edges from topology connections
  topologyConnections.forEach(connection => {
    edges.push({
      id: connection.id,
      source: connection.source_device_id,
      target: connection.destination_device_id,
      type: 'topology',
      connectionType: connection.connection_type,
      bandwidth: connection.bandwidth,
      label: connection.description,
    });
  });

  // Categorize nodes into network layers
  const layers = categorizeIntoLayers(nodes);

  return { nodes, edges, layers };
}

/**
 * Categorize devices into network layers (core, distribution, access, endpoint)
 */
function categorizeIntoLayers(nodes: TopologyNode[]) {
  const core: TopologyNode[] = [];
  const distribution: TopologyNode[] = [];
  const access: TopologyNode[] = [];
  const endpoint: TopologyNode[] = [];

  nodes.forEach(node => {
    const deviceType = node.deviceType;
    
    // Core layer - high-capacity routers and core switches
    if (deviceType === 'router' || deviceType === 'firewall' || 
        (deviceType === 'switch' && node.label.toLowerCase().includes('core'))) {
      core.push(node);
    }
    // Distribution layer - distribution switches, load balancers
    else if (deviceType === 'load_balancer' || 
             (deviceType === 'switch' && (node.label.toLowerCase().includes('distribution') || 
                                          node.label.toLowerCase().includes('dist')))) {
      distribution.push(node);
    }
    // Access layer - access switches, patch panels
    else if (deviceType === 'switch' || deviceType === 'patch_panel' || deviceType === 'fiber_switch') {
      access.push(node);
    }
    // Endpoint layer - servers, storage, other devices
    else {
      endpoint.push(node);
    }
  });

  return { core, distribution, access, endpoint };
}

/**
 * Auto-layout topology using hierarchical positioning
 */
export function autoLayoutTopology(topology: NetworkTopology): NetworkTopology {
  const { layers } = topology;
  const layerHeight = 200;
  const startY = 50;

  // Position core layer at top
  positionLayer(layers.core, startY);
  
  // Position distribution layer below core
  positionLayer(layers.distribution, startY + layerHeight);
  
  // Position access layer below distribution
  positionLayer(layers.access, startY + layerHeight * 2);
  
  // Position endpoint layer at bottom
  positionLayer(layers.endpoint, startY + layerHeight * 3);

  return topology;
}

function positionLayer(nodes: TopologyNode[], y: number) {
  const spacing = 180;
  const startX = 100;

  nodes.forEach((node, index) => {
    node.x = startX + (index * spacing);
    node.y = y;
  });
}

/**
 * Calculate shortest path between two nodes
 */
export function findPath(
  topology: NetworkTopology,
  sourceId: string,
  targetId: string
): TopologyNode[] | null {
  const visited = new Set<string>();
  const queue: { nodeId: string; path: TopologyNode[] }[] = [];

  const sourceNode = topology.nodes.find(n => n.id === sourceId);
  if (!sourceNode) return null;

  queue.push({ nodeId: sourceId, path: [sourceNode] });
  visited.add(sourceId);

  while (queue.length > 0) {
    const { nodeId, path } = queue.shift()!;

    if (nodeId === targetId) {
      return path;
    }

    const currentNode = topology.nodes.find(n => n.id === nodeId);
    if (!currentNode) continue;

    currentNode.connections.forEach(connectedId => {
      if (!visited.has(connectedId)) {
        visited.add(connectedId);
        const connectedNode = topology.nodes.find(n => n.id === connectedId);
        if (connectedNode) {
          queue.push({
            nodeId: connectedId,
            path: [...path, connectedNode],
          });
        }
      }
    });
  }

  return null; // No path found
}

/**
 * Detect network loops/cycles
 */
export function detectLoops(topology: NetworkTopology): string[][] {
  const loops: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string, path: string[]): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const node = topology.nodes.find(n => n.id === nodeId);
    if (!node) return;

    node.connections.forEach(connectedId => {
      if (!visited.has(connectedId)) {
        dfs(connectedId, [...path]);
      } else if (recursionStack.has(connectedId)) {
        // Loop detected
        const loopStartIndex = path.indexOf(connectedId);
        const loop = path.slice(loopStartIndex);
        loops.push([...loop, connectedId]);
      }
    });

    recursionStack.delete(nodeId);
  }

  topology.nodes.forEach(node => {
    if (!visited.has(node.id)) {
      dfs(node.id, []);
    }
  });

  return loops;
}

/**
 * Find all devices with no connections (isolated devices)
 */
export function findIsolatedDevices(topology: NetworkTopology): TopologyNode[] {
  return topology.nodes.filter(node => node.connections.length === 0);
}

/**
 * Calculate network statistics
 */
export function getTopologyStats(topology: NetworkTopology) {
  const totalDevices = topology.nodes.length;
  const totalConnections = topology.edges.length;
  const isolatedDevices = findIsolatedDevices(topology).length;
  const loops = detectLoops(topology);

  const deviceTypeCount: Record<string, number> = {};
  topology.nodes.forEach(node => {
    const type = node.deviceType || 'unknown';
    deviceTypeCount[type] = (deviceTypeCount[type] || 0) + 1;
  });

  const connectionTypeCount: Record<string, number> = {};
  topology.edges.forEach(edge => {
    const type = edge.connectionType || 'unknown';
    connectionTypeCount[type] = (connectionTypeCount[type] || 0) + 1;
  });

  return {
    totalDevices,
    totalConnections,
    isolatedDevices,
    loopCount: loops.length,
    layers: {
      core: topology.layers.core.length,
      distribution: topology.layers.distribution.length,
      access: topology.layers.access.length,
      endpoint: topology.layers.endpoint.length,
    },
    deviceTypeCount,
    connectionTypeCount,
  };
}

/**
 * Generate Mermaid diagram syntax for topology
 */
export function generateMermaidDiagram(topology: NetworkTopology): string {
  let diagram = 'graph TB\n';

  // Add nodes with styling based on type
  topology.nodes.forEach(node => {
    const shape = getNodeShape(node.deviceType);
    const label = `${node.label}`;
    diagram += `  ${node.id}${shape}${label}${shape.replace('[', ']').replace('(', ')')}\n`;
  });

  // Add edges
  topology.edges.forEach(edge => {
    const label = edge.label ? `|${edge.label}|` : '';
    diagram += `  ${edge.source} ${label}-->${label} ${edge.target}\n`;
  });

  return diagram;
}

function getNodeShape(deviceType?: string): string {
  switch (deviceType) {
    case 'router':
    case 'firewall':
      return '{';
    case 'switch':
    case 'fiber_switch':
      return '[';
    case 'server':
    case 'storage':
      return '[(';
    default:
      return '(';
  }
}

/**
 * Export topology as SVG string (simplified representation)
 */
export function exportTopologyAsSVG(topology: NetworkTopology): string {
  const width = Math.max(...topology.nodes.map(n => n.x)) + 200;
  const height = Math.max(...topology.nodes.map(n => n.y)) + 200;

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
  
  // Add edges
  topology.edges.forEach(edge => {
    const source = topology.nodes.find(n => n.id === edge.source);
    const target = topology.nodes.find(n => n.id === edge.target);
    
    if (source && target) {
      svg += `  <line x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" stroke="#888" stroke-width="2"/>\n`;
    }
  });

  // Add nodes
  topology.nodes.forEach(node => {
    const color = getNodeColor(node.deviceType);
    svg += `  <circle cx="${node.x}" cy="${node.y}" r="30" fill="${color}" stroke="#fff" stroke-width="2"/>\n`;
    svg += `  <text x="${node.x}" y="${node.y + 50}" text-anchor="middle" fill="#fff" font-size="12">${node.label}</text>\n`;
  });

  svg += '</svg>';
  return svg;
}

function getNodeColor(deviceType?: string): string {
  switch (deviceType) {
    case 'router': return '#3b82f6';
    case 'switch': return '#8b5cf6';
    case 'firewall': return '#ef4444';
    case 'server': return '#10b981';
    case 'storage': return '#f59e0b';
    default: return '#6b7280';
  }
}
