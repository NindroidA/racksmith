import { validateIPAddress, validateSubnetMask } from './validators';

export interface IPScheme {
  networkAddress: string;
  subnetMask: string;
  cidr: number;
  firstUsable: string;
  lastUsable: string;
  broadcast: string;
  totalHosts: number;
  usableHosts: number;
  allocations: IPAllocation[];
}

export interface IPAllocation {
  id: string;
  deviceName: string;
  ipAddress: string;
  purpose: 'management' | 'data' | 'storage' | 'backup' | 'reserved' | 'gateway';
  vlan?: string;
  notes?: string;
}

export interface SubnetPlan {
  name: string;
  purpose: string;
  requiredHosts: number;
  subnet: IPScheme;
  vlanId?: number;
}

/**
 * Calculate network details from IP and subnet mask
 */
export function calculateSubnet(ip: string, subnetMask: string): IPScheme | null {
  // Validate inputs
  if (!validateIPAddress(ip).isValid || !validateSubnetMask(subnetMask).isValid) {
    return null;
  }

  const ipParts = ip.split('.').map(Number);
  const maskParts = subnetMask.split('.').map(Number);

  // Calculate network address
  const networkParts = ipParts.map((part, i) => part & (maskParts[i] || 0));
  const networkAddress = networkParts.join('.');

  // Calculate broadcast address
  const broadcastParts = networkParts.map((part, i) => part | (~(maskParts[i] || 0) & 255));
  const broadcast = broadcastParts.join('.');

  // Calculate first and last usable IPs
  const firstUsableParts = [...networkParts];
  firstUsableParts[3] = (firstUsableParts[3] || 0) + 1;
  const firstUsable = firstUsableParts.join('.');

  const lastUsableParts = [...broadcastParts];
  lastUsableParts[3] = (lastUsableParts[3] || 0) - 1;
  const lastUsable = lastUsableParts.join('.');

  // Calculate CIDR notation
  const cidr = maskParts.reduce((sum, octet) => 
    sum + octet.toString(2).split('1').length - 1, 0
  );

  // Calculate total and usable hosts
  const totalHosts = Math.pow(2, 32 - cidr);
  const usableHosts = totalHosts - 2; // Subtract network and broadcast addresses

  return {
    networkAddress,
    subnetMask,
    cidr,
    firstUsable,
    lastUsable,
    broadcast,
    totalHosts,
    usableHosts,
    allocations: [],
  };
}

/**
 * Convert CIDR to subnet mask
 */
export function cidrToMask(cidr: number): string {
  const mask: number[] = [];
  for (let i = 0; i < 4; i++) {
    const bits = Math.max(0, Math.min(8, cidr - (i * 8)));
    mask.push((0xFF << (8 - bits)) & 0xFF);
  }
  return mask.join('.');
}

/**
 * Convert subnet mask to CIDR
 */
export function maskToCidr(mask: string): number {
  return mask.split('.').reduce((cidr, octet) => 
    cidr + parseInt(octet).toString(2).split('1').length - 1, 0
  );
}

/**
 * Generate optimal subnet plan for multiple VLANs
 */
export function generateSubnetPlan(
  baseNetwork: string,
  baseCidr: number,
  requirements: Array<{ name: string; purpose: string; hostCount: number; vlanId?: number }>
): SubnetPlan[] {
  const plans: SubnetPlan[] = [];
  
  // Sort requirements by host count (descending) for optimal allocation
  const sortedReqs = [...requirements].sort((a, b) => b.hostCount - a.hostCount);

  let currentNetworkNum = 0;
  const baseNetworkParts = baseNetwork.split('.').map(Number);

  sortedReqs.forEach(req => {
    // Calculate required CIDR for this subnet
    const requiredCidr = 32 - Math.ceil(Math.log2(req.hostCount + 2)); // +2 for network and broadcast
    
    if (requiredCidr < baseCidr) {
      console.warn(`Cannot allocate subnet for ${req.name}: requires /${requiredCidr} but base is /${baseCidr}`);
      return;
    }

    // Calculate subnet for this requirement
    const subnetIncrement = Math.pow(2, 32 - requiredCidr);
    const thirdOctet = Math.floor(currentNetworkNum / 256);
    const fourthOctet = currentNetworkNum % 256;

    const subnetNetwork = `${baseNetworkParts[0] || 0}.${baseNetworkParts[1] || 0}.${(baseNetworkParts[2] || 0) + thirdOctet}.${fourthOctet}`;
    const subnetMask = cidrToMask(requiredCidr);
    const subnet = calculateSubnet(subnetNetwork, subnetMask);

    if (subnet) {
      plans.push({
        name: req.name,
        purpose: req.purpose,
        requiredHosts: req.hostCount,
        subnet,
        vlanId: req.vlanId,
      });

      currentNetworkNum += subnetIncrement / 256;
    }
  });

  return plans;
}

/**
 * Auto-allocate IP addresses to devices
 */
export function autoAllocateIPs(
  scheme: IPScheme,
  devices: Array<{ id: string; name: string; purpose: IPAllocation['purpose']; vlan?: string }>,
  reserveGateway: boolean = true
): IPScheme {
  const allocations: IPAllocation[] = [];
  const startParts = scheme.firstUsable.split('.').map(Number);
  
  let currentOffset = 0;

  // Reserve gateway (usually first usable IP)
  if (reserveGateway) {
    allocations.push({
      id: 'gateway',
      deviceName: 'Gateway',
      ipAddress: scheme.firstUsable,
      purpose: 'gateway',
      notes: 'Default gateway',
    });
    currentOffset = 1;
  }

  // Allocate IPs to devices
  devices.forEach(device => {
    const ipParts = [...startParts];
    ipParts[3] = (ipParts[3] || 0) + currentOffset;

    // Handle octet overflow
    for (let i = 3; i > 0; i--) {
      if ((ipParts[i] || 0) > 255) {
        ipParts[i] = (ipParts[i] || 0) - 256;
        ipParts[i - 1] = (ipParts[i - 1] || 0) + 1;
      }
    }

    const ipAddress = ipParts.join('.');

    // Check if we've exceeded the subnet
    if (ipAddress > scheme.lastUsable) {
      console.warn(`Insufficient IP addresses in subnet for device: ${device.name}`);
      return;
    }

    allocations.push({
      id: device.id,
      deviceName: device.name,
      ipAddress,
      purpose: device.purpose,
      vlan: device.vlan,
    });

    currentOffset++;
  });

  return {
    ...scheme,
    allocations,
  };
}

/**
 * Check if IP is within subnet
 */
export function isIPInSubnet(ip: string, networkAddress: string, subnetMask: string): boolean {
  const ipParts = ip.split('.').map(Number);
  const networkParts = networkAddress.split('.').map(Number);
  const maskParts = subnetMask.split('.').map(Number);

  for (let i = 0; i < 4; i++) {
    if (((ipParts[i] || 0) & (maskParts[i] || 0)) !== ((networkParts[i] || 0) & (maskParts[i] || 0))) {
      return false;
    }
  }

  return true;
}

/**
 * Get next available IP in subnet
 */
export function getNextAvailableIP(scheme: IPScheme): string | null {
  if (scheme.allocations.length === 0) {
    return scheme.firstUsable;
  }

  const lastAllocation = scheme.allocations[scheme.allocations.length - 1];
  if (!lastAllocation) return null;
  
  const lastAllocated = lastAllocation.ipAddress;
  const parts = lastAllocated.split('.').map(Number);
  parts[3] = (parts[3] || 0) + 1;

  // Handle overflow
  for (let i = 3; i > 0; i--) {
    if ((parts[i] || 0) > 255) {
      parts[i] = 0;
      parts[i - 1] = (parts[i - 1] || 0) + 1;
    }
  }

  const nextIP = parts.join('.');

  // Check if next IP exceeds subnet
  if (nextIP > scheme.lastUsable) {
    return null; // Subnet is full
  }

  return nextIP;
}

/**
 * Generate IP allocation table for documentation
 */
export function generateAllocationTable(scheme: IPScheme): string {
  let table = '# IP Allocation Table\n\n';
  table += `**Network:** ${scheme.networkAddress}/${scheme.cidr}\n`;
  table += `**Subnet Mask:** ${scheme.subnetMask}\n`;
  table += `**Usable Range:** ${scheme.firstUsable} - ${scheme.lastUsable}\n`;
  table += `**Total Hosts:** ${scheme.usableHosts}\n`;
  table += `**Allocated:** ${scheme.allocations.length}\n`;
  table += `**Available:** ${scheme.usableHosts - scheme.allocations.length}\n\n`;

  table += '| IP Address | Device Name | Purpose | VLAN | Notes |\n';
  table += '|------------|-------------|---------|------|-------|\n';

  scheme.allocations.forEach(allocation => {
    table += `| ${allocation.ipAddress} | ${allocation.deviceName} | ${allocation.purpose} | ${allocation.vlan || '-'} | ${allocation.notes || '-'} |\n`;
  });

  return table;
}

/**
 * Generate reverse DNS entries
 */
export function generateReverseDNS(scheme: IPScheme, domain: string): string[] {
  return scheme.allocations.map(allocation => {
    const parts = allocation.ipAddress.split('.').reverse();
    const hostname = allocation.deviceName.toLowerCase().replace(/\s+/g, '-');
    return `${parts.join('.')}.in-addr.arpa. IN PTR ${hostname}.${domain}.`;
  });
}

/**
 * Calculate subnetting for VLSM (Variable Length Subnet Masking)
 */
export function calculateVLSM(
  networkAddress: string,
  cidr: number,
  subnets: number[]
): IPScheme[] {
  const schemes: IPScheme[] = [];
  const sortedSizes = [...subnets].sort((a, b) => b - a); // Largest first

  let currentNetwork = networkAddress;

  sortedSizes.forEach(size => {
    const requiredCidr = 32 - Math.ceil(Math.log2(size + 2));
    const mask = cidrToMask(requiredCidr);
    const scheme = calculateSubnet(currentNetwork, mask);

    if (scheme) {
      schemes.push(scheme);

      // Calculate next network
      const broadcastParts = scheme.broadcast.split('.').map(Number);
      broadcastParts[3] = (broadcastParts[3] || 0) + 1;

      // Handle overflow
      for (let i = 3; i > 0; i--) {
        if ((broadcastParts[i] || 0) > 255) {
          broadcastParts[i] = 0;
          broadcastParts[i - 1] = (broadcastParts[i - 1] || 0) + 1;
        }
      }

      currentNetwork = broadcastParts.join('.');
    }
  });

  return schemes;
}
