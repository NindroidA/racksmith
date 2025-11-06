import { Device, Port, RackConfiguration } from '../types/entities';

/**
 * Validation utilities for rack and device management
 * Provides real-time validation for conflicts and capacity issues
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Check if a device can fit in a rack at the specified position
 */
export function validateDevicePlacement(
  device: Device,
  position: number,
  rack: RackConfiguration,
  existingDevices: Device[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if position is within rack bounds
  if (position < 1 || position > rack.size_u) {
    errors.push(`Position ${position}U is outside rack bounds (1-${rack.size_u}U)`);
  }

  // Check if device would exceed rack height
  const topPosition = position + device.size_u - 1;
  if (topPosition > rack.size_u) {
    errors.push(
      `Device extends to ${topPosition}U, exceeding rack height of ${rack.size_u}U`
    );
  }

  // Check for collisions with existing devices
  const occupiedPositions = existingDevices
    .filter(d => d.id !== device.id) // Exclude current device if moving
    .flatMap(d => {
      const positions: number[] = [];
      for (let i = 0; i < d.size_u; i++) {
        positions.push((d.position_u || 0) + i);
      }
      return positions;
    });

  const devicePositions: number[] = [];
  for (let i = 0; i < device.size_u; i++) {
    devicePositions.push(position + i);
  }

  const collisions = devicePositions.filter(p => occupiedPositions.includes(p));
  if (collisions.length > 0) {
    const collidingDevices = existingDevices.filter(d => {
      const dStart = d.position_u || 0;
      const dEnd = dStart + d.size_u - 1;
      return collisions.some(p => p >= dStart && p <= dEnd);
    });
    
    errors.push(
      `Position conflict with: ${collidingDevices.map(d => d.name).join(', ')}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Calculate rack space utilization
 */
export function calculateRackUtilization(
  rack: RackConfiguration,
  devices: Device[]
): {
  usedUnits: number;
  totalUnits: number;
  percentage: number;
  availableUnits: number;
} {
  const usedUnits = devices.reduce((sum, d) => sum + d.size_u, 0);
  const percentage = Math.round((usedUnits / rack.size_u) * 100);
  
  return {
    usedUnits,
    totalUnits: rack.size_u,
    percentage,
    availableUnits: rack.size_u - usedUnits
  };
}

/**
 * Check for rack capacity warnings
 */
export function validateRackCapacity(
  rack: RackConfiguration,
  devices: Device[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const utilization = calculateRackUtilization(rack, devices);
  
  // Check if rack is at or over capacity
  if (utilization.percentage >= 100) {
    errors.push('Rack is at full capacity');
  } else if (utilization.percentage >= 90) {
    warnings.push(`Rack is ${utilization.percentage}% full - approaching capacity`);
  } else if (utilization.percentage >= 75) {
    warnings.push(`Rack is ${utilization.percentage}% full`);
  }
  
  // Check power consumption
  const totalPower = devices.reduce((sum, d) => sum + (d.power_watts || 0), 0);
  if (totalPower > 5000) {
    warnings.push(`Total power draw is ${totalPower}W - consider power distribution`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Check for port conflicts within a device
 */
export function validatePortConfiguration(
  ports: Port[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for duplicate port numbers
  const portNumbers = ports.map(p => p.port_number.toLowerCase());
  const duplicates = portNumbers.filter((num, index) => portNumbers.indexOf(num) !== index);
  
  if (duplicates.length > 0) {
    errors.push(`Duplicate port numbers found: ${[...new Set(duplicates)].join(', ')}`);
  }
  
  // Warn about high port count
  if (ports.length > 48) {
    warnings.push(`Device has ${ports.length} ports - consider organizing into groups`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate IP address format
 */
export function validateIPAddress(ip: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipv4Regex);
  
  if (!match) {
    errors.push('Invalid IP address format. Expected: xxx.xxx.xxx.xxx');
  } else {
    const octets = match.slice(1).map(Number);
    const invalidOctets = octets.filter(octet => octet > 255);
    
    if (invalidOctets.length > 0) {
      errors.push('IP address octets must be between 0-255');
    }
    
    // Check for private IP ranges
    if (octets[0] === 10) {
      // 10.0.0.0/8
    } else if (octets[0] === 172 && octets[1] !== undefined && octets[1] >= 16 && octets[1] <= 31) {
      // 172.16.0.0/12
    } else if (octets[0] === 192 && octets[1] === 168) {
      // 192.168.0.0/16
    } else if (octets[0] === 127) {
      warnings.push('Loopback address (127.x.x.x) detected');
    } else {
      warnings.push('Not a private IP address - ensure this is intentional');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate subnet mask
 */
export function validateSubnetMask(mask: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const validMasks = [
    '255.255.255.255', '255.255.255.254', '255.255.255.252', '255.255.255.248',
    '255.255.255.240', '255.255.255.224', '255.255.255.192', '255.255.255.128',
    '255.255.255.0', '255.255.254.0', '255.255.252.0', '255.255.248.0',
    '255.255.240.0', '255.255.224.0', '255.255.192.0', '255.255.128.0',
    '255.255.0.0', '255.254.0.0', '255.252.0.0', '255.248.0.0',
    '255.240.0.0', '255.224.0.0', '255.192.0.0', '255.128.0.0',
    '255.0.0.0', '254.0.0.0', '252.0.0.0', '248.0.0.0',
    '240.0.0.0', '224.0.0.0', '192.0.0.0', '128.0.0.0', '0.0.0.0'
  ];
  
  if (!validMasks.includes(mask)) {
    errors.push('Invalid subnet mask');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Check for IP address conflicts in a network
 */
export function validateIPConflicts(
  newIP: string,
  existingIPs: string[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (existingIPs.includes(newIP)) {
    errors.push(`IP address ${newIP} is already in use`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate VLAN ID
 */
export function validateVLANId(vlanId: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (vlanId < 1 || vlanId > 4094) {
    errors.push('VLAN ID must be between 1 and 4094');
  }
  
  if (vlanId === 1) {
    warnings.push('VLAN 1 is the default VLAN - consider using a different VLAN for security');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
