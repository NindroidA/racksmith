import type { CustomDevice, Device, NetworkPlan, RackConfiguration } from '../types/entities';

export const mockRacks: RackConfiguration[] = [
  {
    id: '1',
    name: 'Main Server Rack',
    size_u: 42,
    location: 'Data Center A, Row 1',
    description: 'Primary production servers',
    color_tag: 'blue'
  },
  /*
  {
    id: '2',
    name: 'Network Equipment',
    size_u: 24,
    location: 'Data Center A, Row 2',
    description: 'Core network switches and routers',
    color_tag: 'purple'
  },
  {
    id: '3',
    name: 'Storage Array',
    size_u: 36,
    location: 'Data Center B, Row 1',
    description: 'SAN and NAS storage',
    color_tag: 'green'
  }
  */
];

export const mockDevices: Device[] = [
  {
    id: '1',
    rack_config_id: '1',
    name: 'Dell PowerEdge R740',
    manufacturer: 'dell',
    model: 'R740',
    device_type: 'server',
    size_u: 2,
    position_u: 1,
    port_count: 4,
    power_watts: 750
  },
  {
    id: '2',
    rack_config_id: '1',
    name: 'Cisco Catalyst 9300',
    manufacturer: 'cisco',
    model: 'C9300-48P',
    device_type: 'switch',
    size_u: 1,
    position_u: 5,
    port_count: 48,
    power_watts: 350
  },
  {
    id: '3',
    rack_config_id: '1',
    name: 'APC Smart-UPS',
    manufacturer: 'cisco',
    model: 'SMT3000RM2U',
    device_type: 'ups',
    size_u: 2,
    position_u: 40,
    port_count: 0,
    power_watts: 3000
  },
  {
    id: '4',
    rack_config_id: '2',
    name: 'Ubiquiti USW-Pro-48',
    manufacturer: 'ubiquiti',
    model: 'USW-Pro-48',
    device_type: 'switch',
    size_u: 1,
    position_u: 3,
    port_count: 48,
    power_watts: 200
  },
  {
    id: '5',
    rack_config_id: '2',
    name: 'Cisco ASA 5516-X',
    manufacturer: 'cisco',
    model: 'ASA5516',
    device_type: 'firewall',
    size_u: 1,
    position_u: 1,
    port_count: 12,
    power_watts: 250
  },
  {
    id: '6',
    rack_config_id: '3',
    name: 'Synology RS3621xs+',
    manufacturer: 'dell',
    model: 'RS3621xs+',
    device_type: 'storage',
    size_u: 2,
    position_u: 10,
    port_count: 8,
    power_watts: 450
  }
];

export const mockCustomDevices: CustomDevice[] = [
  {
    id: '1',
    name: 'Custom Server',
    manufacturer: 'Custom',
    model: 'CS-1000',
    device_type: 'server',
    size_u: 4,
    port_count: 8,
    power_watts: 1000,
    description: 'Custom built server'
  }
];

export const mockNetworkPlans: NetworkPlan[] = [
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
    ip_scheme: {
      base: '192.168.1.0/24',
      management: '192.168.10.0/24',
      servers: '192.168.20.0/24',
      users: '192.168.100.0/22'
    },
    vlan_config: [
      { vlan_id: '10', name: 'Management', description: 'Network management', subnet: '192.168.10.0/24', ports: '1-8' },
      { vlan_id: '100', name: 'Users', description: 'Employee workstations', subnet: '192.168.100.0/22', ports: '9-48' }
    ]
  }
];