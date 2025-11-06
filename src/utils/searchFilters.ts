import { Device, RackConfiguration } from '../types/entities';

export interface SearchFilters {
  deviceType?: string[];
  manufacturer?: string[];
  sizeU?: { min?: number; max?: number };
  portCount?: { min?: number; max?: number };
  colorTag?: string[];
  location?: string;
}

/**
 * Filter racks based on criteria
 */
export function filterRacks(
  racks: RackConfiguration[],
  filters: SearchFilters
): RackConfiguration[] {
  return racks.filter(rack => {
    // Filter by size
    if (filters.sizeU) {
      if (filters.sizeU.min && rack.size_u < filters.sizeU.min) return false;
      if (filters.sizeU.max && rack.size_u > filters.sizeU.max) return false;
    }

    // Filter by color tag
    if (filters.colorTag && filters.colorTag.length > 0) {
      if (!filters.colorTag.includes(rack.color_tag)) return false;
    }

    // Filter by location
    if (filters.location) {
      if (!rack.location?.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Filter devices based on criteria
 */
export function filterDevices(
  devices: Device[],
  filters: SearchFilters
): Device[] {
  return devices.filter(device => {
    // Filter by device type
    if (filters.deviceType && filters.deviceType.length > 0) {
      if (!filters.deviceType.includes(device.device_type)) return false;
    }

    // Filter by manufacturer
    if (filters.manufacturer && filters.manufacturer.length > 0) {
      if (!filters.manufacturer.includes(device.manufacturer)) return false;
    }

    // Filter by size
    if (filters.sizeU) {
      if (filters.sizeU.min && device.size_u < filters.sizeU.min) return false;
      if (filters.sizeU.max && device.size_u > filters.sizeU.max) return false;
    }

    // Filter by port count
    if (filters.portCount && device.port_count) {
      if (filters.portCount.min && device.port_count < filters.portCount.min) return false;
      if (filters.portCount.max && device.port_count > filters.portCount.max) return false;
    }

    return true;
  });
}

/**
 * Search racks by query string
 */
export function searchRacks(
  racks: RackConfiguration[],
  query: string
): RackConfiguration[] {
  if (!query.trim()) return racks;

  const searchQuery = query.toLowerCase();
  return racks.filter(rack =>
    rack.name.toLowerCase().includes(searchQuery) ||
    rack.location?.toLowerCase().includes(searchQuery) ||
    rack.description?.toLowerCase().includes(searchQuery) ||
    rack.color_tag.toLowerCase().includes(searchQuery)
  );
}

/**
 * Search devices by query string
 */
export function searchDevices(
  devices: Device[],
  query: string
): Device[] {
  if (!query.trim()) return devices;

  const searchQuery = query.toLowerCase();
  return devices.filter(device =>
    device.name.toLowerCase().includes(searchQuery) ||
    device.manufacturer.toLowerCase().includes(searchQuery) ||
    device.model?.toLowerCase().includes(searchQuery) ||
    device.device_type.toLowerCase().includes(searchQuery) ||
    device.notes?.toLowerCase().includes(searchQuery)
  );
}

/**
 * Combine search and filter operations
 */
export function searchAndFilterRacks(
  racks: RackConfiguration[],
  query: string,
  filters: SearchFilters
): RackConfiguration[] {
  let results = racks;

  // Apply search first
  if (query.trim()) {
    results = searchRacks(results, query);
  }

  // Then apply filters
  results = filterRacks(results, filters);

  return results;
}

/**
 * Combine search and filter operations for devices
 */
export function searchAndFilterDevices(
  devices: Device[],
  query: string,
  filters: SearchFilters
): Device[] {
  let results = devices;

  // Apply search first
  if (query.trim()) {
    results = searchDevices(results, query);
  }

  // Then apply filters
  results = filterDevices(results, filters);

  return results;
}

/**
 * Get unique device types from devices array
 */
export function getUniqueDeviceTypes(devices: Device[]): string[] {
  return [...new Set(devices.map(d => d.device_type))].sort();
}

/**
 * Get unique manufacturers from devices array
 */
export function getUniqueManufacturers(devices: Device[]): string[] {
  return [...new Set(devices.map(d => d.manufacturer))].sort();
}

/**
 * Get unique color tags from racks array
 */
export function getUniqueColorTags(racks: RackConfiguration[]): string[] {
  return [...new Set(racks.map(r => r.color_tag))].sort();
}

/**
 * Get unique locations from racks array
 */
export function getUniqueLocations(racks: RackConfiguration[]): string[] {
  return [...new Set(racks.map(r => r.location).filter(Boolean) as string[])].sort();
}

/**
 * Sort racks by various criteria
 */
export function sortRacks(
  racks: RackConfiguration[],
  sortBy: 'name' | 'size' | 'location' | 'date',
  order: 'asc' | 'desc' = 'asc'
): RackConfiguration[] {
  const sorted = [...racks].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'size':
        comparison = a.size_u - b.size_u;
        break;
      case 'location':
        comparison = (a.location || '').localeCompare(b.location || '');
        break;
      case 'date':
        comparison = (a.created_date || '').localeCompare(b.created_date || '');
        break;
    }

    return order === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Sort devices by various criteria
 */
export function sortDevices(
  devices: Device[],
  sortBy: 'name' | 'type' | 'manufacturer' | 'size' | 'position',
  order: 'asc' | 'desc' = 'asc'
): Device[] {
  const sorted = [...devices].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'type':
        comparison = a.device_type.localeCompare(b.device_type);
        break;
      case 'manufacturer':
        comparison = a.manufacturer.localeCompare(b.manufacturer);
        break;
      case 'size':
        comparison = a.size_u - b.size_u;
        break;
      case 'position':
        comparison = a.position_u - b.position_u;
        break;
    }

    return order === 'asc' ? comparison : -comparison;
  });

  return sorted;
}
