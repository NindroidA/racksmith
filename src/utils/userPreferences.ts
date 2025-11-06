/**
 * User Preferences Utilities
 * Theme customization, default settings, and view preferences
 */

export interface UserPreferences {
  id: string;
  userId?: string;
  theme: ThemePreferences;
  defaults: DefaultPreferences;
  view: ViewPreferences;
  notifications: NotificationPreferences;
  lastUpdated: Date;
}

export interface ThemePreferences {
  mode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  density: 'compact' | 'comfortable' | 'spacious';
  fontFamily?: string;
  customCSS?: string;
}

export interface DefaultPreferences {
  rackSize_u: number;
  rackColorTag: 'blue' | 'purple' | 'cyan' | 'green' | 'orange' | 'red';
  deviceManufacturer: string;
  cableType: string;
  autoSave: boolean;
  autoSaveInterval: number; // minutes
  confirmDelete: boolean;
  showWelcomeScreen: boolean;
}

export interface ViewPreferences {
  sidebarCollapsed: boolean;
  showRackLabels: boolean;
  showUNumbers: boolean;
  showPowerUsage: boolean;
  showPortStatus: boolean;
  gridView: boolean;
  itemsPerPage: number;
  defaultSortBy: 'name' | 'date' | 'size' | 'type';
  defaultSortOrder: 'asc' | 'desc';
  compactCards: boolean;
}

export interface NotificationPreferences {
  enabled: boolean;
  showToasts: boolean;
  playSound: boolean;
  notifyOnError: boolean;
  notifyOnSuccess: boolean;
  notifyOnWarning: boolean;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

/**
 * Default user preferences
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  id: 'default',
  theme: {
    mode: 'dark',
    primaryColor: '#3b82f6',
    accentColor: '#8b5cf6',
    fontSize: 'medium',
    density: 'comfortable',
  },
  defaults: {
    rackSize_u: 42,
    rackColorTag: 'blue',
    deviceManufacturer: 'cisco',
    cableType: 'cat6',
    autoSave: true,
    autoSaveInterval: 5,
    confirmDelete: true,
    showWelcomeScreen: true,
  },
  view: {
    sidebarCollapsed: false,
    showRackLabels: true,
    showUNumbers: true,
    showPowerUsage: true,
    showPortStatus: true,
    gridView: true,
    itemsPerPage: 20,
    defaultSortBy: 'name',
    defaultSortOrder: 'asc',
    compactCards: false,
  },
  notifications: {
    enabled: true,
    showToasts: true,
    playSound: false,
    notifyOnError: true,
    notifyOnSuccess: true,
    notifyOnWarning: true,
    position: 'top-right',
  },
  lastUpdated: new Date(),
};

/**
 * Load user preferences from localStorage
 */
export function loadPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem('user_preferences');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        lastUpdated: new Date(parsed.lastUpdated),
      };
    }
  } catch (error) {
    console.error('Failed to load preferences:', error);
  }
  return DEFAULT_PREFERENCES;
}

/**
 * Save user preferences to localStorage
 */
export function savePreferences(preferences: UserPreferences): void {
  try {
    const toSave = {
      ...preferences,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem('user_preferences', JSON.stringify(toSave));
  } catch (error) {
    console.error('Failed to save preferences:', error);
  }
}

/**
 * Update theme preferences
 */
export function updateThemePreferences(
  preferences: UserPreferences,
  themeUpdates: Partial<ThemePreferences>
): UserPreferences {
  return {
    ...preferences,
    theme: {
      ...preferences.theme,
      ...themeUpdates,
    },
    lastUpdated: new Date(),
  };
}

/**
 * Update default preferences
 */
export function updateDefaultPreferences(
  preferences: UserPreferences,
  defaultUpdates: Partial<DefaultPreferences>
): UserPreferences {
  return {
    ...preferences,
    defaults: {
      ...preferences.defaults,
      ...defaultUpdates,
    },
    lastUpdated: new Date(),
  };
}

/**
 * Update view preferences
 */
export function updateViewPreferences(
  preferences: UserPreferences,
  viewUpdates: Partial<ViewPreferences>
): UserPreferences {
  return {
    ...preferences,
    view: {
      ...preferences.view,
      ...viewUpdates,
    },
    lastUpdated: new Date(),
  };
}

/**
 * Update notification preferences
 */
export function updateNotificationPreferences(
  preferences: UserPreferences,
  notificationUpdates: Partial<NotificationPreferences>
): UserPreferences {
  return {
    ...preferences,
    notifications: {
      ...preferences.notifications,
      ...notificationUpdates,
    },
    lastUpdated: new Date(),
  };
}

/**
 * Reset preferences to default
 */
export function resetPreferences(): UserPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    id: `prefs-${Date.now()}`,
    lastUpdated: new Date(),
  };
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: ThemePreferences): void {
  const root = document.documentElement;

  // Set theme mode
  if (theme.mode === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme.mode === 'dark');
  }

  // Set CSS variables
  root.style.setProperty('--primary-color', theme.primaryColor);
  root.style.setProperty('--accent-color', theme.accentColor);

  // Set font size
  const fontSizes = {
    small: '14px',
    medium: '16px',
    large: '18px',
  };
  root.style.setProperty('--base-font-size', fontSizes[theme.fontSize]);

  // Set density
  const densities = {
    compact: '0.5rem',
    comfortable: '1rem',
    spacious: '1.5rem',
  };
  root.style.setProperty('--spacing-unit', densities[theme.density]);

  // Set font family
  if (theme.fontFamily) {
    root.style.setProperty('--font-family', theme.fontFamily);
  }

  // Apply custom CSS
  if (theme.customCSS) {
    let styleElement = document.getElementById('custom-theme-css');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'custom-theme-css';
      document.head.appendChild(styleElement);
    }
    styleElement.textContent = theme.customCSS;
  }
}

/**
 * Get available theme presets
 */
export function getThemePresets(): Array<{
  name: string;
  description: string;
  theme: ThemePreferences;
}> {
  return [
    {
      name: 'Ocean Blue',
      description: 'Professional blue theme',
      theme: {
        mode: 'dark',
        primaryColor: '#3b82f6',
        accentColor: '#06b6d4',
        fontSize: 'medium',
        density: 'comfortable',
      },
    },
    {
      name: 'Purple Haze',
      description: 'Creative purple theme',
      theme: {
        mode: 'dark',
        primaryColor: '#8b5cf6',
        accentColor: '#ec4899',
        fontSize: 'medium',
        density: 'comfortable',
      },
    },
    {
      name: 'Forest Green',
      description: 'Natural green theme',
      theme: {
        mode: 'dark',
        primaryColor: '#10b981',
        accentColor: '#84cc16',
        fontSize: 'medium',
        density: 'comfortable',
      },
    },
    {
      name: 'Sunset Orange',
      description: 'Warm orange theme',
      theme: {
        mode: 'dark',
        primaryColor: '#f59e0b',
        accentColor: '#ef4444',
        fontSize: 'medium',
        density: 'comfortable',
      },
    },
    {
      name: 'Light Mode',
      description: 'Clean light theme',
      theme: {
        mode: 'light',
        primaryColor: '#2563eb',
        accentColor: '#7c3aed',
        fontSize: 'medium',
        density: 'comfortable',
      },
    },
  ];
}

/**
 * Export preferences as JSON
 */
export function exportPreferences(preferences: UserPreferences): string {
  return JSON.stringify(preferences, null, 2);
}

/**
 * Import preferences from JSON
 */
export function importPreferences(json: string): UserPreferences | null {
  try {
    const imported = JSON.parse(json);
    return {
      ...imported,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error('Failed to import preferences:', error);
    return null;
  }
}

/**
 * Get preference summary
 */
export function getPreferenceSummary(preferences: UserPreferences): {
  theme: string;
  autoSave: boolean;
  confirmDelete: boolean;
  notifications: boolean;
  customizations: number;
} {
  const customizations =
    (preferences.theme.mode !== DEFAULT_PREFERENCES.theme.mode ? 1 : 0) +
    (preferences.theme.primaryColor !== DEFAULT_PREFERENCES.theme.primaryColor ? 1 : 0) +
    (preferences.theme.fontSize !== DEFAULT_PREFERENCES.theme.fontSize ? 1 : 0) +
    (preferences.theme.density !== DEFAULT_PREFERENCES.theme.density ? 1 : 0) +
    (preferences.view.itemsPerPage !== DEFAULT_PREFERENCES.view.itemsPerPage ? 1 : 0);

  return {
    theme: preferences.theme.mode,
    autoSave: preferences.defaults.autoSave,
    confirmDelete: preferences.defaults.confirmDelete,
    notifications: preferences.notifications.enabled,
    customizations,
  };
}

/**
 * Validate preferences object
 */
export function validatePreferences(preferences: Partial<UserPreferences>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (preferences.theme) {
    if (!['light', 'dark', 'auto'].includes(preferences.theme.mode)) {
      errors.push('Invalid theme mode');
    }
    if (!['small', 'medium', 'large'].includes(preferences.theme.fontSize)) {
      errors.push('Invalid font size');
    }
  }

  if (preferences.defaults) {
    if (
      preferences.defaults.rackSize_u !== undefined &&
      (preferences.defaults.rackSize_u < 1 || preferences.defaults.rackSize_u > 48)
    ) {
      errors.push('Rack size must be between 1 and 48U');
    }
    if (
      preferences.defaults.autoSaveInterval !== undefined &&
      preferences.defaults.autoSaveInterval < 1
    ) {
      errors.push('Auto-save interval must be at least 1 minute');
    }
  }

  if (preferences.view) {
    if (
      preferences.view.itemsPerPage !== undefined &&
      (preferences.view.itemsPerPage < 5 || preferences.view.itemsPerPage > 100)
    ) {
      errors.push('Items per page must be between 5 and 100');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge preferences with defaults (for partial updates)
 */
export function mergeWithDefaults(
  partial: Partial<UserPreferences>
): UserPreferences {
  return {
    id: partial.id || DEFAULT_PREFERENCES.id,
    userId: partial.userId,
    theme: { ...DEFAULT_PREFERENCES.theme, ...partial.theme },
    defaults: { ...DEFAULT_PREFERENCES.defaults, ...partial.defaults },
    view: { ...DEFAULT_PREFERENCES.view, ...partial.view },
    notifications: {
      ...DEFAULT_PREFERENCES.notifications,
      ...partial.notifications,
    },
    lastUpdated: new Date(),
  };
}
