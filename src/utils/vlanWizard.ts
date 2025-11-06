export interface VLANConfiguration {
  id: number;
  name: string;
  description?: string;
  subnet?: string;
  gateway?: string;
  purpose: 'management' | 'data' | 'voice' | 'guest' | 'storage' | 'iot' | 'dmz' | 'custom';
  devices: string[]; // Device IDs
  ports: string[]; // Port IDs
  tagging: 'tagged' | 'untagged';
}

export interface VLANTemplate {
  id: string;
  name: string;
  description: string;
  category: 'small-business' | 'enterprise' | 'data-center' | 'campus' | 'custom';
  vlans: Omit<VLANConfiguration, 'devices' | 'ports'>[];
}

// Predefined VLAN templates
export const vlanTemplates: VLANTemplate[] = [
  {
    id: 'small-business',
    name: 'Small Business',
    description: 'Basic VLAN setup for small offices (Management, Data, Guest)',
    category: 'small-business',
    vlans: [
      {
        id: 1,
        name: 'Management',
        description: 'Network management and admin access',
        subnet: '192.168.1.0/24',
        gateway: '192.168.1.1',
        purpose: 'management',
        tagging: 'untagged',
      },
      {
        id: 10,
        name: 'Data',
        description: 'General user data traffic',
        subnet: '192.168.10.0/24',
        gateway: '192.168.10.1',
        purpose: 'data',
        tagging: 'untagged',
      },
      {
        id: 99,
        name: 'Guest',
        description: 'Guest WiFi network',
        subnet: '192.168.99.0/24',
        gateway: '192.168.99.1',
        purpose: 'guest',
        tagging: 'untagged',
      },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Comprehensive VLAN setup for enterprise networks',
    category: 'enterprise',
    vlans: [
      {
        id: 1,
        name: 'Management',
        description: 'Network device management',
        subnet: '10.0.1.0/24',
        gateway: '10.0.1.1',
        purpose: 'management',
        tagging: 'tagged',
      },
      {
        id: 10,
        name: 'Data',
        description: 'Corporate data network',
        subnet: '10.0.10.0/24',
        gateway: '10.0.10.1',
        purpose: 'data',
        tagging: 'untagged',
      },
      {
        id: 20,
        name: 'Voice',
        description: 'VoIP telephony',
        subnet: '10.0.20.0/24',
        gateway: '10.0.20.1',
        purpose: 'voice',
        tagging: 'tagged',
      },
      {
        id: 30,
        name: 'Guest',
        description: 'Guest network access',
        subnet: '10.0.30.0/24',
        gateway: '10.0.30.1',
        purpose: 'guest',
        tagging: 'untagged',
      },
      {
        id: 40,
        name: 'DMZ',
        description: 'Demilitarized zone for public-facing servers',
        subnet: '10.0.40.0/24',
        gateway: '10.0.40.1',
        purpose: 'dmz',
        tagging: 'tagged',
      },
    ],
  },
  {
    id: 'data-center',
    name: 'Data Center',
    description: 'Data center VLAN configuration with storage and management separation',
    category: 'data-center',
    vlans: [
      {
        id: 1,
        name: 'Management',
        description: 'Out-of-band management',
        subnet: '172.16.1.0/24',
        gateway: '172.16.1.1',
        purpose: 'management',
        tagging: 'untagged',
      },
      {
        id: 10,
        name: 'Production',
        description: 'Production server network',
        subnet: '172.16.10.0/24',
        gateway: '172.16.10.1',
        purpose: 'data',
        tagging: 'tagged',
      },
      {
        id: 20,
        name: 'Storage',
        description: 'iSCSI and NAS storage network',
        subnet: '172.16.20.0/24',
        gateway: '172.16.20.1',
        purpose: 'storage',
        tagging: 'tagged',
      },
      {
        id: 30,
        name: 'Backup',
        description: 'Backup and replication traffic',
        subnet: '172.16.30.0/24',
        gateway: '172.16.30.1',
        purpose: 'storage',
        tagging: 'tagged',
      },
      {
        id: 40,
        name: 'vMotion',
        description: 'VMware vMotion network',
        subnet: '172.16.40.0/24',
        gateway: '172.16.40.1',
        purpose: 'data',
        tagging: 'tagged',
      },
    ],
  },
];

/**
 * Get all VLAN templates
 */
export function getVLANTemplates(): VLANTemplate[] {
  return vlanTemplates;
}

/**
 * Get VLAN template by ID
 */
export function getVLANTemplateById(id: string): VLANTemplate | undefined {
  return vlanTemplates.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getVLANTemplatesByCategory(category: VLANTemplate['category']): VLANTemplate[] {
  return vlanTemplates.filter(t => t.category === category);
}

/**
 * Apply VLAN template to create configuration
 */
export function applyVLANTemplate(template: VLANTemplate): VLANConfiguration[] {
  return template.vlans.map(vlan => ({
    ...vlan,
    devices: [],
    ports: [],
  }));
}

/**
 * Validate VLAN ID (1-4094)
 */
export function validateVLANId(id: number): { isValid: boolean; error?: string } {
  if (id < 1 || id > 4094) {
    return { isValid: false, error: 'VLAN ID must be between 1 and 4094' };
  }
  if (id === 1002 || id === 1003 || id === 1004 || id === 1005) {
    return { isValid: false, error: 'VLAN IDs 1002-1005 are reserved for Token Ring and FDDI' };
  }
  return { isValid: true };
}

/**
 * Check for VLAN ID conflicts
 */
export function checkVLANConflicts(
  vlans: VLANConfiguration[],
  newVlan: Pick<VLANConfiguration, 'id' | 'name'>
): { hasConflict: boolean; conflicts: string[] } {
  const conflicts: string[] = [];

  vlans.forEach(vlan => {
    if (vlan.id === newVlan.id) {
      conflicts.push(`VLAN ID ${newVlan.id} is already used by "${vlan.name}"`);
    }
    if (vlan.name.toLowerCase() === newVlan.name.toLowerCase()) {
      conflicts.push(`VLAN name "${newVlan.name}" is already in use`);
    }
  });

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

/**
 * Generate switch configuration for VLANs (Cisco IOS syntax)
 */
export function generateCiscoVLANConfig(vlans: VLANConfiguration[]): string {
  let config = '! VLAN Configuration\n';
  config += '! Generated by RackSmith\n';
  config += '!\n';

  vlans.forEach(vlan => {
    config += `vlan ${vlan.id}\n`;
    config += ` name ${vlan.name}\n`;
    if (vlan.description) {
      config += ` description ${vlan.description}\n`;
    }
    config += '!\n';
  });

  config += '!\n! Interface Configuration\n';
  vlans.forEach(vlan => {
    if (vlan.gateway) {
      const vlanInterface = `interface Vlan${vlan.id}`;
      config += `${vlanInterface}\n`;
      if (vlan.description) {
        config += ` description ${vlan.description}\n`;
      }
      config += ` ip address ${vlan.gateway} ${getSubnetMaskFromCIDR(vlan.subnet)}\n`;
      config += ' no shutdown\n';
      config += '!\n';
    }
  });

  return config;
}

/**
 * Generate switch configuration for VLANs (HP/Aruba syntax)
 */
export function generateArubaVLANConfig(vlans: VLANConfiguration[]): string {
  let config = '; VLAN Configuration\n';
  config += '; Generated by RackSmith\n';
  config += ';\n';

  vlans.forEach(vlan => {
    config += `vlan ${vlan.id}\n`;
    config += `   name "${vlan.name}"\n`;
    if (vlan.tagging === 'untagged') {
      config += '   untagged 1-48\n';
    } else {
      config += '   tagged 1-48\n';
    }
    config += '   exit\n';
  });

  return config;
}

/**
 * Generate VLAN documentation
 */
export function generateVLANDocumentation(vlans: VLANConfiguration[]): string {
  let doc = '# VLAN Configuration Documentation\n\n';
  doc += '## VLAN Summary\n\n';
  doc += '| VLAN ID | Name | Purpose | Subnet | Gateway | Tagging |\n';
  doc += '|---------|------|---------|--------|---------|----------|\n';

  vlans.forEach(vlan => {
    doc += `| ${vlan.id} | ${vlan.name} | ${vlan.purpose} | ${vlan.subnet || '-'} | ${vlan.gateway || '-'} | ${vlan.tagging} |\n`;
  });

  doc += '\n## Detailed Configuration\n\n';

  vlans.forEach(vlan => {
    doc += `### VLAN ${vlan.id}: ${vlan.name}\n\n`;
    if (vlan.description) {
      doc += `**Description:** ${vlan.description}\n\n`;
    }
    doc += `**Purpose:** ${vlan.purpose}\n\n`;
    if (vlan.subnet) {
      doc += `**Subnet:** ${vlan.subnet}\n\n`;
    }
    if (vlan.gateway) {
      doc += `**Gateway:** ${vlan.gateway}\n\n`;
    }
    doc += `**Tagging:** ${vlan.tagging}\n\n`;
    doc += `**Devices:** ${vlan.devices.length}\n\n`;
    doc += `**Ports:** ${vlan.ports.length}\n\n`;
    doc += '---\n\n';
  });

  return doc;
}

/**
 * Calculate recommended VLAN scheme based on device count
 */
export function recommendVLANScheme(deviceCount: number, hasVoIP: boolean, hasGuest: boolean) {
  const recommendations: Partial<VLANConfiguration>[] = [];

  // Always recommend management VLAN
  recommendations.push({
    id: 1,
    name: 'Management',
    purpose: 'management',
    description: 'Network device management',
    tagging: 'tagged',
  });

  // Data VLAN for general traffic
  recommendations.push({
    id: 10,
    name: 'Data',
    purpose: 'data',
    description: 'General data traffic',
    tagging: 'untagged',
  });

  // VoIP VLAN if needed
  if (hasVoIP) {
    recommendations.push({
      id: 20,
      name: 'Voice',
      purpose: 'voice',
      description: 'VoIP telephony',
      tagging: 'tagged',
    });
  }

  // Guest VLAN if needed
  if (hasGuest) {
    recommendations.push({
      id: 99,
      name: 'Guest',
      purpose: 'guest',
      description: 'Guest network access',
      tagging: 'untagged',
    });
  }

  // For larger deployments, recommend additional segmentation
  if (deviceCount > 50) {
    recommendations.push({
      id: 30,
      name: 'Servers',
      purpose: 'data',
      description: 'Server farm network',
      tagging: 'tagged',
    });
  }

  if (deviceCount > 100) {
    recommendations.push({
      id: 40,
      name: 'Storage',
      purpose: 'storage',
      description: 'Storage network (iSCSI/NAS)',
      tagging: 'tagged',
    });
  }

  return recommendations;
}

/**
 * Helper to extract subnet mask from CIDR notation
 */
function getSubnetMaskFromCIDR(subnet?: string): string {
  if (!subnet) return '255.255.255.0';
  
  const cidr = parseInt(subnet.split('/')[1] || '24');
  const mask: number[] = [];
  
  for (let i = 0; i < 4; i++) {
    const bits = Math.max(0, Math.min(8, cidr - (i * 8)));
    mask.push((0xFF << (8 - bits)) & 0xFF);
  }
  
  return mask.join('.');
}

/**
 * Assign devices to VLANs based on device type
 */
export function autoAssignDevicesToVLANs(
  devices: Array<{ id: string; type: string; name: string }>,
  vlans: VLANConfiguration[]
): VLANConfiguration[] {
  const updatedVLANs = vlans.map(vlan => ({ ...vlan, devices: [...vlan.devices] }));

  devices.forEach(device => {
    // Find appropriate VLAN based on device type
    let targetVLAN: VLANConfiguration | undefined;

    if (device.type === 'router' || device.type === 'switch' || device.type === 'firewall') {
      targetVLAN = updatedVLANs.find(v => v.purpose === 'management');
    } else if (device.type === 'server' || device.type === 'storage') {
      targetVLAN = updatedVLANs.find(v => v.purpose === 'data' && v.name.toLowerCase().includes('server'));
      if (!targetVLAN) {
        targetVLAN = updatedVLANs.find(v => v.purpose === 'data');
      }
    } else if (device.name.toLowerCase().includes('voice') || device.name.toLowerCase().includes('phone')) {
      targetVLAN = updatedVLANs.find(v => v.purpose === 'voice');
    } else if (device.name.toLowerCase().includes('guest') || device.name.toLowerCase().includes('wifi')) {
      targetVLAN = updatedVLANs.find(v => v.purpose === 'guest');
    } else {
      targetVLAN = updatedVLANs.find(v => v.purpose === 'data');
    }

    if (targetVLAN && !targetVLAN.devices.includes(device.id)) {
      targetVLAN.devices.push(device.id);
    }
  });

  return updatedVLANs;
}
