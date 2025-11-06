/**
 * Keyboard Shortcuts Utilities
 * Quick navigation and actions via keyboard
 */

export interface KeyboardShortcut {
  id: string;
  category: ShortcutCategory;
  description: string;
  keys: string[];
  action: string;
  context?: string; // Page or component where shortcut is active
  enabled: boolean;
  customizable: boolean;
}

export type ShortcutCategory =
  | 'global'
  | 'navigation'
  | 'rack_builder'
  | 'floor_plan'
  | 'editing'
  | 'view';

export interface ShortcutConfig {
  shortcuts: KeyboardShortcut[];
  lastUpdated: Date;
}

/**
 * Default keyboard shortcuts
 */
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // Global shortcuts
  {
    id: 'global-save',
    category: 'global',
    description: 'Save current configuration',
    keys: ['Ctrl', 'S'],
    action: 'save',
    enabled: true,
    customizable: true,
  },
  {
    id: 'global-search',
    category: 'global',
    description: 'Open global search',
    keys: ['Ctrl', '/'],
    action: 'open-search',
    enabled: true,
    customizable: true,
  },
  {
    id: 'global-command-palette',
    category: 'global',
    description: 'Open command palette',
    keys: ['Ctrl', 'K'],
    action: 'open-command-palette',
    enabled: true,
    customizable: true,
  },
  {
    id: 'global-new-rack',
    category: 'global',
    description: 'Create new rack',
    keys: ['Ctrl', 'N'],
    action: 'new-rack',
    enabled: true,
    customizable: true,
  },
  {
    id: 'global-help',
    category: 'global',
    description: 'Open help documentation',
    keys: ['F1'],
    action: 'open-help',
    enabled: true,
    customizable: true,
  },
  {
    id: 'global-close',
    category: 'global',
    description: 'Close dialog/modal',
    keys: ['Escape'],
    action: 'close',
    enabled: true,
    customizable: false,
  },
  {
    id: 'global-find',
    category: 'global',
    description: 'Find in current page',
    keys: ['Ctrl', 'F'],
    action: 'find-in-page',
    enabled: true,
    customizable: true,
  },
  {
    id: 'global-preferences',
    category: 'global',
    description: 'Open preferences',
    keys: ['Ctrl', ','],
    action: 'open-preferences',
    enabled: true,
    customizable: true,
  },

  // Navigation shortcuts
  {
    id: 'nav-dashboard',
    category: 'navigation',
    description: 'Go to Dashboard',
    keys: ['Alt', '1'],
    action: 'navigate-dashboard',
    enabled: true,
    customizable: true,
  },
  {
    id: 'nav-racks',
    category: 'navigation',
    description: 'Go to Racks',
    keys: ['Alt', '2'],
    action: 'navigate-racks',
    enabled: true,
    customizable: true,
  },
  {
    id: 'nav-floor-plan',
    category: 'navigation',
    description: 'Go to Floor Plan',
    keys: ['Alt', '3'],
    action: 'navigate-floor-plan',
    enabled: true,
    customizable: true,
  },
  {
    id: 'nav-device-library',
    category: 'navigation',
    description: 'Go to Device Library',
    keys: ['Alt', '4'],
    action: 'navigate-device-library',
    enabled: true,
    customizable: true,
  },
  {
    id: 'nav-network-tools',
    category: 'navigation',
    description: 'Go to Network Tools',
    keys: ['Alt', '5'],
    action: 'navigate-network-tools',
    enabled: true,
    customizable: true,
  },
  {
    id: 'nav-toggle-sidebar',
    category: 'navigation',
    description: 'Toggle sidebar',
    keys: ['Ctrl', 'B'],
    action: 'toggle-sidebar',
    enabled: true,
    customizable: true,
  },

  // Rack Builder shortcuts
  {
    id: 'rack-delete-device',
    category: 'rack_builder',
    description: 'Delete selected device',
    keys: ['Delete'],
    action: 'delete-device',
    context: 'rack-builder',
    enabled: true,
    customizable: false,
  },
  {
    id: 'rack-duplicate-device',
    category: 'rack_builder',
    description: 'Duplicate selected device',
    keys: ['Ctrl', 'D'],
    action: 'duplicate-device',
    context: 'rack-builder',
    enabled: true,
    customizable: true,
  },
  {
    id: 'rack-move-up',
    category: 'rack_builder',
    description: 'Move device up',
    keys: ['ArrowUp'],
    action: 'move-device-up',
    context: 'rack-builder',
    enabled: true,
    customizable: true,
  },
  {
    id: 'rack-move-down',
    category: 'rack_builder',
    description: 'Move device down',
    keys: ['ArrowDown'],
    action: 'move-device-down',
    context: 'rack-builder',
    enabled: true,
    customizable: true,
  },
  {
    id: 'rack-select-next',
    category: 'rack_builder',
    description: 'Select next device',
    keys: ['Tab'],
    action: 'select-next-device',
    context: 'rack-builder',
    enabled: true,
    customizable: true,
  },
  {
    id: 'rack-select-prev',
    category: 'rack_builder',
    description: 'Select previous device',
    keys: ['Shift', 'Tab'],
    action: 'select-prev-device',
    context: 'rack-builder',
    enabled: true,
    customizable: true,
  },
  {
    id: 'rack-auto-arrange',
    category: 'rack_builder',
    description: 'Auto-arrange devices',
    keys: ['Ctrl', 'Shift', 'A'],
    action: 'auto-arrange',
    context: 'rack-builder',
    enabled: true,
    customizable: true,
  },

  // Floor Plan shortcuts
  {
    id: 'floor-toggle-grid',
    category: 'floor_plan',
    description: 'Toggle grid',
    keys: ['G'],
    action: 'toggle-grid',
    context: 'floor-plan',
    enabled: true,
    customizable: true,
  },
  {
    id: 'floor-rotate',
    category: 'floor_plan',
    description: 'Rotate selected item',
    keys: ['R'],
    action: 'rotate-item',
    context: 'floor-plan',
    enabled: true,
    customizable: true,
  },
  {
    id: 'floor-group',
    category: 'floor_plan',
    description: 'Group selected items',
    keys: ['Ctrl', 'G'],
    action: 'group-items',
    context: 'floor-plan',
    enabled: true,
    customizable: true,
  },
  {
    id: 'floor-ungroup',
    category: 'floor_plan',
    description: 'Ungroup selected items',
    keys: ['Ctrl', 'Shift', 'G'],
    action: 'ungroup-items',
    context: 'floor-plan',
    enabled: true,
    customizable: true,
  },
  {
    id: 'floor-pan',
    category: 'floor_plan',
    description: 'Pan view (hold Space)',
    keys: ['Space'],
    action: 'pan-view',
    context: 'floor-plan',
    enabled: true,
    customizable: false,
  },
  {
    id: 'floor-zoom-in',
    category: 'floor_plan',
    description: 'Zoom in',
    keys: ['Ctrl', '+'],
    action: 'zoom-in',
    context: 'floor-plan',
    enabled: true,
    customizable: true,
  },
  {
    id: 'floor-zoom-out',
    category: 'floor_plan',
    description: 'Zoom out',
    keys: ['Ctrl', '-'],
    action: 'zoom-out',
    context: 'floor-plan',
    enabled: true,
    customizable: true,
  },
  {
    id: 'floor-reset-view',
    category: 'floor_plan',
    description: 'Reset view',
    keys: ['Ctrl', '0'],
    action: 'reset-view',
    context: 'floor-plan',
    enabled: true,
    customizable: true,
  },

  // Editing shortcuts
  {
    id: 'edit-undo',
    category: 'editing',
    description: 'Undo last action',
    keys: ['Ctrl', 'Z'],
    action: 'undo',
    enabled: true,
    customizable: true,
  },
  {
    id: 'edit-redo',
    category: 'editing',
    description: 'Redo last action',
    keys: ['Ctrl', 'Shift', 'Z'],
    action: 'redo',
    enabled: true,
    customizable: true,
  },
  {
    id: 'edit-copy',
    category: 'editing',
    description: 'Copy selected item',
    keys: ['Ctrl', 'C'],
    action: 'copy',
    enabled: true,
    customizable: true,
  },
  {
    id: 'edit-paste',
    category: 'editing',
    description: 'Paste copied item',
    keys: ['Ctrl', 'V'],
    action: 'paste',
    enabled: true,
    customizable: true,
  },
  {
    id: 'edit-select-all',
    category: 'editing',
    description: 'Select all items',
    keys: ['Ctrl', 'A'],
    action: 'select-all',
    enabled: true,
    customizable: true,
  },

  // View shortcuts
  {
    id: 'view-compact',
    category: 'view',
    description: 'Toggle compact view',
    keys: ['Ctrl', 'Shift', 'C'],
    action: 'toggle-compact-view',
    enabled: true,
    customizable: true,
  },
  {
    id: 'view-fullscreen',
    category: 'view',
    description: 'Toggle fullscreen',
    keys: ['F11'],
    action: 'toggle-fullscreen',
    enabled: true,
    customizable: false,
  },
  {
    id: 'view-refresh',
    category: 'view',
    description: 'Refresh view',
    keys: ['Ctrl', 'R'],
    action: 'refresh-view',
    enabled: true,
    customizable: true,
  },
];

/**
 * Load keyboard shortcuts from storage
 */
export function loadShortcuts(): ShortcutConfig {
  try {
    const stored = localStorage.getItem('keyboard_shortcuts');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        shortcuts: parsed.shortcuts || DEFAULT_SHORTCUTS,
        lastUpdated: new Date(parsed.lastUpdated),
      };
    }
  } catch (error) {
    console.error('Failed to load shortcuts:', error);
  }

  return {
    shortcuts: DEFAULT_SHORTCUTS,
    lastUpdated: new Date(),
  };
}

/**
 * Save keyboard shortcuts to storage
 */
export function saveShortcuts(config: ShortcutConfig): void {
  try {
    localStorage.setItem(
      'keyboard_shortcuts',
      JSON.stringify({
        shortcuts: config.shortcuts,
        lastUpdated: config.lastUpdated.toISOString(),
      })
    );
  } catch (error) {
    console.error('Failed to save shortcuts:', error);
  }
}

/**
 * Update a keyboard shortcut
 */
export function updateShortcut(
  config: ShortcutConfig,
  shortcutId: string,
  newKeys: string[]
): ShortcutConfig {
  const shortcuts = config.shortcuts.map((shortcut) => {
    if (shortcut.id === shortcutId && shortcut.customizable) {
      return { ...shortcut, keys: newKeys };
    }
    return shortcut;
  });

  return {
    shortcuts,
    lastUpdated: new Date(),
  };
}

/**
 * Enable/disable a shortcut
 */
export function toggleShortcut(
  config: ShortcutConfig,
  shortcutId: string,
  enabled: boolean
): ShortcutConfig {
  const shortcuts = config.shortcuts.map((shortcut) => {
    if (shortcut.id === shortcutId) {
      return { ...shortcut, enabled };
    }
    return shortcut;
  });

  return {
    shortcuts,
    lastUpdated: new Date(),
  };
}

/**
 * Reset shortcuts to default
 */
export function resetShortcuts(): ShortcutConfig {
  return {
    shortcuts: DEFAULT_SHORTCUTS,
    lastUpdated: new Date(),
  };
}

/**
 * Get shortcuts by category
 */
export function getShortcutsByCategory(
  config: ShortcutConfig,
  category: ShortcutCategory
): KeyboardShortcut[] {
  return config.shortcuts.filter((s) => s.category === category);
}

/**
 * Get shortcuts by context
 */
export function getShortcutsByContext(
  config: ShortcutConfig,
  context?: string
): KeyboardShortcut[] {
  return config.shortcuts.filter(
    (s) => !s.context || s.context === context
  );
}

/**
 * Find shortcut by action
 */
export function findShortcutByAction(
  config: ShortcutConfig,
  action: string
): KeyboardShortcut | null {
  return config.shortcuts.find((s) => s.action === action) || null;
}

/**
 * Check if key combination is already used
 */
export function isKeyCombinationUsed(
  config: ShortcutConfig,
  keys: string[],
  excludeId?: string
): boolean {
  return config.shortcuts.some((shortcut) => {
    if (excludeId && shortcut.id === excludeId) return false;
    return (
      shortcut.enabled &&
      shortcut.keys.length === keys.length &&
      shortcut.keys.every((key, index) => key === keys[index])
    );
  });
}

/**
 * Format keyboard shortcut for display
 */
export function formatShortcut(keys: string[]): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return keys
    .map((key) => {
      // Replace Ctrl with Cmd on Mac
      if (key === 'Ctrl' && isMac) return '⌘';
      if (key === 'Alt' && isMac) return '⌥';
      if (key === 'Shift') return '⇧';
      if (key === 'Enter') return '↵';
      if (key === 'Escape') return 'Esc';
      if (key === 'ArrowUp') return '↑';
      if (key === 'ArrowDown') return '↓';
      if (key === 'ArrowLeft') return '←';
      if (key === 'ArrowRight') return '→';
      if (key === 'Space') return 'Space';
      if (key === 'Delete') return 'Del';
      return key;
    })
    .join(isMac ? '' : '+');
}

/**
 * Parse keyboard event to key combination
 */
export function parseKeyEvent(event: KeyboardEvent): string[] {
  const keys: string[] = [];

  if (event.ctrlKey || event.metaKey) keys.push('Ctrl');
  if (event.altKey) keys.push('Alt');
  if (event.shiftKey) keys.push('Shift');

  const key = event.key;
  if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
    // Normalize the key
    if (key === ' ') {
      keys.push('Space');
    } else if (key.length === 1) {
      keys.push(key.toUpperCase());
    } else {
      keys.push(key);
    }
  }

  return keys;
}

/**
 * Match keyboard event to shortcut
 */
export function matchShortcut(
  config: ShortcutConfig,
  event: KeyboardEvent,
  context?: string
): KeyboardShortcut | null {
  const keys = parseKeyEvent(event);
  const contextShortcuts = getShortcutsByContext(config, context);

  return (
    contextShortcuts.find((shortcut) => {
      if (!shortcut.enabled) return false;
      return (
        shortcut.keys.length === keys.length &&
        shortcut.keys.every((key, index) => key === keys[index])
      );
    }) || null
  );
}

/**
 * Export shortcuts as JSON
 */
export function exportShortcuts(config: ShortcutConfig): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Import shortcuts from JSON
 */
export function importShortcuts(json: string): ShortcutConfig | null {
  try {
    const imported = JSON.parse(json);
    return {
      shortcuts: imported.shortcuts || DEFAULT_SHORTCUTS,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error('Failed to import shortcuts:', error);
    return null;
  }
}

/**
 * Get shortcut conflicts
 */
export function getShortcutConflicts(
  config: ShortcutConfig
): Array<{
  keys: string[];
  shortcuts: KeyboardShortcut[];
}> {
  const conflicts: Array<{
    keys: string[];
    shortcuts: KeyboardShortcut[];
  }> = [];

  const keyMap = new Map<string, KeyboardShortcut[]>();

  config.shortcuts.forEach((shortcut) => {
    if (!shortcut.enabled) return;

    const keyStr = shortcut.keys.join('+');
    const existing = keyMap.get(keyStr) || [];
    existing.push(shortcut);
    keyMap.set(keyStr, existing);
  });

  keyMap.forEach((shortcuts, keyStr) => {
    if (shortcuts.length > 1) {
      // Only conflict if same context or one has no context
      const hasConflict = shortcuts.some((s1, i) =>
        shortcuts.some(
          (s2, j) =>
            i !== j && (!s1.context || !s2.context || s1.context === s2.context)
        )
      );

      if (hasConflict) {
        conflicts.push({
          keys: keyStr.split('+'),
          shortcuts,
        });
      }
    }
  });

  return conflicts;
}

/**
 * Get shortcuts cheat sheet
 */
export function getShortcutsCheatSheet(
  config: ShortcutConfig
): Map<ShortcutCategory, KeyboardShortcut[]> {
  const cheatSheet = new Map<ShortcutCategory, KeyboardShortcut[]>();

  config.shortcuts
    .filter((s) => s.enabled)
    .forEach((shortcut) => {
      const existing = cheatSheet.get(shortcut.category) || [];
      existing.push(shortcut);
      cheatSheet.set(shortcut.category, existing);
    });

  return cheatSheet;
}

/**
 * Execute shortcut action
 */
export function executeShortcutAction(
  action: string,
  context?: Record<string, unknown>
): void {
  console.log(`Executing shortcut action: ${action}`, context);

  // In a real implementation, this would dispatch actions to the appropriate handlers
  // For now, we'll just log the action
  // This function should be extended to integrate with your app's action system
}
