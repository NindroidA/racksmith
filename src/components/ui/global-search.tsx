import { Search, X, Server, Cable, Network, Settings, Filter } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Device, RackConfiguration } from '../../types/entities';

export interface SearchResult {
  id: string;
  type: 'rack' | 'device' | 'network-tool' | 'page';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  path: string;
  metadata?: Record<string, any>;
}

export interface GlobalSearchProps {
  racks?: RackConfiguration[];
  devices?: Device[];
  onResultSelect?: (result: SearchResult) => void;
}

const networkTools = [
  { id: 'subnet-calc', title: 'Subnet Calculator', path: '/network-tools', icon: <Network className="w-4 h-4" /> },
  { id: 'ip-planner', title: 'IP Address Planner', path: '/network-tools', icon: <Network className="w-4 h-4" /> },
  { id: 'vlan-config', title: 'VLAN Configurator', path: '/network-tools', icon: <Settings className="w-4 h-4" /> },
  { id: 'network-builder', title: 'Network Builder', path: '/network-tools', icon: <Network className="w-4 h-4" /> },
  { id: 'nas-builder', title: 'NAS Builder', path: '/network-tools', icon: <Server className="w-4 h-4" /> },
];

const pages = [
  { id: 'dashboard', title: 'Dashboard', path: '/', icon: <Server className="w-4 h-4" /> },
  { id: 'racks', title: 'Racks', path: '/racks', icon: <Server className="w-4 h-4" /> },
  { id: 'device-library', title: 'Device Library', path: '/device-library', icon: <Cable className="w-4 h-4" /> },
  { id: 'floor-plan', title: 'Floor Plan', path: '/floor-plan', icon: <Network className="w-4 h-4" /> },
];

export function GlobalSearch({ racks = [], devices = [], onResultSelect }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Global keyboard shortcut (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchQuery = query.toLowerCase();
    const newResults: SearchResult[] = [];

    // Search racks
    racks.forEach(rack => {
      if (
        rack.name.toLowerCase().includes(searchQuery) ||
        rack.location?.toLowerCase().includes(searchQuery) ||
        rack.description?.toLowerCase().includes(searchQuery)
      ) {
        newResults.push({
          id: rack.id,
          type: 'rack',
          title: rack.name,
          subtitle: rack.location || `${rack.size_u}U Rack`,
          icon: <Server className="w-4 h-4 text-blue-400" />,
          path: `/rack/${rack.id}`,
          metadata: { sizeU: rack.size_u, colorTag: rack.color_tag },
        });
      }
    });

    // Search devices
    devices.forEach(device => {
      if (
        device.name.toLowerCase().includes(searchQuery) ||
        device.manufacturer.toLowerCase().includes(searchQuery) ||
        device.model?.toLowerCase().includes(searchQuery) ||
        device.device_type.toLowerCase().includes(searchQuery)
      ) {
        newResults.push({
          id: device.id,
          type: 'device',
          title: device.name,
          subtitle: `${device.manufacturer} • ${device.device_type} • ${device.size_u}U`,
          icon: <Cable className="w-4 h-4 text-purple-400" />,
          path: `/rack/${device.rack_config_id}`,
          metadata: { deviceType: device.device_type, sizeU: device.size_u },
        });
      }
    });

    // Search network tools
    networkTools.forEach(tool => {
      if (tool.title.toLowerCase().includes(searchQuery)) {
        newResults.push({
          id: tool.id,
          type: 'network-tool',
          title: tool.title,
          subtitle: 'Network Tool',
          icon: tool.icon,
          path: tool.path,
        });
      }
    });

    // Search pages
    pages.forEach(page => {
      if (page.title.toLowerCase().includes(searchQuery)) {
        newResults.push({
          id: page.id,
          type: 'page',
          title: page.title,
          subtitle: 'Page',
          icon: page.icon,
          path: page.path,
        });
      }
    });

    setResults(newResults.slice(0, 10)); // Limit to 10 results
    setSelectedIndex(0);
  }, [query, racks, devices]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelectResult(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setQuery('');
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    if (onResultSelect) {
      onResultSelect(result);
    }
    navigate(result.path);
    setIsOpen(false);
    setQuery('');
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all"
      >
        <Search className="w-4 h-4 text-white/60" />
        <span className="text-sm text-white/60">Search...</span>
        <kbd className="px-2 py-1 text-xs bg-white/10 rounded border border-white/20 text-white/60">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm">
      <div
        ref={resultsRef}
        className="w-full max-w-2xl glass-card border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <Search className="w-5 h-5 text-white/60" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search racks, devices, network tools..."
            className="flex-1 bg-transparent text-white placeholder-white/40 outline-none text-lg"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <kbd className="px-2 py-1 text-xs bg-white/10 rounded border border-white/20 text-white/60">
              ESC
            </kbd>
          </button>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {results.map((result, index) => (
              <button
                key={result.id}
                onClick={() => handleSelectResult(result)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-all ${
                  index === selectedIndex
                    ? 'bg-white/10 border-l-2 border-blue-400'
                    : 'hover:bg-white/5 border-l-2 border-transparent'
                }`}
              >
                <div className="flex-shrink-0">{result.icon}</div>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-white font-medium truncate">{result.title}</div>
                  {result.subtitle && (
                    <div className="text-sm text-white/60 truncate">{result.subtitle}</div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <span className="px-2 py-1 text-xs bg-white/10 rounded text-white/60 capitalize">
                    {result.type.replace('-', ' ')}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : query ? (
          <div className="p-8 text-center text-white/60">
            <Filter className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No results found for "{query}"</p>
            <p className="text-sm mt-1">Try searching for racks, devices, or network tools</p>
          </div>
        ) : (
          <div className="p-8 text-center text-white/60">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Start typing to search</p>
            <p className="text-sm mt-1">Racks • Devices • Network Tools • Pages</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 bg-white/5 text-xs text-white/60">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded">ESC</kbd>
              Close
            </span>
          </div>
          <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}
