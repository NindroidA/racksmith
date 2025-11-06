import { Device, RackConfiguration } from '../types/entities';

export interface RackTemplate {
  id: string;
  name: string;
  description: string;
  category: 'networking' | 'compute' | 'storage' | 'mixed' | 'custom';
  size_u: number;
  devices: Omit<Device, 'id' | 'rack_config_id'>[];
  tags?: string[];
  created_date?: string;
}

// Predefined rack templates
export const defaultTemplates: RackTemplate[] = [
  {
    id: 'network-core-42u',
    name: 'Network Core - 42U',
    description: 'Standard network core setup with redundant routers, switches, and UPS',
    category: 'networking',
    size_u: 42,
    tags: ['network', 'core', 'redundant'],
    devices: [
      {
        name: 'Core Router 1',
        manufacturer: 'cisco',
        model: 'ISR4451',
        device_type: 'router',
        size_u: 2,
        position_u: 1,
        port_count: 4,
        power_watts: 300,
      },
      {
        name: 'Core Router 2',
        manufacturer: 'cisco',
        model: 'ISR4451',
        device_type: 'router',
        size_u: 2,
        position_u: 4,
        port_count: 4,
        power_watts: 300,
      },
      {
        name: 'Core Switch 1',
        manufacturer: 'cisco',
        model: 'C9300-48P',
        device_type: 'switch',
        size_u: 1,
        position_u: 7,
        port_count: 48,
        power_watts: 350,
      },
      {
        name: 'Core Switch 2',
        manufacturer: 'cisco',
        model: 'C9300-48P',
        device_type: 'switch',
        size_u: 1,
        position_u: 9,
        port_count: 48,
        power_watts: 350,
      },
      {
        name: 'Patch Panel',
        manufacturer: 'custom',
        device_type: 'patch_panel',
        size_u: 1,
        position_u: 11,
        port_count: 48,
      },
      {
        name: 'UPS',
        manufacturer: 'tripplite',
        device_type: 'ups',
        size_u: 3,
        position_u: 39,
        power_watts: 2000,
      },
    ],
  },
  {
    id: 'compute-cluster-42u',
    name: 'Compute Cluster - 42U',
    description: 'High-density compute cluster with 8 servers and management infrastructure',
    category: 'compute',
    size_u: 42,
    tags: ['compute', 'cluster', 'high-density'],
    devices: [
      {
        name: 'Management Switch',
        manufacturer: 'cisco',
        model: 'C9300-24P',
        device_type: 'switch',
        size_u: 1,
        position_u: 1,
        port_count: 24,
        power_watts: 250,
      },
      {
        name: 'Compute Server 1',
        manufacturer: 'dell',
        model: 'PowerEdge R640',
        device_type: 'server',
        size_u: 1,
        position_u: 3,
        port_count: 4,
        power_watts: 750,
      },
      {
        name: 'Compute Server 2',
        manufacturer: 'dell',
        model: 'PowerEdge R640',
        device_type: 'server',
        size_u: 1,
        position_u: 5,
        port_count: 4,
        power_watts: 750,
      },
      {
        name: 'Compute Server 3',
        manufacturer: 'dell',
        model: 'PowerEdge R640',
        device_type: 'server',
        size_u: 1,
        position_u: 7,
        port_count: 4,
        power_watts: 750,
      },
      {
        name: 'Compute Server 4',
        manufacturer: 'dell',
        model: 'PowerEdge R640',
        device_type: 'server',
        size_u: 1,
        position_u: 9,
        port_count: 4,
        power_watts: 750,
      },
      {
        name: 'Compute Server 5',
        manufacturer: 'dell',
        model: 'PowerEdge R640',
        device_type: 'server',
        size_u: 1,
        position_u: 11,
        port_count: 4,
        power_watts: 750,
      },
      {
        name: 'Compute Server 6',
        manufacturer: 'dell',
        model: 'PowerEdge R640',
        device_type: 'server',
        size_u: 1,
        position_u: 13,
        port_count: 4,
        power_watts: 750,
      },
      {
        name: 'Compute Server 7',
        manufacturer: 'dell',
        model: 'PowerEdge R640',
        device_type: 'server',
        size_u: 1,
        position_u: 15,
        port_count: 4,
        power_watts: 750,
      },
      {
        name: 'Compute Server 8',
        manufacturer: 'dell',
        model: 'PowerEdge R640',
        device_type: 'server',
        size_u: 1,
        position_u: 17,
        port_count: 4,
        power_watts: 750,
      },
      {
        name: 'PDU 1',
        manufacturer: 'tripplite',
        device_type: 'pdu',
        size_u: 0,
        position_u: 1,
      },
      {
        name: 'PDU 2',
        manufacturer: 'tripplite',
        device_type: 'pdu',
        size_u: 0,
        position_u: 1,
      },
    ],
  },
  {
    id: 'storage-nas-42u',
    name: 'Storage NAS - 42U',
    description: 'Network-attached storage setup with redundant controllers and disk shelves',
    category: 'storage',
    size_u: 42,
    tags: ['storage', 'nas', 'redundant'],
    devices: [
      {
        name: 'Storage Controller 1',
        manufacturer: 'dell',
        model: 'PowerVault ME4',
        device_type: 'storage',
        size_u: 2,
        position_u: 1,
        port_count: 8,
        power_watts: 500,
      },
      {
        name: 'Storage Controller 2',
        manufacturer: 'dell',
        model: 'PowerVault ME4',
        device_type: 'storage',
        size_u: 2,
        position_u: 4,
        port_count: 8,
        power_watts: 500,
      },
      {
        name: 'Disk Shelf 1',
        manufacturer: 'dell',
        device_type: 'storage',
        size_u: 4,
        position_u: 7,
      },
      {
        name: 'Disk Shelf 2',
        manufacturer: 'dell',
        device_type: 'storage',
        size_u: 4,
        position_u: 12,
      },
      {
        name: 'Disk Shelf 3',
        manufacturer: 'dell',
        device_type: 'storage',
        size_u: 4,
        position_u: 17,
      },
      {
        name: 'Management Switch',
        manufacturer: 'cisco',
        device_type: 'switch',
        size_u: 1,
        position_u: 22,
        port_count: 24,
        power_watts: 200,
      },
    ],
  },
  {
    id: 'edge-networking-24u',
    name: 'Edge Networking - 24U',
    description: 'Edge site network setup with firewall, switches, and access point controller',
    category: 'networking',
    size_u: 24,
    tags: ['network', 'edge', 'security'],
    devices: [
      {
        name: 'Edge Firewall',
        manufacturer: 'cisco',
        model: 'ASA 5516-X',
        device_type: 'firewall',
        size_u: 1,
        position_u: 1,
        port_count: 12,
        power_watts: 250,
      },
      {
        name: 'Access Switch 1',
        manufacturer: 'cisco',
        model: 'C2960X-24PS',
        device_type: 'switch',
        size_u: 1,
        position_u: 3,
        port_count: 24,
        power_watts: 250,
      },
      {
        name: 'Access Switch 2',
        manufacturer: 'cisco',
        model: 'C2960X-24PS',
        device_type: 'switch',
        size_u: 1,
        position_u: 5,
        port_count: 24,
        power_watts: 250,
      },
      {
        name: 'Patch Panel',
        manufacturer: 'custom',
        device_type: 'patch_panel',
        size_u: 1,
        position_u: 7,
        port_count: 48,
      },
      {
        name: 'UPS',
        manufacturer: 'tripplite',
        device_type: 'ups',
        size_u: 2,
        position_u: 22,
        power_watts: 1500,
      },
    ],
  },
];

/**
 * Get all available rack templates
 */
export function getTemplates(): RackTemplate[] {
  return defaultTemplates;
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): RackTemplate | undefined {
  return defaultTemplates.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: RackTemplate['category']): RackTemplate[] {
  return defaultTemplates.filter(t => t.category === category);
}

/**
 * Apply template to create a new rack configuration
 */
export function applyTemplate(
  template: RackTemplate,
  rackId: string,
  customName?: string
): { rack: RackConfiguration; devices: Device[] } {
  const rack: RackConfiguration = {
    id: rackId,
    name: customName || template.name,
    size_u: template.size_u,
    description: template.description,
    color_tag: 'blue',
    created_date: new Date().toISOString(),
  };

  const devices: Device[] = template.devices.map((deviceTemplate, index) => ({
    ...deviceTemplate,
    id: `${rackId}-device-${index}`,
    rack_config_id: rackId,
  }));

  return { rack, devices };
}

/**
 * Create custom template from existing rack and devices
 */
export function createTemplateFromRack(
  rack: RackConfiguration,
  devices: Device[],
  name: string,
  description: string,
  category: RackTemplate['category']
): RackTemplate {
  const templateDevices: Omit<Device, 'id' | 'rack_config_id'>[] = devices.map(device => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, rack_config_id, ...rest } = device;
    return rest;
  });

  return {
    id: `custom-${Date.now()}`,
    name,
    description,
    category,
    size_u: rack.size_u,
    devices: templateDevices,
    tags: ['custom'],
    created_date: new Date().toISOString(),
  };
}

/**
 * Validate template compatibility with target rack size
 */
export function validateTemplate(
  template: RackTemplate,
  targetRackSize: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (template.size_u > targetRackSize) {
    errors.push(`Template requires ${template.size_u}U but target rack is only ${targetRackSize}U`);
  }

  // Check if all devices fit
  const maxPosition = Math.max(...template.devices.map(d => d.position_u + d.size_u - 1));
  if (maxPosition > targetRackSize) {
    errors.push(`Template devices exceed rack capacity (max position: ${maxPosition}U)`);
  }

  // Check for device collisions
  const occupiedUnits = new Set<number>();
  template.devices.forEach(device => {
    for (let u = device.position_u; u < device.position_u + device.size_u; u++) {
      if (occupiedUnits.has(u)) {
        errors.push(`Device collision detected at position ${u}U`);
      }
      occupiedUnits.add(u);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get template statistics
 */
export function getTemplateStats(template: RackTemplate) {
  const deviceCount = template.devices.length;
  const totalU = template.devices.reduce((sum, d) => sum + d.size_u, 0);
  const utilizationPercent = (totalU / template.size_u) * 100;
  const totalPower = template.devices.reduce((sum, d) => sum + (d.power_watts || 0), 0);
  const deviceTypes = [...new Set(template.devices.map(d => d.device_type))];

  return {
    deviceCount,
    totalU,
    utilizationPercent: Math.round(utilizationPercent),
    totalPower,
    deviceTypes,
    availableU: template.size_u - totalU,
  };
}
