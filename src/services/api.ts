import type { Connection, CustomDevice, Device, NASConfiguration, NetworkPlan, Port, RackConfiguration, RackPosition, StandaloneDevice, TopologyConnection } from '../types/entities';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const USE_MOCK_DATA = true;

// Use localStorage to persist mock data across refreshes
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

// Initial mock data
const initialRacks: RackConfiguration[] = [
  { id: '1', name: 'Main Server Rack', size_u: 42, location: 'Data Center A, Row 1', description: 'Primary production servers', color_tag: 'blue' },
  { id: '2', name: 'Network Equipment', size_u: 24, location: 'Data Center A, Row 2', description: 'Core network switches and routers', color_tag: 'purple' },
  { id: '3', name: 'Storage Array', size_u: 36, location: 'Data Center B, Row 1', description: 'SAN and NAS storage', color_tag: 'green' }
];

const initialDevices: Device[] = [
  { id: '1', rack_config_id: '1', name: 'Dell PowerEdge R740', manufacturer: 'dell', model: 'R740', device_type: 'server', size_u: 2, position_u: 1, port_count: 4, power_watts: 750 },
  { id: '2', rack_config_id: '1', name: 'Cisco Catalyst 9300', manufacturer: 'cisco', model: 'C9300-48P', device_type: 'switch', size_u: 1, position_u: 5, port_count: 48, power_watts: 350 },
  { id: '3', rack_config_id: '1', name: 'APC Smart-UPS', manufacturer: 'dell', model: 'SMT3000RM2U', device_type: 'ups', size_u: 2, position_u: 40, port_count: 0, power_watts: 3000 },
  { id: '4', rack_config_id: '2', name: 'Ubiquiti USW-Pro-48', manufacturer: 'ubiquiti', model: 'USW-Pro-48', device_type: 'switch', size_u: 1, position_u: 3, port_count: 48, power_watts: 200 },
  { id: '5', rack_config_id: '2', name: 'Cisco ASA 5516-X', manufacturer: 'cisco', model: 'ASA5516', device_type: 'firewall', size_u: 1, position_u: 1, port_count: 12, power_watts: 250 },
  { id: '6', rack_config_id: '3', name: 'Synology RS3621xs+', manufacturer: 'cisco', model: 'RS3621xs+', device_type: 'storage', size_u: 2, position_u: 10, port_count: 8, power_watts: 450 }
];

const initialCustomDevices: CustomDevice[] = [
  { id: '1', name: 'Custom Server', manufacturer: 'Custom', model: 'CS-1000', device_type: 'server', size_u: 4, port_count: 8, power_watts: 1000, description: 'Custom built server' }
];

const initialNetworkPlans: NetworkPlan[] = [
  {
    id: '1',
    name: 'Office Network 2024',
    facility_size: 'medium',
    total_devices: 100,
    wired_devices: 60,
    wireless_devices: 40,
    access_points: 5,
    cameras: 10,
    phones: 25,
    floors: 2,
    square_feet: 5000,
    ip_scheme: { base: '192.168.1.0/24', management: '192.168.10.0/24', servers: '192.168.20.0/24', users: '192.168.100.0/22' },
    vlan_config: [
      { vlan_id: '10', name: 'Management', description: 'Network management', subnet: '192.168.10.0/24', ports: '1-8' },
      { vlan_id: '100', name: 'Users', description: 'Employee workstations', subnet: '192.168.100.0/22', ports: '9-48' }
    ]
  }
];

// Initialize storage if empty
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

const mockDelay = () => new Promise(resolve => setTimeout(resolve, 200));

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  if (USE_MOCK_DATA) {
    await mockDelay();
    
    const path = endpoint.split('?')[0]!;
    const method = options?.method || 'GET';
    const params = new URLSearchParams(endpoint.includes('?') ? endpoint.split('?')[1] : '');
    
    // Racks
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
    
    // Devices
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
    
    // Ports
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
    
    // Connections
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
    
    // Custom Devices
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
    
    // Standalone Devices
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
    
    // Topology Connections
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
    
    // Network Plans
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
    
    // NAS Configurations
    if (path.includes('/nas-configurations')) {
      let nasConfigs = getFromStorage<NASConfiguration>('nas-configurations', []);
      
      if (method === 'GET') return nasConfigs as T;
      if (method === 'POST') {
        const newNAS = { ...JSON.parse(options?.body as string), id: Date.now().toString() };
        nasConfigs.push(newNAS);
        saveToStorage('nas-configurations', nasConfigs);
        return newNAS as T;
      }
    }
    
    // Rack Positions
    if (path.includes('/rack-positions')) {
      let positions = getFromStorage<RackPosition>('rack-positions', []);
      
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

console.log('✅ API Service initialized with persistent mock data');