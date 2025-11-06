/**
 * Advanced Search and Filtering Utilities
 * Global search, multi-criteria filtering across all data types
 */

import type { Connection, CustomDevice, Device, NetworkPlan, Port, RackConfiguration } from '../types/entities';

export interface SearchResult {
  type: 'rack' | 'device' | 'connection' | 'port' | 'custom-device' | 'network-plan';
  id: string;
  name: string;
  description?: string;
  matchedFields: string[];
  relevanceScore: number;
  metadata?: Record<string, unknown>;
}

export interface SearchFilters {
  types?: SearchResult['type'][];
  manufacturers?: string[];
  deviceTypes?: Device['device_type'][];
  racks?: string[];
  minSizeU?: number;
  maxSizeU?: number;
  minPowerWatts?: number;
  maxPowerWatts?: number;
  hasNotes?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface AdvancedSearchQuery {
  query: string;
  filters?: SearchFilters;
  sortBy?: 'relevance' | 'name' | 'type' | 'date';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

/**
 * Perform global search across all data types
 */
export function globalSearch(
  query: string,
  data: {
    racks?: RackConfiguration[];
    devices?: Device[];
    connections?: Connection[];
    ports?: Port[];
    customDevices?: CustomDevice[];
    networkPlans?: NetworkPlan[];
  },
  filters?: SearchFilters
): SearchResult[] {
  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  // Search racks
  if (data.racks && (!filters?.types || filters.types.includes('rack'))) {
    data.racks.forEach((rack) => {
      const matches = searchInObject(rack, lowerQuery, [
        'name',
        'location',
        'description',
      ]);

      if (matches.length > 0 || !query) {
        results.push({
          type: 'rack',
          id: rack.id,
          name: rack.name,
          description: rack.description,
          matchedFields: matches,
          relevanceScore: calculateRelevance(matches, lowerQuery, rack.name),
          metadata: {
            size_u: rack.size_u,
            location: rack.location,
            color_tag: rack.color_tag,
          },
        });
      }
    });
  }

  // Search devices
  if (data.devices && (!filters?.types || filters.types.includes('device'))) {
    data.devices.forEach((device) => {
      const matches = searchInObject(device, lowerQuery, [
        'name',
        'manufacturer',
        'model',
        'device_type',
        'notes',
      ]);

      if (matches.length > 0 || !query) {
        const passesFilters = checkDeviceFilters(device, filters);

        if (passesFilters) {
          results.push({
            type: 'device',
            id: device.id,
            name: device.name,
            description: device.notes,
            matchedFields: matches,
            relevanceScore: calculateRelevance(matches, lowerQuery, device.name),
            metadata: {
              manufacturer: device.manufacturer,
              device_type: device.device_type,
              size_u: device.size_u,
              position_u: device.position_u,
              rack_config_id: device.rack_config_id,
            },
          });
        }
      }
    });
  }

  // Search connections
  if (data.connections && (!filters?.types || filters.types.includes('connection'))) {
    data.connections.forEach((conn) => {
      const matches = searchInObject(conn, lowerQuery, [
        'source_port',
        'destination_port',
        'cable_type',
        'description',
        'vlan',
      ]);

      if (matches.length > 0 || !query) {
        results.push({
          type: 'connection',
          id: conn.id,
          name: `${conn.source_port} → ${conn.destination_port}`,
          description: conn.description,
          matchedFields: matches,
          relevanceScore: calculateRelevance(matches, lowerQuery, ''),
          metadata: {
            cable_type: conn.cable_type,
            cable_length_ft: conn.cable_length_ft,
            vlan: conn.vlan,
          },
        });
      }
    });
  }

  // Search ports
  if (data.ports && (!filters?.types || filters.types.includes('port'))) {
    data.ports.forEach((port) => {
      const matches = searchInObject(port, lowerQuery, [
        'port_number',
        'port_type',
        'description',
        'vlan',
        'notes',
      ]);

      if (matches.length > 0 || !query) {
        results.push({
          type: 'port',
          id: port.id,
          name: `Port ${port.port_number}`,
          description: port.description,
          matchedFields: matches,
          relevanceScore: calculateRelevance(matches, lowerQuery, port.port_number),
          metadata: {
            port_type: port.port_type,
            status: port.status,
            speed: port.speed,
            device_id: port.device_id,
          },
        });
      }
    });
  }

  // Search custom devices
  if (data.customDevices && (!filters?.types || filters.types.includes('custom-device'))) {
    data.customDevices.forEach((device) => {
      const matches = searchInObject(device, lowerQuery, [
        'name',
        'manufacturer',
        'model',
        'device_type',
        'description',
      ]);

      if (matches.length > 0 || !query) {
        results.push({
          type: 'custom-device',
          id: device.id,
          name: device.name,
          description: device.description,
          matchedFields: matches,
          relevanceScore: calculateRelevance(matches, lowerQuery, device.name),
          metadata: {
            manufacturer: device.manufacturer,
            device_type: device.device_type,
            size_u: device.size_u,
          },
        });
      }
    });
  }

  // Search network plans
  if (data.networkPlans && (!filters?.types || filters.types.includes('network-plan'))) {
    data.networkPlans.forEach((plan) => {
      const matches = searchInObject(plan, lowerQuery, [
        'name',
        'facility_size',
        'notes',
      ]);

      if (matches.length > 0 || !query) {
        results.push({
          type: 'network-plan',
          id: plan.id,
          name: plan.name,
          description: plan.notes,
          matchedFields: matches,
          relevanceScore: calculateRelevance(matches, lowerQuery, plan.name),
          metadata: {
            facility_size: plan.facility_size,
            total_devices: plan.total_devices,
          },
        });
      }
    });
  }

  return results;
}

/**
 * Search for a query string within an object's specified fields
 */
function searchInObject(
  obj: unknown,
  query: string,
  fields: string[]
): string[] {
  const matches: string[] = [];
  const record = obj as Record<string, unknown>;

  fields.forEach((field) => {
    const value = record[field];
    if (value && String(value).toLowerCase().includes(query)) {
      matches.push(field);
    }
  });

  return matches;
}

/**
 * Calculate relevance score based on matches
 */
function calculateRelevance(
  matchedFields: string[],
  query: string,
  name: string
): number {
  let score = 0;

  // Exact name match gets highest score
  if (name.toLowerCase() === query) {
    score += 100;
  } else if (name.toLowerCase().includes(query)) {
    score += 50;
  }

  // Each matched field adds to score
  score += matchedFields.length * 10;

  // Name field match is worth more
  if (matchedFields.includes('name')) {
    score += 20;
  }

  return score;
}

/**
 * Check if device passes filter criteria
 */
function checkDeviceFilters(device: Device, filters?: SearchFilters): boolean {
  if (!filters) return true;

  if (filters.manufacturers && !filters.manufacturers.includes(device.manufacturer)) {
    return false;
  }

  if (filters.deviceTypes && !filters.deviceTypes.includes(device.device_type)) {
    return false;
  }

  if (filters.racks && !filters.racks.includes(device.rack_config_id)) {
    return false;
  }

  if (filters.minSizeU !== undefined && device.size_u < filters.minSizeU) {
    return false;
  }

  if (filters.maxSizeU !== undefined && device.size_u > filters.maxSizeU) {
    return false;
  }

  if (filters.minPowerWatts !== undefined && (device.power_watts || 0) < filters.minPowerWatts) {
    return false;
  }

  if (filters.maxPowerWatts !== undefined && (device.power_watts || 0) > filters.maxPowerWatts) {
    return false;
  }

  if (filters.hasNotes !== undefined) {
    const hasNotes = Boolean(device.notes && device.notes.trim().length > 0);
    if (filters.hasNotes !== hasNotes) {
      return false;
    }
  }

  return true;
}

/**
 * Sort search results
 */
export function sortSearchResults(
  results: SearchResult[],
  sortBy: 'relevance' | 'name' | 'type' | 'date' = 'relevance',
  order: 'asc' | 'desc' = 'desc'
): SearchResult[] {
  const sorted = [...results];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'relevance':
        comparison = a.relevanceScore - b.relevanceScore;
        break;

      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;

      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;

      case 'date':
        // Assuming metadata contains created_date
        const dateA = String(a.metadata?.created_date || '');
        const dateB = String(b.metadata?.created_date || '');
        comparison = dateA.localeCompare(dateB);
        break;
    }

    return order === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Filter results by multiple criteria
 */
export function applyFilters(
  results: SearchResult[],
  filters: SearchFilters
): SearchResult[] {
  return results.filter((result) => {
    if (filters.types && !filters.types.includes(result.type)) {
      return false;
    }

    // Apply metadata filters
    if (result.type === 'device' && result.metadata) {
      if (filters.manufacturers && !filters.manufacturers.includes(String(result.metadata.manufacturer))) {
        return false;
      }

      if (filters.deviceTypes && !filters.deviceTypes.includes(result.metadata.device_type as Device['device_type'])) {
        return false;
      }

      if (filters.racks && !filters.racks.includes(String(result.metadata.rack_config_id))) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Group search results by type
 */
export function groupResultsByType(results: SearchResult[]): Record<string, SearchResult[]> {
  const grouped: Record<string, SearchResult[]> = {};

  results.forEach((result) => {
    if (!grouped[result.type]) {
      grouped[result.type] = [];
    }
    grouped[result.type]!.push(result);
  });

  return grouped;
}

/**
 * Get search suggestions based on query
 */
export function getSearchSuggestions(
  query: string,
  data: {
    racks?: RackConfiguration[];
    devices?: Device[];
  }
): string[] {
  const suggestions = new Set<string>();
  const lowerQuery = query.toLowerCase();

  // Get device names
  data.devices?.forEach((device) => {
    if (device.name.toLowerCase().includes(lowerQuery)) {
      suggestions.add(device.name);
    }
    if (device.manufacturer.toLowerCase().includes(lowerQuery)) {
      suggestions.add(device.manufacturer);
    }
    if (device.model?.toLowerCase().includes(lowerQuery)) {
      suggestions.add(device.model);
    }
  });

  // Get rack names
  data.racks?.forEach((rack) => {
    if (rack.name.toLowerCase().includes(lowerQuery)) {
      suggestions.add(rack.name);
    }
    if (rack.location?.toLowerCase().includes(lowerQuery)) {
      suggestions.add(rack.location);
    }
  });

  return Array.from(suggestions).slice(0, 10); // Limit to 10 suggestions
}

/**
 * Highlight matched text in search results
 */
export function highlightMatches(text: string, query: string): string {
  if (!query) return text;

  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Get filter statistics
 */
export function getFilterStats(
  allResults: SearchResult[],
  filteredResults: SearchResult[]
): {
  total: number;
  filtered: number;
  byType: Record<string, number>;
  percentageFiltered: number;
} {
  const byType: Record<string, number> = {};

  filteredResults.forEach((result) => {
    byType[result.type] = (byType[result.type] || 0) + 1;
  });

  const percentageFiltered =
    allResults.length > 0 ? (filteredResults.length / allResults.length) * 100 : 0;

  return {
    total: allResults.length,
    filtered: filteredResults.length,
    byType,
    percentageFiltered: parseFloat(percentageFiltered.toFixed(2)),
  };
}

/**
 * Advanced search with query and filters
 */
export function advancedSearch(
  searchQuery: AdvancedSearchQuery,
  data: {
    racks?: RackConfiguration[];
    devices?: Device[];
    connections?: Connection[];
    ports?: Port[];
    customDevices?: CustomDevice[];
    networkPlans?: NetworkPlan[];
  }
): SearchResult[] {
  // Perform global search
  let results = globalSearch(searchQuery.query, data, searchQuery.filters);

  // Apply additional filters
  if (searchQuery.filters) {
    results = applyFilters(results, searchQuery.filters);
  }

  // Sort results
  results = sortSearchResults(
    results,
    searchQuery.sortBy || 'relevance',
    searchQuery.sortOrder || 'desc'
  );

  // Apply limit
  if (searchQuery.limit) {
    results = results.slice(0, searchQuery.limit);
  }

  return results;
}

/**
 * Save search query for history
 */
export function saveSearchQuery(
  query: string,
  filters?: SearchFilters
): { id: string; query: string; filters?: SearchFilters; timestamp: Date } {
  return {
    id: `search-${Date.now()}`,
    query,
    filters,
    timestamp: new Date(),
  };
}

/**
 * Export search results as CSV
 */
export function exportSearchResultsCSV(results: SearchResult[]): string {
  const headers = ['Type', 'Name', 'Description', 'Matched Fields', 'Relevance Score'];
  const rows = results.map((result) => [
    result.type,
    result.name,
    result.description || '',
    result.matchedFields.join('; '),
    result.relevanceScore,
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}
