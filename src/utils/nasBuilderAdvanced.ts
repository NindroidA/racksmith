/**
 * Advanced NAS Builder Utilities
 * RAID configuration, capacity planning, and performance estimation
 */

export interface Drive {
  bay: number;
  type: 'hdd' | 'ssd' | 'nvme';
  capacity_gb: number;
  rpm?: 5400 | 7200 | 10000 | 15000;
  interface: 'sata' | 'sas' | 'nvme';
  model?: string;
}

export interface RAIDConfiguration {
  type: 'raid0' | 'raid1' | 'raid5' | 'raid6' | 'raid10' | 'raid50' | 'raid60' | 'jbod';
  drives: Drive[];
  usableCapacity_gb: number;
  redundancy: number;
  minDrives: number;
  readPerformance: number; // Relative score 1-10
  writePerformance: number; // Relative score 1-10
  rebuildTime_hours?: number;
}

export interface NASPerformance {
  sequentialRead_mbps: number;
  sequentialWrite_mbps: number;
  randomRead_iops: number;
  randomWrite_iops: number;
  maxThroughput_mbps: number;
  bottleneck: 'network' | 'storage' | 'cpu' | 'balanced';
}

export interface CapacityPlan {
  totalRaw_gb: number;
  usable_gb: number;
  overhead_gb: number;
  efficiency_percent: number;
  estimatedGrowth?: {
    monthly_gb: number;
    timeToFull_months: number;
  };
}

/**
 * Calculate RAID usable capacity and characteristics
 */
export function calculateRAIDCapacity(
  raidType: RAIDConfiguration['type'],
  drives: Drive[]
): {
  usableCapacity_gb: number;
  redundancy: number;
  minDrives: number;
  efficiency_percent: number;
} {
  const driveCount = drives.length;
  const smallestDrive_gb = Math.min(...drives.map((d) => d.capacity_gb));
  const totalRaw_gb = smallestDrive_gb * driveCount;

  let usableCapacity_gb = 0;
  let redundancy = 0;
  let minDrives = 0;

  switch (raidType) {
    case 'raid0':
      usableCapacity_gb = totalRaw_gb;
      redundancy = 0;
      minDrives = 2;
      break;

    case 'raid1':
      usableCapacity_gb = smallestDrive_gb;
      redundancy = driveCount - 1;
      minDrives = 2;
      break;

    case 'raid5':
      usableCapacity_gb = smallestDrive_gb * (driveCount - 1);
      redundancy = 1;
      minDrives = 3;
      break;

    case 'raid6':
      usableCapacity_gb = smallestDrive_gb * (driveCount - 2);
      redundancy = 2;
      minDrives = 4;
      break;

    case 'raid10':
      usableCapacity_gb = totalRaw_gb / 2;
      redundancy = driveCount / 2;
      minDrives = 4;
      break;

    case 'raid50':
      // RAID 50 requires at least 6 drives (2 RAID 5 arrays)
      const raid5Arrays = Math.floor(driveCount / 3);
      const drivesPerArray = Math.floor(driveCount / raid5Arrays);
      usableCapacity_gb = smallestDrive_gb * (drivesPerArray - 1) * raid5Arrays;
      redundancy = raid5Arrays;
      minDrives = 6;
      break;

    case 'raid60':
      // RAID 60 requires at least 8 drives (2 RAID 6 arrays)
      const raid6Arrays = Math.floor(driveCount / 4);
      const drivesPerRaid6Array = Math.floor(driveCount / raid6Arrays);
      usableCapacity_gb =
        smallestDrive_gb * (drivesPerRaid6Array - 2) * raid6Arrays;
      redundancy = raid6Arrays * 2;
      minDrives = 8;
      break;

    case 'jbod':
      usableCapacity_gb = drives.reduce((sum, drive) => sum + drive.capacity_gb, 0);
      redundancy = 0;
      minDrives = 1;
      break;
  }

  const efficiency_percent = (usableCapacity_gb / totalRaw_gb) * 100;

  return {
    usableCapacity_gb: Math.floor(usableCapacity_gb),
    redundancy,
    minDrives,
    efficiency_percent: parseFloat(efficiency_percent.toFixed(2)),
  };
}

/**
 * Estimate RAID rebuild time based on capacity and drive type
 */
export function estimateRebuildTime(
  raidType: RAIDConfiguration['type'],
  drives: Drive[]
): number {
  if (raidType === 'raid0' || raidType === 'jbod') {
    return 0; // No rebuild for non-redundant arrays
  }

  const driveCapacity_gb = Math.min(...drives.map((d) => d.capacity_gb));
  const driveType = drives[0]?.type || 'hdd';

  // Base rebuild rate in GB/hour
  let rebuildRate_gbph = 0;

  switch (driveType) {
    case 'hdd':
      rebuildRate_gbph = 50; // ~50 GB/hour for HDDs
      break;
    case 'ssd':
      rebuildRate_gbph = 200; // ~200 GB/hour for SSDs
      break;
    case 'nvme':
      rebuildRate_gbph = 500; // ~500 GB/hour for NVMe
      break;
  }

  // RAID 6 and RAID 60 take longer due to dual parity
  if (raidType === 'raid6' || raidType === 'raid60') {
    rebuildRate_gbph *= 0.7;
  }

  const rebuildTime_hours = driveCapacity_gb / rebuildRate_gbph;

  return parseFloat(rebuildTime_hours.toFixed(2));
}

/**
 * Estimate NAS performance based on drive types and RAID configuration
 */
export function estimatePerformance(
  raidType: RAIDConfiguration['type'],
  drives: Drive[],
  networkSpeed_mbps = 1000
): NASPerformance {
  const driveCount = drives.length;
  const primaryDriveType = drives[0]?.type || 'hdd';

  // Base performance for single drive (MB/s)
  let baseDriveRead_mbps = 0;
  let baseDriveWrite_mbps = 0;
  let baseRandomRead_iops = 0;
  let baseRandomWrite_iops = 0;

  switch (primaryDriveType) {
    case 'hdd':
      baseDriveRead_mbps = 150;
      baseDriveWrite_mbps = 140;
      baseRandomRead_iops = 150;
      baseRandomWrite_iops = 120;
      break;
    case 'ssd':
      baseDriveRead_mbps = 500;
      baseDriveWrite_mbps = 450;
      baseRandomRead_iops = 80000;
      baseRandomWrite_iops = 70000;
      break;
    case 'nvme':
      baseDriveRead_mbps = 3500;
      baseDriveWrite_mbps = 3000;
      baseRandomRead_iops = 500000;
      baseRandomWrite_iops = 450000;
      break;
  }

  let sequentialRead_mbps = 0;
  let sequentialWrite_mbps = 0;
  let randomRead_iops = 0;
  let randomWrite_iops = 0;

  // Calculate based on RAID type
  switch (raidType) {
    case 'raid0':
      sequentialRead_mbps = baseDriveRead_mbps * driveCount;
      sequentialWrite_mbps = baseDriveWrite_mbps * driveCount;
      randomRead_iops = baseRandomRead_iops * driveCount;
      randomWrite_iops = baseRandomWrite_iops * driveCount;
      break;

    case 'raid1':
      sequentialRead_mbps = baseDriveRead_mbps * driveCount; // Read from all
      sequentialWrite_mbps = baseDriveWrite_mbps; // Write to all
      randomRead_iops = baseRandomRead_iops * driveCount;
      randomWrite_iops = baseRandomWrite_iops;
      break;

    case 'raid5':
      sequentialRead_mbps = baseDriveRead_mbps * (driveCount - 1);
      sequentialWrite_mbps = baseDriveWrite_mbps * (driveCount - 1) * 0.7; // Parity overhead
      randomRead_iops = baseRandomRead_iops * (driveCount - 1);
      randomWrite_iops = baseRandomWrite_iops * (driveCount - 1) * 0.5;
      break;

    case 'raid6':
      sequentialRead_mbps = baseDriveRead_mbps * (driveCount - 2);
      sequentialWrite_mbps = baseDriveWrite_mbps * (driveCount - 2) * 0.6; // Dual parity overhead
      randomRead_iops = baseRandomRead_iops * (driveCount - 2);
      randomWrite_iops = baseRandomWrite_iops * (driveCount - 2) * 0.4;
      break;

    case 'raid10':
      sequentialRead_mbps = baseDriveRead_mbps * driveCount;
      sequentialWrite_mbps = baseDriveWrite_mbps * (driveCount / 2);
      randomRead_iops = baseRandomRead_iops * driveCount;
      randomWrite_iops = baseRandomWrite_iops * (driveCount / 2);
      break;

    case 'raid50':
    case 'raid60':
      // Similar to RAID 5/6 but with striping
      const multiplier = raidType === 'raid50' ? 0.7 : 0.6;
      sequentialRead_mbps = baseDriveRead_mbps * driveCount * 0.8;
      sequentialWrite_mbps = baseDriveWrite_mbps * driveCount * multiplier;
      randomRead_iops = baseRandomRead_iops * driveCount * 0.8;
      randomWrite_iops = baseRandomWrite_iops * driveCount * multiplier;
      break;

    case 'jbod':
      sequentialRead_mbps = baseDriveRead_mbps;
      sequentialWrite_mbps = baseDriveWrite_mbps;
      randomRead_iops = baseRandomRead_iops;
      randomWrite_iops = baseRandomWrite_iops;
      break;
  }

  // Network is often the bottleneck
  const maxThroughput_mbps = Math.min(sequentialRead_mbps, networkSpeed_mbps);

  let bottleneck: NASPerformance['bottleneck'] = 'balanced';
  if (sequentialRead_mbps > networkSpeed_mbps * 1.5) {
    bottleneck = 'network';
  } else if (sequentialRead_mbps < networkSpeed_mbps * 0.5) {
    bottleneck = 'storage';
  }

  return {
    sequentialRead_mbps: Math.floor(sequentialRead_mbps),
    sequentialWrite_mbps: Math.floor(sequentialWrite_mbps),
    randomRead_iops: Math.floor(randomRead_iops),
    randomWrite_iops: Math.floor(randomWrite_iops),
    maxThroughput_mbps: Math.floor(maxThroughput_mbps),
    bottleneck,
  };
}

/**
 * Calculate capacity planning with growth estimates
 */
export function calculateCapacityPlan(
  raidType: RAIDConfiguration['type'],
  drives: Drive[],
  currentUsed_gb = 0,
  monthlyGrowth_gb = 0
): CapacityPlan {
  const totalRaw_gb = drives.reduce((sum, drive) => sum + drive.capacity_gb, 0);
  const raidCalc = calculateRAIDCapacity(raidType, drives);
  const usable_gb = raidCalc.usableCapacity_gb;
  const overhead_gb = totalRaw_gb - usable_gb;

  const plan: CapacityPlan = {
    totalRaw_gb,
    usable_gb,
    overhead_gb,
    efficiency_percent: raidCalc.efficiency_percent,
  };

  if (monthlyGrowth_gb > 0) {
    const remaining_gb = usable_gb - currentUsed_gb;
    const timeToFull_months =
      remaining_gb > 0 ? remaining_gb / monthlyGrowth_gb : 0;

    plan.estimatedGrowth = {
      monthly_gb: monthlyGrowth_gb,
      timeToFull_months: parseFloat(timeToFull_months.toFixed(1)),
    };
  }

  return plan;
}

/**
 * Recommend optimal RAID type based on requirements
 */
export function recommendRAIDType(requirements: {
  driveCount: number;
  priority: 'performance' | 'capacity' | 'redundancy' | 'balanced';
  minRedundancy?: number;
}): {
  recommended: RAIDConfiguration['type'];
  alternatives: RAIDConfiguration['type'][];
  reasoning: string;
} {
  const { driveCount, priority, minRedundancy = 0 } = requirements;

  let recommended: RAIDConfiguration['type'] = 'raid5';
  let alternatives: RAIDConfiguration['type'][] = [];
  let reasoning = '';

  if (driveCount < 2) {
    return {
      recommended: 'jbod',
      alternatives: [],
      reasoning: 'Only one drive available - JBOD is the only option',
    };
  }

  if (priority === 'performance') {
    if (driveCount >= 4) {
      recommended = 'raid10';
      alternatives = ['raid0', 'raid50'];
      reasoning = 'RAID 10 offers best balance of performance and redundancy';
    } else {
      recommended = 'raid0';
      alternatives = ['raid1'];
      reasoning = 'RAID 0 provides maximum performance but no redundancy';
    }
  } else if (priority === 'capacity') {
    if (driveCount >= 6) {
      recommended = 'raid50';
      alternatives = ['raid5', 'raid6'];
      reasoning = 'RAID 50 provides good capacity with improved redundancy';
    } else if (driveCount >= 3) {
      recommended = 'raid5';
      alternatives = ['raid6'];
      reasoning = 'RAID 5 offers good capacity with single-drive redundancy';
    } else {
      recommended = 'raid0';
      alternatives = ['raid1'];
      reasoning = 'RAID 0 maximizes capacity but has no redundancy';
    }
  } else if (priority === 'redundancy') {
    if (driveCount >= 8) {
      recommended = 'raid60';
      alternatives = ['raid6', 'raid10'];
      reasoning = 'RAID 60 provides maximum redundancy with good performance';
    } else if (driveCount >= 4) {
      recommended = 'raid6';
      alternatives = ['raid10'];
      reasoning = 'RAID 6 can survive two drive failures';
    } else {
      recommended = 'raid1';
      alternatives = ['raid5'];
      reasoning = 'RAID 1 provides mirroring for maximum data protection';
    }
  } else {
    // balanced
    if (driveCount >= 6) {
      recommended = 'raid50';
      alternatives = ['raid10', 'raid6'];
      reasoning =
        'RAID 50 offers balanced performance, capacity, and redundancy';
    } else if (driveCount >= 4) {
      recommended = 'raid10';
      alternatives = ['raid5', 'raid6'];
      reasoning = 'RAID 10 provides excellent balance for 4+ drives';
    } else if (driveCount >= 3) {
      recommended = 'raid5';
      alternatives = ['raid1'];
      reasoning = 'RAID 5 offers good balance for 3+ drives';
    } else {
      recommended = 'raid1';
      alternatives = ['raid0'];
      reasoning = 'RAID 1 provides redundancy for 2 drives';
    }
  }

  // Override if minimum redundancy not met
  if (minRedundancy > 0) {
    const redundancyMap: Record<RAIDConfiguration['type'], number> = {
      raid0: 0,
      raid1: 1,
      raid5: 1,
      raid6: 2,
      raid10: driveCount / 2,
      raid50: Math.floor(driveCount / 3),
      raid60: Math.floor(driveCount / 4) * 2,
      jbod: 0,
    };

    if (redundancyMap[recommended] < minRedundancy) {
      if (minRedundancy >= 2 && driveCount >= 4) {
        recommended = 'raid6';
        reasoning = `Upgraded to RAID 6 to meet minimum redundancy requirement of ${minRedundancy} drives`;
      } else if (minRedundancy >= 1 && driveCount >= 3) {
        recommended = 'raid5';
        reasoning = `Upgraded to RAID 5 to meet minimum redundancy requirement of ${minRedundancy} drive`;
      }
    }
  }

  return { recommended, alternatives, reasoning };
}

/**
 * Generate RAID configuration report
 */
export function generateRAIDReport(
  raidType: RAIDConfiguration['type'],
  drives: Drive[]
): string {
  const capacity = calculateRAIDCapacity(raidType, drives);
  const rebuildTime = estimateRebuildTime(raidType, drives);
  const performance = estimatePerformance(raidType, drives);
  const plan = calculateCapacityPlan(raidType, drives);

  const report = `
# RAID Configuration Report

## Configuration
- RAID Type: ${raidType.toUpperCase()}
- Drive Count: ${drives.length}
- Minimum Drives Required: ${capacity.minDrives}

## Capacity
- Total Raw Capacity: ${plan.totalRaw_gb.toLocaleString()} GB (${(plan.totalRaw_gb / 1024).toFixed(2)} TB)
- Usable Capacity: ${plan.usable_gb.toLocaleString()} GB (${(plan.usable_gb / 1024).toFixed(2)} TB)
- Overhead: ${plan.overhead_gb.toLocaleString()} GB
- Efficiency: ${capacity.efficiency_percent}%

## Redundancy
- Redundant Drives: ${capacity.redundancy}
- Rebuild Time: ${rebuildTime > 0 ? `${rebuildTime} hours` : 'N/A'}

## Performance Estimates
- Sequential Read: ${performance.sequentialRead_mbps} MB/s
- Sequential Write: ${performance.sequentialWrite_mbps} MB/s
- Random Read: ${performance.randomRead_iops.toLocaleString()} IOPS
- Random Write: ${performance.randomWrite_iops.toLocaleString()} IOPS
- Max Throughput: ${performance.maxThroughput_mbps} MB/s
- Bottleneck: ${performance.bottleneck}

## Drive Configuration
${drives
  .map(
    (d) =>
      `- Bay ${d.bay}: ${d.capacity_gb}GB ${d.type.toUpperCase()} ${d.interface.toUpperCase()}${d.rpm ? ` @ ${d.rpm} RPM` : ''}`
  )
  .join('\n')}
`;

  return report.trim();
}

/**
 * Calculate power consumption estimate
 */
export function estimatePowerConsumption(drives: Drive[]): {
  idle_watts: number;
  active_watts: number;
  annual_kwh: number;
} {
  let idle_watts = 0;
  let active_watts = 0;

  drives.forEach((drive) => {
    switch (drive.type) {
      case 'hdd':
        idle_watts += 5;
        active_watts += drive.rpm === 7200 ? 8 : drive.rpm === 10000 ? 10 : 6;
        break;
      case 'ssd':
        idle_watts += 2;
        active_watts += 4;
        break;
      case 'nvme':
        idle_watts += 3;
        active_watts += 6;
        break;
    }
  });

  // Assume 70% active time
  const average_watts = idle_watts * 0.3 + active_watts * 0.7;
  const annual_kwh = (average_watts * 24 * 365) / 1000;

  return {
    idle_watts: Math.round(idle_watts),
    active_watts: Math.round(active_watts),
    annual_kwh: Math.round(annual_kwh),
  };
}

/**
 * Validate RAID configuration
 */
export function validateRAIDConfiguration(
  raidType: RAIDConfiguration['type'],
  drives: Drive[]
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (drives.length === 0) {
    errors.push('No drives configured');
    return { valid: false, errors, warnings };
  }

  const capacity = calculateRAIDCapacity(raidType, drives);

  if (drives.length < capacity.minDrives) {
    errors.push(
      `${raidType.toUpperCase()} requires at least ${capacity.minDrives} drives, but only ${drives.length} configured`
    );
  }

  // Check for mixed drive types
  const driveTypes = new Set(drives.map((d) => d.type));
  if (driveTypes.size > 1) {
    warnings.push('Mixed drive types detected - may impact performance');
  }

  // Check for mixed capacities
  const capacities = new Set(drives.map((d) => d.capacity_gb));
  if (capacities.size > 1) {
    warnings.push(
      'Mixed drive capacities detected - RAID will use smallest drive capacity'
    );
  }

  // Check for mixed interfaces
  const interfaces = new Set(drives.map((d) => d.interface));
  if (interfaces.size > 1) {
    warnings.push('Mixed drive interfaces detected - may cause compatibility issues');
  }

  // RAID 10 specific validation
  if (raidType === 'raid10' && drives.length % 2 !== 0) {
    errors.push('RAID 10 requires an even number of drives');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
