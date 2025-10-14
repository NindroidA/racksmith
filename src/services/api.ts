/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * API Service Layer.
 * 
 * Currently operating in MOCK MODE using localStorage for persistence.
 * Simulates REST API calls with realistic delays.
 * 
 * TODO: Replace with actual backend API calls when ready.
 */

import type { Connection, CustomDevice, Device, NASConfiguration, NetworkPlan, Port, RackConfiguration, RackPosition, StandaloneDevice, TopologyConnection } from '../types/entities';
import { mockCustomDevices, mockDevices, mockNetworkPlans, mockRacks } from './mockData';

/* Configuration */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const USE_MOCK_DATA = true;

/* Storage Helpers */
const getStorageKey = (key: string) => `racksmith_mock_${key}`;

const getFromStorage = <T>(key: string, defaultValue: T[]): T[] => {
  if (!USE_MOCK_DATA) return [];
  const stored = localStorage.getItem(getStorageKey(key));
  return stored ? JSON.parse(stored) : defaultValue;
};

const saveToStorage = <T>(key: string, data: T[]) => {
  if (USE_MOCK_DATA) {
    localStorage.setItem(getStorageKey(key), JSON.stringify(data));
  }
};

/* Initial Mock Data */
const initialRacks: RackConfiguration[] = mockRacks;
const initialDevices: Device[] = mockDevices;
const initialCustomDevices: CustomDevice[] = mockCustomDevices;
const initialNetworkPlans: NetworkPlan[] = mockNetworkPlans;

/* Initialize Storage */
if (!localStorage.getItem(getStorageKey('racks'))) {
  saveToStorage('racks', initialRacks);
}
if (!localStorage.getItem(getStorageKey('devices'))) {
  saveToStorage('devices', initialDevices);
}
if (!localStorage.getItem(getStorageKey('custom-devices'))) {
  saveToStorage('custom-devices', initialCustomDevices);
}
if (!localStorage.getItem(getStorageKey('network-plans'))) {
  saveToStorage('network-plans', initialNetworkPlans);
}

// mock API delay
const mockDelay = () => new Promise(resolve => setTimeout(resolve, 200));

/* Core API Request */
/**
 * Main API request function.
 * Routes requests to mock data handlers when USE_MOCK_DATA is true.
 */
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  if (USE_MOCK_DATA) {
    await mockDelay();
    
    const path = endpoint.split('?')[0]!;
    const method = options?.method || 'GET';
    const params = new URLSearchParams(endpoint.includes('?') ? endpoint.split('?')[1] : '');
    
    // racks
    if (path.includes('/racks')) {
      let racks = getFromStorage<RackConfiguration>('racks', initialRacks);
      
      if (method === 'GET' && path.split('/').length === 2) return racks as T;
      if (method === 'GET' && path.split('/').length === 3) {
        const id = path.split('/').pop();
        return racks.find(r => r.id === id) as T;
      }
      if (method === 'POST') {
        const newRack = { ...JSON.parse(options?.body as string), id: Date.now().toString() };
        racks.push(newRack);
        saveToStorage('racks', racks);
        return newRack as T;
      }
      if (method === 'PUT') {
        const id = path.split('/').pop();
        const index = racks.findIndex(r => r.id === id);
        if (index !== -1) {
          racks[index] = { ...racks[index], ...JSON.parse(options?.body as string) };
          saveToStorage('racks', racks);
          return racks[index] as T;
        }
      }
      if (method === 'DELETE') {
        const id = path.split('/').pop();
        racks = racks.filter(r => r.id !== id);
        saveToStorage('racks', racks);
        return {} as T;
      }
    }
    
    // devices
    if (path.includes('/devices')) {
      let devices = getFromStorage<Device>('devices', initialDevices);
      
      if (method === 'GET' && path.split('/').length === 2) {
        const rackId = params.get('rack_config_id');
        if (rackId) return devices.filter(d => d.rack_config_id === rackId) as T;
        return devices as T;
      }
      if (method === 'GET' && path.split('/').length === 3) {
        const id = path.split('/').pop();
        return devices.find(d => d.id === id) as T;
      }
      if (method === 'POST') {
        const newDevice = { ...JSON.parse(options?.body as string), id: Date.now().toString() };
        devices.push(newDevice);
        saveToStorage('devices', devices);
        return newDevice as T;
      }
      if (method === 'PUT') {
        const id = path.split('/').pop();
        const index = devices.findIndex(d => d.id === id);
        if (index !== -1) {
          devices[index] = { ...devices[index], ...JSON.parse(options?.body as string) };
          saveToStorage('devices', devices);
          return devices[index] as T;
        }
      }
      if (method === 'DELETE') {
        const id = path.split('/').pop();
        devices = devices.filter(d => d.id !== id);
        saveToStorage('devices', devices);
        return {} as T;
      }
    }
    
    // ports
    if (path.includes('/ports')) {
      let ports = getFromStorage<Port>('ports', []);
      
      if (method === 'GET') {
        const deviceId = params.get('device_id');
        if (deviceId) return ports.filter(p => p.device_id === deviceId) as T;
        return ports as T;
      }
      if (method === 'POST') {
        const newPort = { ...JSON.parse(options?.body as string), id: Date.now().toString() };
        ports.push(newPort);
        saveToStorage('ports', ports);
        return newPort as T;
      }
      if (method === 'PUT') {
        const id = path.split('/').pop();
        const index = ports.findIndex(p => p.id === id);
        if (index !== -1) {
          ports[index] = { ...ports[index], ...JSON.parse(options?.body as string) };
          saveToStorage('ports', ports);
          return ports[index] as T;
        }
      }
      if (method === 'DELETE') {
        const id = path.split('/').pop();
        ports = ports.filter(p => p.id !== id);
        saveToStorage('ports', ports);
        return {} as T;
      }
    }
    
    // connections
    if (path.includes('/connections')) {
      let connections = getFromStorage<Connection>('connections', []);
      
      if (method === 'GET') return connections as T;
      if (method === 'POST') {
        const newConnection = { ...JSON.parse(options?.body as string), id: Date.now().toString() };
        connections.push(newConnection);
        saveToStorage('connections', connections);
        return newConnection as T;
      }
      if (method === 'DELETE') {
        const id = path.split('/').pop();
        connections = connections.filter(c => c.id !== id);
        saveToStorage('connections', connections);
        return {} as T;
      }
    }
    
    // custom devices
    if (path.includes('/custom-devices')) {
      let customDevices = getFromStorage<CustomDevice>('custom-devices', initialCustomDevices);
      
      if (method === 'GET') return customDevices as T;
      if (method === 'POST') {
        const newDevice = { ...JSON.parse(options?.body as string), id: Date.now().toString() };
        customDevices.push(newDevice);
        saveToStorage('custom-devices', customDevices);
        return newDevice as T;
      }
      if (method === 'PUT') {
        const id = path.split('/').pop();
        const index = customDevices.findIndex(d => d.id === id);
        if (index !== -1) {
          customDevices[index] = { ...customDevices[index], ...JSON.parse(options?.body as string) };
          saveToStorage('custom-devices', customDevices);
          return customDevices[index] as T;
        }
      }
      if (method === 'DELETE') {
        const id = path.split('/').pop();
        customDevices = customDevices.filter(d => d.id !== id);
        saveToStorage('custom-devices', customDevices);
        return {} as T;
      }
    }
    
    // standalone devices
    if (path.includes('/standalone-devices')) {
      let standaloneDevices = getFromStorage<StandaloneDevice>('standalone-devices', []);
      
      if (method === 'GET') return standaloneDevices as T;
      if (method === 'POST') {
        const newDevice = { ...JSON.parse(options?.body as string), id: Date.now().toString() };
        standaloneDevices.push(newDevice);
        saveToStorage('standalone-devices', standaloneDevices);
        return newDevice as T;
      }
      if (method === 'PUT') {
        const id = path.split('/').pop();
        const index = standaloneDevices.findIndex(d => d.id === id);
        if (index !== -1) {
          standaloneDevices[index] = { ...standaloneDevices[index], ...JSON.parse(options?.body as string) };
          saveToStorage('standalone-devices', standaloneDevices);
          return standaloneDevices[index] as T;
        }
      }
      if (method === 'DELETE') {
        const id = path.split('/').pop();
        standaloneDevices = standaloneDevices.filter(d => d.id !== id);
        saveToStorage('standalone-devices', standaloneDevices);
        return {} as T;
      }
    }
    
    // topology connections
    if (path.includes('/topology-connections')) {
      let topoConnections = getFromStorage<TopologyConnection>('topology-connections', []);
      
      if (method === 'GET') return topoConnections as T;
      if (method === 'POST') {
        const newConnection = { ...JSON.parse(options?.body as string), id: Date.now().toString() };
        topoConnections.push(newConnection);
        saveToStorage('topology-connections', topoConnections);
        return newConnection as T;
      }
      if (method === 'DELETE') {
        const id = path.split('/').pop();
        topoConnections = topoConnections.filter(c => c.id !== id);
        saveToStorage('topology-connections', topoConnections);
        return {} as T;
      }
    }
    
    // network plans
    if (path.includes('/network-plans')) {
      let networkPlans = getFromStorage<NetworkPlan>('network-plans', initialNetworkPlans);
      
      if (method === 'GET') return networkPlans as T;
      if (method === 'POST') {
        const newPlan = { ...JSON.parse(options?.body as string), id: Date.now().toString() };
        networkPlans.push(newPlan);
        saveToStorage('network-plans', networkPlans);
        return newPlan as T;
      }
      if (method === 'DELETE') {
        const id = path.split('/').pop();
        networkPlans = networkPlans.filter(p => p.id !== id);
        saveToStorage('network-plans', networkPlans);
        return {} as T;
      }
    }
    
    // NAS configurations
    if (path.includes('/nas-configurations')) {
      const nasConfigs = getFromStorage<NASConfiguration>('nas-configurations', []);
      
      if (method === 'GET') return nasConfigs as T;
      if (method === 'POST') {
        const newNAS = { ...JSON.parse(options?.body as string), id: Date.now().toString() };
        nasConfigs.push(newNAS);
        saveToStorage('nas-configurations', nasConfigs);
        return newNAS as T;
      }
    }
    
    // rack positions
    if (path.includes('/rack-positions')) {
      const positions = getFromStorage<RackPosition>('rack-positions', []);
      
      if (method === 'GET') return positions as T;
      if (method === 'POST') {
        const newPosition = { ...JSON.parse(options?.body as string), id: Date.now().toString() };
        positions.push(newPosition);
        saveToStorage('rack-positions', positions);
        return newPosition as T;
      }
      if (method === 'PUT') {
        const id = path.split('/').pop();
        const index = positions.findIndex(p => p.id === id);
        if (index !== -1) {
          positions[index] = { ...positions[index], ...JSON.parse(options?.body as string) };
          saveToStorage('rack-positions', positions);
          return positions[index] as T;
        }
      }
    }
    
    return [] as T;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  
  if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
  return response.json();
}

function createCRUD<T>(resource: string) {
  return {
    list: (sort?: string) => apiRequest<T[]>(`/${resource}${sort ? `?sort=${sort}` : ''}`),
    get: (id: string) => apiRequest<T>(`/${resource}/${id}`),
    create: (data: Omit<T, 'id'>) => apiRequest<T>(`/${resource}`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<T>) => apiRequest<T>(`/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => apiRequest<void>(`/${resource}/${id}`, { method: 'DELETE' }),
    filter: (params: Record<string, any>) => apiRequest<T[]>(`/${resource}?${new URLSearchParams(params)}`),
  };
}

export const RackConfigurationService = createCRUD<RackConfiguration>('racks');
export const DeviceService = createCRUD<Device>('devices');
export const PortService = createCRUD<Port>('ports');
export const ConnectionService = createCRUD<Connection>('connections');
export const CustomDeviceService = createCRUD<CustomDevice>('custom-devices');
export const StandaloneDeviceService = createCRUD<StandaloneDevice>('standalone-devices');
export const TopologyConnectionService = createCRUD<TopologyConnection>('topology-connections');
export const NetworkPlanService = createCRUD<NetworkPlan>('network-plans');
export const NASConfigurationService = createCRUD<NASConfiguration>('nas-configurations');
export const RackPositionService = createCRUD<RackPosition>('rack-positions');

// Development log - API service initialization
if (import.meta.env.DEV) {
  console.log('✅ API Service initialized with persistent mock data');
}