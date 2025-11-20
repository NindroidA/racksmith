import { Camera, CheckCircle2, Mail, Save, User as UserIcon, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import {
    applyTheme,
    getPreferenceSummary,
    loadPreferences,
    savePreferences,
    updateDefaultPreferences,
    updateNotificationPreferences,
    updateThemePreferences,
    updateViewPreferences,
    UserPreferences
} from '../utils/userPreferences';

export default function UserProfile() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences());
  const [activeTab, setActiveTab] = useState<'profile' | 'theme' | 'defaults' | 'view' | 'notifications'>('profile');
  
  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
  }, [user]);

  const handleSaveProfile = () => {
    // Update user in localStorage (mock)
    if (user) {
      const updatedUser = { ...user, name, email };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('Profile updated successfully');
      setHasChanges(false);
    }
  };

  const handleSavePreferences = () => {
    savePreferences(preferences);
    applyTheme(preferences.theme);
    toast.success('Preferences saved successfully');
    setHasChanges(false);
  };

  const handleThemeChange = (updates: Partial<typeof preferences.theme>) => {
    const updated = updateThemePreferences(preferences, updates);
    setPreferences(updated);
    setHasChanges(true);
  };

  const handleDefaultsChange = (updates: Partial<typeof preferences.defaults>) => {
    const updated = updateDefaultPreferences(preferences, updates);
    setPreferences(updated);
    setHasChanges(true);
  };

  const handleViewChange = (updates: Partial<typeof preferences.view>) => {
    const updated = updateViewPreferences(preferences, updates);
    setPreferences(updated);
    setHasChanges(true);
  };

  const handleNotificationsChange = (updates: Partial<typeof preferences.notifications>) => {
    const updated = updateNotificationPreferences(preferences, updates);
    setPreferences(updated);
    setHasChanges(true);
  };

  const summary = getPreferenceSummary(preferences);

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: UserIcon },
    { id: 'theme' as const, label: 'Theme', icon: Camera },
    { id: 'defaults' as const, label: 'Defaults', icon: Save },
    { id: 'view' as const, label: 'View', icon: Camera },
    { id: 'notifications' as const, label: 'Notifications', icon: Mail },
  ];

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card border-white/10 rounded-2xl p-8"
        >
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center glow">
              <UserIcon className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold gradient-text mb-3">User Profile</h1>
              <p className="text-gray-300 text-lg">Manage your account settings and preferences</p>
            </div>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="glass-card border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Camera className="w-5 h-5 text-blue-400" />
                <div className="text-sm text-gray-400">Theme Mode</div>
              </div>
              <div className="text-2xl font-bold text-white capitalize">{summary.theme}</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className={`glass-card rounded-xl p-6 ${summary.autoSave ? 'border-green-500/20' : 'border-white/10'}`}>
              <div className="flex items-center gap-3 mb-3">
                <Save className="w-5 h-5 text-green-400" />
                <div className="text-sm text-gray-400">Auto-Save</div>
              </div>
              <div className="text-xl font-semibold flex items-center gap-2">
                {summary.autoSave ? (
                  <><CheckCircle2 className="w-5 h-5 text-green-400" /><span className="text-green-400">Enabled</span></>
                ) : (
                  <><XCircle className="w-5 h-5 text-red-400" /><span className="text-red-400">Disabled</span></>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className={`glass-card rounded-xl p-6 ${summary.notifications ? 'border-blue-500/20' : 'border-white/10'}`}>
              <div className="flex items-center gap-3 mb-3">
                <Mail className="w-5 h-5 text-blue-400" />
                <div className="text-sm text-gray-400">Notifications</div>
              </div>
              <div className="text-xl font-semibold flex items-center gap-2">
                {summary.notifications ? (
                  <><CheckCircle2 className="w-5 h-5 text-green-400" /><span className="text-green-400">Enabled</span></>
                ) : (
                  <><XCircle className="w-5 h-5 text-red-400" /><span className="text-red-400">Disabled</span></>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <div className="glass-card border-purple-500/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Camera className="w-5 h-5 text-purple-400" />
                <div className="text-sm text-gray-400">Customizations</div>
              </div>
              <div className="text-2xl font-bold text-white">{summary.customizations} <span className="text-base font-normal text-gray-400">Active</span></div>
            </div>
          </motion.div>
        </div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card border-white/10 rounded-2xl overflow-hidden"
        >
        {/* Tabs */}
        <div className="flex border-b border-white/10 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-fuchsia-500 text-fuchsia-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Profile Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setHasChanges(true); }}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setHasChanges(true); }}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">User ID</label>
                    <input
                      type="text"
                      value={user?.id || ''}
                      disabled
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    onClick={handleSaveProfile}
                    disabled={!hasChanges}
                    className="glass-button px-6 py-2 rounded-lg font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4 inline mr-2" />
                    Save Profile
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Theme Tab */}
          {activeTab === 'theme' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">Theme Settings</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Theme Mode</label>
                <select
                  value={preferences.theme.mode}
                  onChange={(e) => handleThemeChange({ mode: e.target.value as any })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="auto">Auto (System)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Font Size</label>
                <select
                  value={preferences.theme.fontSize}
                  onChange={(e) => handleThemeChange({ fontSize: e.target.value as any })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Spacing Density</label>
                <select
                  value={preferences.theme.density}
                  onChange={(e) => handleThemeChange({ density: e.target.value as any })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                >
                  <option value="compact">Compact</option>
                  <option value="comfortable">Comfortable</option>
                  <option value="spacious">Spacious</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Primary Color</label>
                <input
                  type="color"
                  value={preferences.theme.primaryColor}
                  onChange={(e) => handleThemeChange({ primaryColor: e.target.value })}
                  className="w-full h-12 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Accent Color</label>
                <input
                  type="color"
                  value={preferences.theme.accentColor}
                  onChange={(e) => handleThemeChange({ accentColor: e.target.value })}
                  className="w-full h-12 rounded-lg cursor-pointer"
                />
              </div>

              <button
                onClick={handleSavePreferences}
                disabled={!hasChanges}
                className="glass-button px-6 py-2 rounded-lg font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 inline mr-2" />
                Save Theme
              </button>
            </div>
          )}

          {/* Defaults Tab */}
          {activeTab === 'defaults' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">Default Settings</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Default Rack Size (U)</label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={preferences.defaults.rackSize_u}
                  onChange={(e) => handleDefaultsChange({ rackSize_u: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Default Rack Color</label>
                <select
                  value={preferences.defaults.rackColorTag}
                  onChange={(e) => handleDefaultsChange({ rackColorTag: e.target.value as any })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                >
                  <option value="blue">Blue</option>
                  <option value="purple">Purple</option>
                  <option value="cyan">Cyan</option>
                  <option value="green">Green</option>
                  <option value="orange">Orange</option>
                  <option value="red">Red</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Default Device Manufacturer</label>
                <input
                  type="text"
                  value={preferences.defaults.deviceManufacturer}
                  onChange={(e) => handleDefaultsChange({ deviceManufacturer: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Default Cable Type</label>
                <input
                  type="text"
                  value={preferences.defaults.cableType}
                  onChange={(e) => handleDefaultsChange({ cableType: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoSave"
                  checked={preferences.defaults.autoSave}
                  onChange={(e) => handleDefaultsChange({ autoSave: e.target.checked })}
                  className="w-4 h-4 rounded text-fuchsia-500 focus:ring-fuchsia-500"
                />
                <label htmlFor="autoSave" className="text-sm font-medium text-gray-300">Enable Auto-Save</label>
              </div>

              {preferences.defaults.autoSave && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Auto-Save Interval (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={preferences.defaults.autoSaveInterval}
                    onChange={(e) => handleDefaultsChange({ autoSaveInterval: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="confirmDelete"
                  checked={preferences.defaults.confirmDelete}
                  onChange={(e) => handleDefaultsChange({ confirmDelete: e.target.checked })}
                  className="w-4 h-4 rounded text-fuchsia-500 focus:ring-fuchsia-500"
                />
                <label htmlFor="confirmDelete" className="text-sm font-medium text-gray-300">Confirm before deleting</label>
              </div>

              <button
                onClick={handleSavePreferences}
                disabled={!hasChanges}
                className="glass-button px-6 py-2 rounded-lg font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 inline mr-2" />
                Save Defaults
              </button>
            </div>
          )}

          {/* View Tab */}
          {activeTab === 'view' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">View Preferences</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="showRackLabels"
                    checked={preferences.view.showRackLabels}
                    onChange={(e) => handleViewChange({ showRackLabels: e.target.checked })}
                    className="w-4 h-4 rounded text-fuchsia-500 focus:ring-fuchsia-500"
                  />
                  <label htmlFor="showRackLabels" className="text-sm font-medium text-gray-300">Show Rack Labels</label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="showUNumbers"
                    checked={preferences.view.showUNumbers}
                    onChange={(e) => handleViewChange({ showUNumbers: e.target.checked })}
                    className="w-4 h-4 rounded text-fuchsia-500 focus:ring-fuchsia-500"
                  />
                  <label htmlFor="showUNumbers" className="text-sm font-medium text-gray-300">Show U Numbers</label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="showPowerUsage"
                    checked={preferences.view.showPowerUsage}
                    onChange={(e) => handleViewChange({ showPowerUsage: e.target.checked })}
                    className="w-4 h-4 rounded text-fuchsia-500 focus:ring-fuchsia-500"
                  />
                  <label htmlFor="showPowerUsage" className="text-sm font-medium text-gray-300">Show Power Usage</label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="showPortStatus"
                    checked={preferences.view.showPortStatus}
                    onChange={(e) => handleViewChange({ showPortStatus: e.target.checked })}
                    className="w-4 h-4 rounded text-fuchsia-500 focus:ring-fuchsia-500"
                  />
                  <label htmlFor="showPortStatus" className="text-sm font-medium text-gray-300">Show Port Status</label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="gridView"
                    checked={preferences.view.gridView}
                    onChange={(e) => handleViewChange({ gridView: e.target.checked })}
                    className="w-4 h-4 rounded text-fuchsia-500 focus:ring-fuchsia-500"
                  />
                  <label htmlFor="gridView" className="text-sm font-medium text-gray-300">Grid View</label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="compactCards"
                    checked={preferences.view.compactCards}
                    onChange={(e) => handleViewChange({ compactCards: e.target.checked })}
                    className="w-4 h-4 rounded text-fuchsia-500 focus:ring-fuchsia-500"
                  />
                  <label htmlFor="compactCards" className="text-sm font-medium text-gray-300">Compact Cards</label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Items Per Page</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={preferences.view.itemsPerPage}
                  onChange={(e) => handleViewChange({ itemsPerPage: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Default Sort By</label>
                <select
                  value={preferences.view.defaultSortBy}
                  onChange={(e) => handleViewChange({ defaultSortBy: e.target.value as any })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                >
                  <option value="name">Name</option>
                  <option value="date">Date</option>
                  <option value="size">Size</option>
                  <option value="type">Type</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Default Sort Order</label>
                <select
                  value={preferences.view.defaultSortOrder}
                  onChange={(e) => handleViewChange({ defaultSortOrder: e.target.value as any })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>

              <button
                onClick={handleSavePreferences}
                disabled={!hasChanges}
                className="glass-button px-6 py-2 rounded-lg font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 inline mr-2" />
                Save View Settings
              </button>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">Notification Settings</h3>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="notificationsEnabled"
                  checked={preferences.notifications.enabled}
                  onChange={(e) => handleNotificationsChange({ enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-fuchsia-500 focus:ring-fuchsia-500"
                />
                <label htmlFor="notificationsEnabled" className="text-sm font-medium text-gray-300">Enable Notifications</label>
              </div>

              {preferences.notifications.enabled && (
                <>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="showToasts"
                      checked={preferences.notifications.showToasts}
                      onChange={(e) => handleNotificationsChange({ showToasts: e.target.checked })}
                      className="w-4 h-4 rounded text-fuchsia-500 focus:ring-fuchsia-500"
                    />
                    <label htmlFor="showToasts" className="text-sm font-medium text-gray-300">Show Toast Notifications</label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="playSound"
                      checked={preferences.notifications.playSound}
                      onChange={(e) => handleNotificationsChange({ playSound: e.target.checked })}
                      className="w-4 h-4 rounded text-fuchsia-500 focus:ring-fuchsia-500"
                    />
                    <label htmlFor="playSound" className="text-sm font-medium text-gray-300">Play Sound</label>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <p className="text-sm font-medium text-gray-300 mb-3">Notification Types</p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="notifyOnError"
                          checked={preferences.notifications.notifyOnError}
                          onChange={(e) => handleNotificationsChange({ notifyOnError: e.target.checked })}
                          className="w-4 h-4 rounded text-fuchsia-500 focus:ring-fuchsia-500"
                        />
                        <label htmlFor="notifyOnError" className="text-sm text-gray-300">Error Notifications</label>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="notifyOnSuccess"
                          checked={preferences.notifications.notifyOnSuccess}
                          onChange={(e) => handleNotificationsChange({ notifyOnSuccess: e.target.checked })}
                          className="w-4 h-4 rounded text-fuchsia-500 focus:ring-fuchsia-500"
                        />
                        <label htmlFor="notifyOnSuccess" className="text-sm text-gray-300">Success Notifications</label>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="notifyOnWarning"
                          checked={preferences.notifications.notifyOnWarning}
                          onChange={(e) => handleNotificationsChange({ notifyOnWarning: e.target.checked })}
                          className="w-4 h-4 rounded text-fuchsia-500 focus:ring-fuchsia-500"
                        />
                        <label htmlFor="notifyOnWarning" className="text-sm text-gray-300">Warning Notifications</label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Notification Position</label>
                    <select
                      value={preferences.notifications.position}
                      onChange={(e) => handleNotificationsChange({ position: e.target.value as any })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    >
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                      <option value="top-center">Top Center</option>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-center">Bottom Center</option>
                    </select>
                  </div>
                </>
              )}

              <button
                onClick={handleSavePreferences}
                disabled={!hasChanges}
                className="glass-button px-6 py-2 rounded-lg font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 inline mr-2" />
                Save Notification Settings
              </button>
            </div>
          )}
        </div>
        </motion.div>
      </div>
    </div>
  );
}
