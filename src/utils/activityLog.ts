/**
 * Activity Log Utilities
 * Track configuration changes, user actions, and system events
 */

import type { Connection, Device, RackConfiguration } from '../types/entities';

export interface ActivityLogEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  action: ActivityAction;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  changes?: ChangeDetails;
  metadata?: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error' | 'success';
  category: ActivityCategory;
}

export type ActivityAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'clone'
  | 'move'
  | 'connect'
  | 'disconnect'
  | 'import'
  | 'export'
  | 'backup'
  | 'restore';

export type EntityType =
  | 'rack'
  | 'device'
  | 'connection'
  | 'floor_plan'
  | 'network_plan'
  | 'template'
  | 'configuration'
  | 'user'
  | 'preferences';

export type ActivityCategory =
  | 'rack_management'
  | 'device_management'
  | 'network_configuration'
  | 'data_management'
  | 'user_settings'
  | 'system';

export interface ChangeDetails {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  description?: string;
}

export interface ActivityFilter {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  actions?: ActivityAction[];
  entityTypes?: EntityType[];
  categories?: ActivityCategory[];
  severity?: Array<'info' | 'warning' | 'error' | 'success'>;
  searchTerm?: string;
}

/**
 * Log an activity entry
 */
export function logActivity(
  action: ActivityAction,
  entityType: EntityType,
  entityId: string,
  options?: {
    entityName?: string;
    changes?: ChangeDetails[];
    metadata?: Record<string, unknown>;
    severity?: 'info' | 'warning' | 'error' | 'success';
    userId?: string;
  }
): ActivityLogEntry {
  const category = determineCategory(entityType, action);

  const entry: ActivityLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    userId: options?.userId,
    action,
    entityType,
    entityId,
    entityName: options?.entityName,
    changes: options?.changes?.[0], // Store first change for simplicity
    metadata: options?.metadata,
    severity: options?.severity || 'info',
    category,
  };

  // Store in localStorage (in production, this would go to a backend)
  saveActivityLog(entry);

  return entry;
}

/**
 * Determine activity category based on entity type and action
 */
function determineCategory(
  entityType: EntityType,
  _action: ActivityAction
): ActivityCategory {
  switch (entityType) {
    case 'rack':
      return 'rack_management';
    case 'device':
      return 'device_management';
    case 'connection':
    case 'network_plan':
      return 'network_configuration';
    case 'template':
    case 'configuration':
      return 'data_management';
    case 'user':
    case 'preferences':
      return 'user_settings';
    default:
      return 'system';
  }
}

/**
 * Save activity log entry to storage
 */
function saveActivityLog(entry: ActivityLogEntry): void {
  try {
    const logs = getActivityLogs();
    logs.unshift(entry); // Add to beginning

    // Keep only last 1000 entries
    const trimmed = logs.slice(0, 1000);

    localStorage.setItem(
      'activity_logs',
      JSON.stringify(trimmed.map((log) => ({ ...log, timestamp: log.timestamp.toISOString() })))
    );
  } catch (error) {
    console.error('Failed to save activity log:', error);
  }
}

/**
 * Get all activity logs from storage
 */
export function getActivityLogs(): ActivityLogEntry[] {
  try {
    const stored = localStorage.getItem('activity_logs');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((log: { timestamp: string }) => ({
        ...log,
        timestamp: new Date(log.timestamp),
      }));
    }
  } catch (error) {
    console.error('Failed to load activity logs:', error);
  }
  return [];
}

/**
 * Filter activity logs
 */
export function filterActivityLogs(
  logs: ActivityLogEntry[],
  filter: ActivityFilter
): ActivityLogEntry[] {
  return logs.filter((log) => {
    if (filter.startDate && log.timestamp < filter.startDate) return false;
    if (filter.endDate && log.timestamp > filter.endDate) return false;
    if (filter.userId && log.userId !== filter.userId) return false;
    if (filter.actions && !filter.actions.includes(log.action)) return false;
    if (filter.entityTypes && !filter.entityTypes.includes(log.entityType))
      return false;
    if (filter.categories && !filter.categories.includes(log.category))
      return false;
    if (filter.severity && !filter.severity.includes(log.severity))
      return false;
    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      const searchableText = `${log.action} ${log.entityType} ${log.entityName || ''} ${JSON.stringify(log.metadata || {})}`.toLowerCase();
      if (!searchableText.includes(term)) return false;
    }
    return true;
  });
}

/**
 * Group logs by date
 */
export function groupLogsByDate(
  logs: ActivityLogEntry[]
): Map<string, ActivityLogEntry[]> {
  const grouped = new Map<string, ActivityLogEntry[]>();

  logs.forEach((log) => {
    const dateKey = log.timestamp.toLocaleDateString();
    const existing = grouped.get(dateKey) || [];
    existing.push(log);
    grouped.set(dateKey, existing);
  });

  return grouped;
}

/**
 * Group logs by category
 */
export function groupLogsByCategory(
  logs: ActivityLogEntry[]
): Map<ActivityCategory, ActivityLogEntry[]> {
  const grouped = new Map<ActivityCategory, ActivityLogEntry[]>();

  logs.forEach((log) => {
    const existing = grouped.get(log.category) || [];
    existing.push(log);
    grouped.set(log.category, existing);
  });

  return grouped;
}

/**
 * Get activity statistics
 */
export function getActivityStats(
  logs: ActivityLogEntry[]
): {
  totalActions: number;
  actionCounts: Map<ActivityAction, number>;
  categoryCounts: Map<ActivityCategory, number>;
  severityCounts: Map<string, number>;
  mostActiveDay: { date: string; count: number } | null;
  recentActivity: ActivityLogEntry[];
} {
  const actionCounts = new Map<ActivityAction, number>();
  const categoryCounts = new Map<ActivityCategory, number>();
  const severityCounts = new Map<string, number>();
  const dayCounts = new Map<string, number>();

  logs.forEach((log) => {
    actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
    categoryCounts.set(
      log.category,
      (categoryCounts.get(log.category) || 0) + 1
    );
    severityCounts.set(
      log.severity,
      (severityCounts.get(log.severity) || 0) + 1
    );

    const dateKey = log.timestamp.toLocaleDateString();
    dayCounts.set(dateKey, (dayCounts.get(dateKey) || 0) + 1);
  });

  let mostActiveDay: { date: string; count: number } | null = null;
  dayCounts.forEach((count, date) => {
    if (!mostActiveDay || count > mostActiveDay.count) {
      mostActiveDay = { date, count };
    }
  });

  return {
    totalActions: logs.length,
    actionCounts,
    categoryCounts,
    severityCounts,
    mostActiveDay,
    recentActivity: logs.slice(0, 10),
  };
}

/**
 * Log device creation
 */
export function logDeviceCreate(device: Device, rackId: string): void {
  logActivity('create', 'device', device.id, {
    entityName: device.name,
    metadata: {
      rackId,
      manufacturer: device.manufacturer,
      model: device.model,
      size_u: device.size_u,
    },
    severity: 'success',
  });
}

/**
 * Log device update
 */
export function logDeviceUpdate(
  device: Device,
  changes: ChangeDetails[]
): void {
  logActivity('update', 'device', device.id, {
    entityName: device.name,
    changes,
    severity: 'info',
  });
}

/**
 * Log device deletion
 */
export function logDeviceDelete(device: Device): void {
  logActivity('delete', 'device', device.id, {
    entityName: device.name,
    severity: 'warning',
  });
}

/**
 * Log rack creation
 */
export function logRackCreate(rack: RackConfiguration): void {
  logActivity('create', 'rack', rack.id, {
    entityName: rack.name,
    metadata: {
      size_u: rack.size_u,
      color_tag: rack.color_tag,
    },
    severity: 'success',
  });
}

/**
 * Log rack update
 */
export function logRackUpdate(
  rack: RackConfiguration,
  changes: ChangeDetails[]
): void {
  logActivity('update', 'rack', rack.id, {
    entityName: rack.name,
    changes,
    severity: 'info',
  });
}

/**
 * Log connection creation
 */
export function logConnectionCreate(connection: Connection): void {
  logActivity('connect', 'connection', connection.id, {
    metadata: {
      source_device_id: connection.source_device_id,
      destination_device_id: connection.destination_device_id,
      cable_type: connection.cable_type,
    },
    severity: 'success',
  });
}

/**
 * Log connection deletion
 */
export function logConnectionDelete(connection: Connection): void {
  logActivity('disconnect', 'connection', connection.id, {
    metadata: {
      source_device_id: connection.source_device_id,
      destination_device_id: connection.destination_device_id,
    },
    severity: 'info',
  });
}

/**
 * Export activity logs as CSV
 */
export function exportActivityLogsCSV(logs: ActivityLogEntry[]): string {
  const headers = [
    'Timestamp',
    'Action',
    'Entity Type',
    'Entity Name',
    'Category',
    'Severity',
    'Changes',
  ];

  const rows = logs.map((log) => [
    log.timestamp.toISOString(),
    log.action,
    log.entityType,
    log.entityName || '',
    log.category,
    log.severity,
    log.changes
      ? `${log.changes.field}: ${log.changes.oldValue} → ${log.changes.newValue}`
      : '',
  ]);

  return [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');
}

/**
 * Clear old activity logs (older than specified days)
 */
export function clearOldLogs(daysToKeep: number = 30): number {
  const logs = getActivityLogs();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const filtered = logs.filter((log) => log.timestamp >= cutoffDate);
  const removedCount = logs.length - filtered.length;

  localStorage.setItem(
    'activity_logs',
    JSON.stringify(filtered.map((log) => ({ ...log, timestamp: log.timestamp.toISOString() })))
  );

  return removedCount;
}

/**
 * Get activity timeline for visualization
 */
export function getActivityTimeline(
  logs: ActivityLogEntry[],
  groupBy: 'hour' | 'day' | 'week' | 'month' = 'day'
): Array<{ period: string; count: number; date: Date }> {
  const timeline = new Map<string, { count: number; date: Date }>();

  logs.forEach((log) => {
    let key: string;
    let groupDate: Date;

    switch (groupBy) {
      case 'hour':
        groupDate = new Date(log.timestamp);
        groupDate.setMinutes(0, 0, 0);
        key = groupDate.toISOString();
        break;
      case 'week':
        groupDate = new Date(log.timestamp);
        const day = groupDate.getDay();
        groupDate.setDate(groupDate.getDate() - day);
        groupDate.setHours(0, 0, 0, 0);
        key = groupDate.toISOString();
        break;
      case 'month':
        groupDate = new Date(log.timestamp.getFullYear(), log.timestamp.getMonth(), 1);
        key = groupDate.toISOString();
        break;
      default: // day
        groupDate = new Date(log.timestamp);
        groupDate.setHours(0, 0, 0, 0);
        key = groupDate.toISOString();
    }

    const existing = timeline.get(key);
    if (existing) {
      existing.count++;
    } else {
      timeline.set(key, { count: 1, date: groupDate });
    }
  });

  return Array.from(timeline.entries())
    .map(([period, data]) => ({ period, ...data }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Search activity logs with advanced options
 */
export function searchActivityLogs(
  searchTerm: string,
  options?: {
    fuzzy?: boolean;
    caseSensitive?: boolean;
    fields?: Array<keyof ActivityLogEntry>;
  }
): ActivityLogEntry[] {
  const logs = getActivityLogs();
  const term = options?.caseSensitive ? searchTerm : searchTerm.toLowerCase();
  const fields = options?.fields || ['action', 'entityType', 'entityName'];

  return logs.filter((log) => {
    return fields.some((field) => {
      const value = log[field];
      if (!value) return false;

      const strValue = options?.caseSensitive
        ? String(value)
        : String(value).toLowerCase();

      if (options?.fuzzy) {
        // Simple fuzzy matching: check if all characters appear in order
        let termIndex = 0;
        for (const char of strValue) {
          if (char === term[termIndex]) {
            termIndex++;
            if (termIndex === term.length) return true;
          }
        }
        return false;
      } else {
        return strValue.includes(term);
      }
    });
  });
}
