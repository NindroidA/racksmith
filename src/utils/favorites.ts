/**
 * Favorites and Bookmarks Utilities
 * Quick access to frequently used racks, devices, and configurations
 */

export interface Favorite {
  id: string;
  type: 'rack' | 'device' | 'network-plan' | 'nas-config' | 'floor-plan';
  itemId: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  addedAt: Date;
  lastAccessed?: Date;
  accessCount: number;
  pinned: boolean;
}

export interface FavoriteCategory {
  id: string;
  name: string;
  color: string;
  icon?: string;
  favoriteIds: string[];
}

export interface RecentItem {
  id: string;
  type: Favorite['type'];
  itemId: string;
  name: string;
  accessedAt: Date;
}

/**
 * Add an item to favorites
 */
export function addToFavorites(
  itemId: string,
  type: Favorite['type'],
  name: string,
  description?: string,
  category?: string,
  tags?: string[]
): Favorite {
  return {
    id: `fav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    itemId,
    name,
    description,
    category,
    tags: tags || [],
    addedAt: new Date(),
    accessCount: 0,
    pinned: false,
  };
}

/**
 * Remove an item from favorites
 */
export function removeFromFavorites(
  favorites: Favorite[],
  favoriteId: string
): Favorite[] {
  return favorites.filter((fav) => fav.id !== favoriteId);
}

/**
 * Toggle pinned status of a favorite
 */
export function togglePin(favorite: Favorite): Favorite {
  return {
    ...favorite,
    pinned: !favorite.pinned,
  };
}

/**
 * Update last accessed time and increment access count
 */
export function recordAccess(favorite: Favorite): Favorite {
  return {
    ...favorite,
    lastAccessed: new Date(),
    accessCount: favorite.accessCount + 1,
  };
}

/**
 * Get all favorites sorted by criteria
 */
export function sortFavorites(
  favorites: Favorite[],
  sortBy: 'name' | 'date-added' | 'last-accessed' | 'most-used' | 'type' = 'name',
  order: 'asc' | 'desc' = 'asc'
): Favorite[] {
  const sorted = [...favorites];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;

      case 'date-added':
        comparison = a.addedAt.getTime() - b.addedAt.getTime();
        break;

      case 'last-accessed':
        comparison =
          (a.lastAccessed?.getTime() || 0) - (b.lastAccessed?.getTime() || 0);
        break;

      case 'most-used':
        comparison = a.accessCount - b.accessCount;
        break;

      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
    }

    return order === 'asc' ? comparison : -comparison;
  });

  // Pinned items always come first
  return sorted.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });
}

/**
 * Filter favorites by type
 */
export function filterByType(
  favorites: Favorite[],
  type: Favorite['type']
): Favorite[] {
  return favorites.filter((fav) => fav.type === type);
}

/**
 * Filter favorites by category
 */
export function filterByCategory(
  favorites: Favorite[],
  category: string
): Favorite[] {
  return favorites.filter((fav) => fav.category === category);
}

/**
 * Search favorites by name or tags
 */
export function searchFavorites(favorites: Favorite[], query: string): Favorite[] {
  const lowerQuery = query.toLowerCase();

  return favorites.filter(
    (fav) =>
      fav.name.toLowerCase().includes(lowerQuery) ||
      fav.description?.toLowerCase().includes(lowerQuery) ||
      fav.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Create a favorite category
 */
export function createCategory(
  name: string,
  color: string,
  icon?: string
): FavoriteCategory {
  return {
    id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    color,
    icon,
    favoriteIds: [],
  };
}

/**
 * Add favorite to category
 */
export function addToCategory(
  category: FavoriteCategory,
  favoriteId: string
): FavoriteCategory {
  if (category.favoriteIds.includes(favoriteId)) {
    return category;
  }

  return {
    ...category,
    favoriteIds: [...category.favoriteIds, favoriteId],
  };
}

/**
 * Remove favorite from category
 */
export function removeFromCategory(
  category: FavoriteCategory,
  favoriteId: string
): FavoriteCategory {
  return {
    ...category,
    favoriteIds: category.favoriteIds.filter((id) => id !== favoriteId),
  };
}

/**
 * Get favorites in a specific category
 */
export function getFavoritesInCategory(
  favorites: Favorite[],
  category: FavoriteCategory
): Favorite[] {
  return favorites.filter((fav) => category.favoriteIds.includes(fav.id));
}

/**
 * Get statistics about favorites
 */
export function getFavoriteStats(favorites: Favorite[]): {
  total: number;
  byType: Record<string, number>;
  pinned: number;
  mostAccessed: Favorite | null;
  recentlyAdded: Favorite[];
} {
  const byType: Record<string, number> = {};
  let mostAccessed: Favorite | null = null;

  favorites.forEach((fav) => {
    byType[fav.type] = (byType[fav.type] || 0) + 1;

    if (!mostAccessed || fav.accessCount > mostAccessed.accessCount) {
      mostAccessed = fav;
    }
  });

  const recentlyAdded = [...favorites]
    .sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime())
    .slice(0, 5);

  return {
    total: favorites.length,
    byType,
    pinned: favorites.filter((fav) => fav.pinned).length,
    mostAccessed,
    recentlyAdded,
  };
}

/**
 * Add item to recent access history
 */
export function addToRecent(
  recent: RecentItem[],
  itemId: string,
  type: Favorite['type'],
  name: string,
  maxItems = 20
): RecentItem[] {
  // Remove if already exists
  const filtered = recent.filter((item) => item.itemId !== itemId);

  // Add to beginning
  const newItem: RecentItem = {
    id: `recent-${Date.now()}`,
    type,
    itemId,
    name,
    accessedAt: new Date(),
  };

  // Keep only maxItems
  return [newItem, ...filtered].slice(0, maxItems);
}

/**
 * Get recent items by type
 */
export function getRecentByType(
  recent: RecentItem[],
  type: Favorite['type']
): RecentItem[] {
  return recent.filter((item) => item.type === type);
}

/**
 * Clear recent items older than specified days
 */
export function clearOldRecent(recent: RecentItem[], days = 30): RecentItem[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return recent.filter((item) => item.accessedAt > cutoffDate);
}

/**
 * Export favorites as JSON
 */
export function exportFavorites(
  favorites: Favorite[],
  categories: FavoriteCategory[]
): string {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    favorites,
    categories,
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Import favorites from JSON
 */
export function importFavorites(json: string): {
  favorites: Favorite[];
  categories: FavoriteCategory[];
} | null {
  try {
    const data = JSON.parse(json);

    // Convert date strings back to Date objects
    const favorites = data.favorites.map((fav: Favorite) => ({
      ...fav,
      addedAt: new Date(fav.addedAt),
      lastAccessed: fav.lastAccessed ? new Date(fav.lastAccessed) : undefined,
    }));

    return {
      favorites,
      categories: data.categories || [],
    };
  } catch (error) {
    console.error('Failed to import favorites:', error);
    return null;
  }
}

/**
 * Suggest items to favorite based on access patterns
 */
export function suggestFavorites(
  recent: RecentItem[],
  favorites: Favorite[],
  threshold = 3
): RecentItem[] {
  const favoriteIds = new Set(favorites.map((fav) => fav.itemId));
  const accessCounts: Record<string, number> = {};

  // Count accesses
  recent.forEach((item) => {
    if (!favoriteIds.has(item.itemId)) {
      accessCounts[item.itemId] = (accessCounts[item.itemId] || 0) + 1;
    }
  });

  // Find items accessed more than threshold times
  const suggestions: RecentItem[] = [];
  recent.forEach((item) => {
    const count = accessCounts[item.itemId] || 0;
    if (count >= threshold && !suggestions.some((s) => s.itemId === item.itemId)) {
      suggestions.push(item);
    }
  });

  return suggestions;
}

/**
 * Bulk add tags to favorites
 */
export function bulkAddTags(favorites: Favorite[], tag: string): Favorite[] {
  return favorites.map((fav) => ({
    ...fav,
    tags: [...(fav.tags || []), tag],
  }));
}

/**
 * Bulk remove tags from favorites
 */
export function bulkRemoveTags(favorites: Favorite[], tag: string): Favorite[] {
  return favorites.map((fav) => ({
    ...fav,
    tags: (fav.tags || []).filter((t) => t !== tag),
  }));
}

/**
 * Get all unique tags from favorites
 */
export function getAllTags(favorites: Favorite[]): string[] {
  const tags = new Set<string>();

  favorites.forEach((fav) => {
    fav.tags?.forEach((tag) => tags.add(tag));
  });

  return Array.from(tags).sort();
}

/**
 * Generate favorites quick access menu structure
 */
export function generateQuickAccessMenu(
  favorites: Favorite[]
): {
  pinned: Favorite[];
  byType: Record<string, Favorite[]>;
  mostUsed: Favorite[];
} {
  const pinned = favorites.filter((fav) => fav.pinned);
  const byType: Record<string, Favorite[]> = {};

  favorites.forEach((fav) => {
    if (!byType[fav.type]) {
      byType[fav.type] = [];
    }
    byType[fav.type]!.push(fav);
  });

  const mostUsed = [...favorites]
    .sort((a, b) => b.accessCount - a.accessCount)
    .slice(0, 10);

  return {
    pinned,
    byType,
    mostUsed,
  };
}
