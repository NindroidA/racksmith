import { Device, RackConfiguration } from '../types/entities';
import { validateDevicePlacement, validateIPAddress } from './validators';
import toast from 'react-hot-toast';

export interface BulkImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
  devices?: Device[];
}

export interface CSVDeviceRow {
  name: string;
  manufacturer: string;
  device_type: string;
  size_u: string;
  power_draw?: string;
  port_count?: string;
  position_u?: string;
  management_ip?: string;
}

/**
 * Parse CSV content into device objects
 */
export function parseDeviceCSV(csvContent: string): CSVDeviceRow[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must contain header row and at least one data row');
  }

  const headerLine = lines[0];
  if (!headerLine) throw new Error('CSV header is empty');
  
  const headers = headerLine.split(',').map(h => h.trim().toLowerCase());
  const requiredHeaders = ['name', 'manufacturer', 'device_type', 'size_u'];
  
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required CSV headers: ${missingHeaders.join(', ')}`);
  }

  const rows: CSVDeviceRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    
    const values = line.split(',').map(v => v.trim());
    if (values.length === 0 || values.every(v => !v)) continue; // Skip empty lines

    const row: Partial<CSVDeviceRow> = {};
    headers.forEach((header, index) => {
      row[header as keyof CSVDeviceRow] = values[index] || '';
    });
    rows.push(row as CSVDeviceRow);
  }

  return rows;
}

/**
 * Validate and convert CSV rows to Device objects
 */
export function convertCSVToDevices(
  rows: CSVDeviceRow[],
  rackId: string,
  rack?: RackConfiguration,
  existingDevices: Device[] = []
): BulkImportResult {
  const errors: string[] = [];
  const devices: Device[] = [];
  let imported = 0;
  let failed = 0;

  const validDeviceTypes = [
    'router', 'switch', 'server', 'firewall', 'load_balancer',
    'storage', 'pdu', 'ups', 'patch_panel', 'kvm', 'other'
  ];

  rows.forEach((row, index) => {
    const lineNumber = index + 2; // +2 because of header and 0-based index

    try {
      // Validate required fields
      if (!row.name) throw new Error(`Row ${lineNumber}: Device name is required`);
      if (!row.manufacturer) throw new Error(`Row ${lineNumber}: Manufacturer is required`);
      if (!row.device_type) throw new Error(`Row ${lineNumber}: Device type is required`);
      if (!row.size_u) throw new Error(`Row ${lineNumber}: Size (U) is required`);

      // Validate device type
      if (!validDeviceTypes.includes(row.device_type.toLowerCase())) {
        throw new Error(
          `Row ${lineNumber}: Invalid device type "${row.device_type}". Valid types: ${validDeviceTypes.join(', ')}`
        );
      }

      // Parse numeric fields
      const sizeU = parseInt(row.size_u);
      if (isNaN(sizeU) || sizeU < 1 || sizeU > 42) {
        throw new Error(`Row ${lineNumber}: Size must be between 1 and 42U`);
      }

      const powerDraw = row.power_draw ? parseFloat(row.power_draw) : undefined;
      if (powerDraw !== undefined && (isNaN(powerDraw) || powerDraw < 0)) {
        throw new Error(`Row ${lineNumber}: Power draw must be a positive number`);
      }

      const portCount = row.port_count ? parseInt(row.port_count) : undefined;
      if (portCount !== undefined && (isNaN(portCount) || portCount < 0)) {
        throw new Error(`Row ${lineNumber}: Port count must be a non-negative integer`);
      }

      const positionU = row.position_u ? parseInt(row.position_u) : undefined;
      if (positionU !== undefined && (isNaN(positionU) || positionU < 1)) {
        throw new Error(`Row ${lineNumber}: Position must be a positive integer`);
      }

      // Validate IP address if provided
      if (row.management_ip) {
        const ipValidation = validateIPAddress(row.management_ip);
        if (!ipValidation.isValid) {
          throw new Error(`Row ${lineNumber}: ${ipValidation.errors[0]}`);
        }
      }

      // Create device object
      const device: Device = {
        id: `import-${Date.now()}-${index}`,
        name: row.name,
        manufacturer: (row.manufacturer as Device['manufacturer']) || 'custom',
        device_type: (row.device_type as Device['device_type']) || 'other',
        size_u: sizeU,
        port_count: portCount,
        position_u: positionU || 1,
        rack_config_id: rackId,
      };

      // Validate placement if position is specified
      if (positionU && rack) {
        const placementValidation = validateDevicePlacement(
          device,
          positionU,
          rack,
          [...existingDevices, ...devices] // Include already processed devices
        );

        if (!placementValidation.isValid) {
          throw new Error(`Row ${lineNumber}: ${placementValidation.errors[0]}`);
        }
      }

      devices.push(device);
      imported++;
    } catch (error) {
      failed++;
      errors.push(error instanceof Error ? error.message : `Row ${lineNumber}: Unknown error`);
    }
  });

  return {
    success: failed === 0,
    imported,
    failed,
    errors,
    devices: failed === 0 ? devices : undefined,
  };
}

/**
 * Import devices from CSV file
 */
export async function importDevicesFromCSV(
  file: File,
  rackId: string,
  rack?: RackConfiguration,
  existingDevices: Device[] = []
): Promise<BulkImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const rows = parseDeviceCSV(content);
        const result = convertCSVToDevices(rows, rackId, rack, existingDevices);
        resolve(result);
      } catch (error) {
        resolve({
          success: false,
          imported: 0,
          failed: 0,
          errors: [error instanceof Error ? error.message : 'Failed to parse CSV file'],
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        imported: 0,
        failed: 0,
        errors: ['Failed to read CSV file'],
      });
    };

    reader.readAsText(file);
  });
}

/**
 * Generate CSV template for device import
 */
export function generateCSVTemplate(): string {
  const headers = [
    'name',
    'manufacturer',
    'device_type',
    'size_u',
    'power_draw',
    'port_count',
    'position_u',
    'management_ip',
  ];

  const examples = [
    'Core Switch 1,Cisco,switch,2,300,48,1,192.168.1.1',
    'Edge Router,Juniper,router,1,150,24,5,192.168.1.254',
    'Storage Server,Dell,server,4,800,4,10,192.168.1.100',
  ];

  return [headers.join(','), ...examples].join('\n');
}

/**
 * Download CSV template
 */
export function downloadCSVTemplate(): void {
  const csvContent = generateCSVTemplate();
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'device-import-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Batch create multiple devices
 */
export async function batchCreateDevices(
  devices: Device[],
  onProgress?: (current: number, total: number) => void
): Promise<{ success: Device[]; failed: Array<{ device: Device; error: string }> }> {
  const success: Device[] = [];
  const failed: Array<{ device: Device; error: string }> = [];

  for (let i = 0; i < devices.length; i++) {
    const device = devices[i];
    
    if (onProgress) {
      onProgress(i + 1, devices.length);
    }

    try {
      // Simulate API call - replace with actual API call
      // const created = await DeviceService.createDevice(device);
      if (device) {
        success.push(device);
      }
    } catch (error) {
      if (device) {
        failed.push({
          device,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  return { success, failed };
}

/**
 * Show bulk import results as toast notifications
 */
export function showBulkImportResults(result: BulkImportResult): void {
  if (result.success) {
    toast.success(`Successfully imported ${result.imported} device(s)`);
  } else {
    const summary = `Imported: ${result.imported}, Failed: ${result.failed}`;
    
    if (result.errors.length > 0) {
      // Show first few errors
      const errorPreview = result.errors.slice(0, 3).join('\n');
      const moreErrors = result.errors.length > 3 ? `\n...and ${result.errors.length - 3} more` : '';
      
      toast.error(
        `${summary}\n\nErrors:\n${errorPreview}${moreErrors}`,
        { duration: 8000 }
      );
    } else {
      toast.error(summary);
    }
  }
}

/**
 * Export CSV template with current devices as examples
 */
export function generateCSVFromDevices(devices: Device[]): string {
  const headers = [
    'name',
    'manufacturer',
    'device_type',
    'size_u',
    'power_draw',
    'port_count',
    'position_u',
    'management_ip',
  ];

  const rows = devices.map(device => [
    device.name,
    device.manufacturer,
    device.device_type,
    device.size_u,
    '', // power_draw - not in Device type
    device.port_count || '',
    '', // position_u - not in Device type
    '', // management_ip - not in Device type
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}
