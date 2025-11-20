import { motion } from 'framer-motion';
import { Activity, Calendar, Download, Filter, Search, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import {
  type ActivityAction,
  type ActivityCategory,
  type ActivityFilter,
  type ActivityLogEntry,
  type EntityType,
  clearOldLogs,
  exportActivityLogsCSV,
  filterActivityLogs,
  getActivityLogs,
  getActivityStats,
  getActivityTimeline,
  groupLogsByDate,
} from '../utils/activityLog';

export default function ActivityHistory() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLogEntry[]>([]);
  const [filter, setFilter] = useState<ActivityFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<ActivityAction | ''>('');
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType | ''>('');
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | ''>('');
  const [selectedSeverity, setSelectedSeverity] = useState<'info' | 'warning' | 'error' | 'success' | ''>('');

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, filter, searchTerm]);

  const loadLogs = () => {
    const allLogs = getActivityLogs();
    setLogs(allLogs);
  };

  const applyFilters = () => {
    let filtered = filterActivityLogs(logs, filter);

    // Apply search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.entityName?.toLowerCase().includes(lowerSearch) ||
        log.action.toLowerCase().includes(lowerSearch) ||
        log.entityType.toLowerCase().includes(lowerSearch)
      );
    }

    setFilteredLogs(filtered);
  };

  const handleClearFilters = () => {
    setFilter({});
    setSearchTerm('');
    setSelectedAction('');
    setSelectedEntityType('');
    setSelectedCategory('');
    setSelectedSeverity('');
  };

  const handleApplyFilters = () => {
    const newFilter: ActivityFilter = {
      searchTerm: searchTerm || undefined,
      actions: selectedAction ? [selectedAction] : undefined,
      entityTypes: selectedEntityType ? [selectedEntityType] : undefined,
      categories: selectedCategory ? [selectedCategory] : undefined,
      severity: selectedSeverity ? [selectedSeverity] : undefined,
    };
    setFilter(newFilter);
    setShowFilters(false);
  };

  const handleExportCSV = () => {
    const csv = exportActivityLogsCSV(filteredLogs);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity_log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Activity log exported to CSV');
  };

  const handleClearOldLogs = () => {
    if (confirm('This will keep only the most recent 1000 log entries. Continue?')) {
      clearOldLogs();
      loadLogs();
      toast.success('Old activity logs cleared');
    }
  };

  const stats = getActivityStats(logs);
  const groupedLogs = groupLogsByDate(filteredLogs);
  const timeline = getActivityTimeline(logs, 'day');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success': return 'from-green-500 to-emerald-600';
      case 'warning': return 'from-yellow-500 to-amber-600';
      case 'error': return 'from-red-500 to-rose-600';
      default: return 'from-blue-500 to-cyan-600';
    }
  };

  const getActionIcon = (action: ActivityAction) => {
    const icons: Record<ActivityAction, string> = {
      create: '➕',
      update: '✏️',
      delete: '🗑️',
      clone: '📋',
      move: '↔️',
      connect: '🔗',
      disconnect: '⛓️‍💥',
      import: '📥',
      export: '📤',
      backup: '💾',
      restore: '♻️',
    };
    return icons[action] || '📝';
  };

  return (
    <div className="min-h-screen p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="glass-card border-white/10 rounded-2xl p-8 mb-8">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center glow">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold gradient-text mb-3">Activity History</h1>
                <p className="text-gray-300 text-lg">Track all configuration changes and user actions</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="glass-button text-white hover:bg-white/10"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-5 h-5 mr-2" />
                Filters
              </Button>
              <Button
                variant="ghost"
                className="glass-button text-white hover:bg-white/10"
                onClick={handleExportCSV}
              >
                <Download className="w-5 h-5 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="ghost"
                className="glass-button text-red-400 hover:bg-red-500/20"
                onClick={handleClearOldLogs}
              >
                <Trash2 className="w-5 h-5 mr-2" />
                Clear Old
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="glass-card border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-400">Total Activities</p>
                <Activity className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalActions}</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-400">Today</p>
                <Calendar className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-white">{timeline.filter(t => {
                const today = new Date().toDateString();
                return t.date.toDateString() === today;
              })[0]?.count || 0}</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-400">Most Active Day</p>
                <Calendar className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.mostActiveDay ? new Date(stats.mostActiveDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-400">Filtered Results</p>
                <Search className="w-5 h-5 text-cyan-400" />
              </div>
              <p className="text-3xl font-bold text-white">{filteredLogs.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="glass-card border-white/10 rounded-xl p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search by entity name, action, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 glass-input border-white/10 text-white placeholder:text-gray-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card border-white/10 rounded-xl p-6 mb-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label className="text-sm font-medium text-gray-400 mb-2">Action</Label>
                <Select
                  value={selectedAction}
                  onValueChange={(value) => setSelectedAction(value as ActivityAction)}
                  className="glass-input border-white/10 text-white"
                >
                  <option value="">All Actions</option>
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="delete">Delete</option>
                  <option value="clone">Clone</option>
                  <option value="move">Move</option>
                  <option value="connect">Connect</option>
                  <option value="disconnect">Disconnect</option>
                  <option value="import">Import</option>
                  <option value="export">Export</option>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-400 mb-2">Entity Type</Label>
                <Select
                  value={selectedEntityType}
                  onValueChange={(value) => setSelectedEntityType(value as EntityType)}
                  className="glass-input border-white/10 text-white"
                >
                  <option value="">All Types</option>
                  <option value="rack">Rack</option>
                  <option value="device">Device</option>
                  <option value="connection">Connection</option>
                  <option value="floor_plan">Floor Plan</option>
                  <option value="network_plan">Network Plan</option>
                  <option value="template">Template</option>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-400 mb-2">Category</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={(value) => setSelectedCategory(value as ActivityCategory)}
                  className="glass-input border-white/10 text-white"
                >
                  <option value="">All Categories</option>
                  <option value="rack_management">Rack Management</option>
                  <option value="device_management">Device Management</option>
                  <option value="network_configuration">Network Config</option>
                  <option value="data_management">Data Management</option>
                  <option value="user_settings">User Settings</option>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-400 mb-2">Severity</Label>
                <Select
                  value={selectedSeverity}
                  onValueChange={(value) => setSelectedSeverity(value as 'info' | 'warning' | 'error' | 'success' | '')}
                  className="glass-input border-white/10 text-white"
                >
                  <option value="">All Severities</option>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                className="glass-button text-white hover:bg-white/10"
                onClick={handleClearFilters}
              >
                Clear
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                onClick={handleApplyFilters}
              >
                Apply Filters
              </Button>
            </div>
          </motion.div>
        )}

        {/* Activity Log Timeline */}
        <div className="space-y-6">
          {Object.entries(groupedLogs).length === 0 ? (
            <div className="glass-card border-white/10 rounded-2xl p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center glass">
                <Activity className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">No Activity Yet</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Start managing your infrastructure and your activity will be tracked here
              </p>
            </div>
          ) : (
            Object.entries(groupedLogs).map(([date, dayLogs]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <h3 className="text-lg font-semibold text-white">
                    {new Date(date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>

                <div className="space-y-3">
                  {dayLogs.map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="glass-card border-white/10 hover:border-white/20 transition-all p-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getSeverityColor(log.severity)} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-lg">{getActionIcon(log.action)}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-white font-medium capitalize">{log.action}</span>
                                <Badge variant="outline" className="border-white/20 text-gray-400 text-xs">
                                  {log.entityType}
                                </Badge>
                                <Badge className={`bg-gradient-to-r ${getSeverityColor(log.severity)} text-white text-xs`}>
                                  {log.severity}
                                </Badge>
                              </div>
                              <p className="text-gray-300">
                                {log.entityName ? (
                                  <>
                                    <span className="font-medium text-white">{log.entityName}</span>
                                  </>
                                ) : (
                                  <span className="text-gray-400">Entity ID: {log.entityId}</span>
                                )}
                              </p>
                            </div>
                            <span className="text-sm text-gray-400 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>

                          {log.changes && (
                            <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10">
                              <p className="text-xs text-gray-400 mb-1">Changed: {log.changes.field}</p>
                              <div className="flex gap-2 text-sm">
                                <span className="text-red-400 line-through">{String(log.changes.oldValue)}</span>
                                <span className="text-gray-400">→</span>
                                <span className="text-green-400">{String(log.changes.newValue)}</span>
                              </div>
                            </div>
                          )}

                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div className="mt-2 flex gap-2 flex-wrap">
                              {Object.entries(log.metadata).map(([key, value]) => (
                                <Badge key={key} variant="outline" className="border-white/10 text-gray-400 text-xs">
                                  {key}: {String(value)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
