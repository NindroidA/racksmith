import { Device, RackConfiguration } from '../types/entities';

/**
 * Export utilities for rack configurations and device data
 * Supports JSON, CSV, and text formats
 */

/**
 * Export rack configuration to JSON
 */
export function exportRackToJSON(rack: RackConfiguration, devices: Device[]): string {
  const data = {
    rack: {
      ...rack,
      export_date: new Date().toISOString(),
      export_version: '1.0'
    },
    devices: devices.map(device => ({
      ...device,
      rack_config_id: rack.id
    })),
    summary: {
      total_devices: devices.length,
      total_rack_units: rack.size_u,
      used_rack_units: devices.reduce((sum, d) => sum + d.size_u, 0),
      total_power_watts: devices.reduce((sum, d) => sum + (d.power_watts || 0), 0)
    }
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Export rack configuration to CSV
 */
export function exportRackToCSV(rack: RackConfiguration, devices: Device[]): string {
  const headers = [
    'Position (U)',
    'Device Name',
    'Manufacturer',
    'Model',
    'Type',
    'Size (U)',
    'Power (W)',
    'Port Count',
    'Description'
  ];

  const rows = devices
    .sort((a, b) => (b.position_u || 0) - (a.position_u || 0)) // Sort by position, top to bottom
    .map(device => [
      device.position_u || 'Not installed',
      device.name,
      device.manufacturer || '',
      device.model || '',
      device.device_type,
      device.size_u,
      device.power_watts || 0,
      device.port_count || 0,
      device.notes || ''
    ]);

  const csvContent = [
    [`Rack Configuration: ${rack.name}`],
    [`Location: ${rack.location || 'Not specified'}`],
    [`Total Size: ${rack.size_u}U`],
    [`Export Date: ${new Date().toLocaleString()}`],
    [],
    headers,
    ...rows
  ]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csvContent;
}

/**
 * Export all racks to JSON
 */
export function exportAllRacksToJSON(
  racks: RackConfiguration[],
  devices: Device[]
): string {
  const data = {
    export_date: new Date().toISOString(),
    export_version: '1.0',
    racks: racks.map(rack => ({
      ...rack,
      devices: devices.filter(d => d.rack_config_id === rack.id)
    })),
    summary: {
      total_racks: racks.length,
      total_devices: devices.length,
      total_power_watts: devices.reduce((sum, d) => sum + (d.power_watts || 0), 0)
    }
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Export devices to CSV
 */
export function exportDevicesToCSV(devices: Device[]): string {
  const headers = [
    'ID',
    'Name',
    'Manufacturer',
    'Model',
    'Type',
    'Size (U)',
    'Position (U)',
    'Power (W)',
    'Port Count',
    'Rack ID',
    'Description'
  ];

  const rows = devices.map(device => [
    device.id,
    device.name,
    device.manufacturer || '',
    device.model || '',
    device.device_type,
    device.size_u,
    device.position_u || '',
    device.power_watts || 0,
    device.port_count || 0,
    device.rack_config_id || '',
    device.notes || ''
  ]);

  const csvContent = [
    ['Device Library Export'],
    [`Export Date: ${new Date().toLocaleString()}`],
    [`Total Devices: ${devices.length}`],
    [],
    headers,
    ...rows
  ]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csvContent;
}

/**
 * Download a file with the given content
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export rack configuration with download
 */
export function downloadRackConfiguration(
  rack: RackConfiguration,
  devices: Device[],
  format: 'json' | 'csv' = 'json'
): void {
  const timestamp = new Date().toISOString().split('T')[0];
  const safeRackName = rack.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  if (format === 'json') {
    const content = exportRackToJSON(rack, devices);
    downloadFile(
      content,
      `rack_${safeRackName}_${timestamp}.json`,
      'application/json'
    );
  } else {
    const content = exportRackToCSV(rack, devices);
    downloadFile(
      content,
      `rack_${safeRackName}_${timestamp}.csv`,
      'text/csv'
    );
  }
}

/**
 * Export all racks with download
 */
export function downloadAllRacks(
  racks: RackConfiguration[],
  devices: Device[],
  format: 'json' | 'csv' = 'json'
): void {
  const timestamp = new Date().toISOString().split('T')[0];

  if (format === 'json') {
    const content = exportAllRacksToJSON(racks, devices);
    downloadFile(
      content,
      `racksmith_export_${timestamp}.json`,
      'application/json'
    );
  } else {
    // For CSV, export each rack separately in a zip would be ideal
    // For now, just export a combined device list
    const content = exportDevicesToCSV(devices);
    downloadFile(
      content,
      `racksmith_devices_${timestamp}.csv`,
      'text/csv'
    );
  }
}

/**
 * Import rack configuration from JSON
 */
export function importRackFromJSON(jsonString: string): {
  rack: Omit<RackConfiguration, 'id'>;
  devices: Omit<Device, 'id'>[];
} | null {
  try {
    const data = JSON.parse(jsonString);
    
    // Validate basic structure
    if (!data.rack || !data.devices) {
      throw new Error('Invalid rack export format');
    }

    // Remove IDs to create new entries
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _rackId, ...rackData } = data.rack;
    const devices = data.devices.map(({ id: _deviceId, rack_config_id: _rackConfigId, ...deviceData }: Device) => deviceData);

    return {
      rack: rackData,
      devices
    };
  } catch (error) {
    console.error('Failed to import rack configuration:', error);
    return null;
  }
}

/**
 * Generate a text-based rack diagram
 */
export function generateRackDiagram(rack: RackConfiguration, devices: Device[]): string {
  const lines: string[] = [];
  const width = 50;

  // Header
  lines.push('┌' + '─'.repeat(width) + '┐');
  lines.push('│' + rack.name.padEnd(width) + '│');
  lines.push('│' + (rack.location || 'No location').padEnd(width) + '│');
  lines.push('├' + '─'.repeat(width) + '┤');

  // Rack units (from top to bottom)
  for (let u = rack.size_u; u >= 1; u--) {
    const device = devices.find(d => {
      const deviceStart = d.position_u || 0;
      const deviceEnd = deviceStart + d.size_u - 1;
      return u >= deviceStart && u <= deviceEnd;
    });

    if (device) {
      const deviceStart = device.position_u || 0;
      if (u === deviceStart + device.size_u - 1) {
        // Top of device
        const label = `${device.name} (${device.size_u}U)`.substring(0, width - 6);
        lines.push(`│ ${u.toString().padStart(2)}U │ ${label.padEnd(width - 6)} │`);
      } else {
        // Middle/bottom of device
        lines.push(`│    │ ${' '.repeat(width - 6)} │`);
      }
    } else {
      // Empty space
      lines.push(`│ ${u.toString().padStart(2)}U │ ${' '.repeat(width - 6)} │`);
    }
  }

  // Footer
  lines.push('└' + '─'.repeat(width) + '┘');

  // Summary
  const usedUnits = devices.reduce((sum, d) => sum + d.size_u, 0);
  const utilization = Math.round((usedUnits / rack.size_u) * 100);
  const totalPower = devices.reduce((sum, d) => sum + (d.power_watts || 0), 0);

  lines.push('');
  lines.push(`Utilization: ${usedUnits}/${rack.size_u}U (${utilization}%)`);
  lines.push(`Devices: ${devices.length}`);
  lines.push(`Total Power: ${totalPower}W`);

  return lines.join('\n');
}

/**
 * Download rack diagram as text file
 */
export function downloadRackDiagram(rack: RackConfiguration, devices: Device[]): void {
  const diagram = generateRackDiagram(rack, devices);
  const timestamp = new Date().toISOString().split('T')[0];
  const safeRackName = rack.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
  downloadFile(
    diagram,
    `rack_diagram_${safeRackName}_${timestamp}.txt`,
    'text/plain'
  );
}
