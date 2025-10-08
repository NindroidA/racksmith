// Rack Configuration
export interface RackConfiguration {
  id: string;
  name: string;
  size_u: number;
  location?: string;
  description?: string;
  color_tag: 'blue' | 'purple' | 'cyan' | 'green' | 'orange' | 'red';
  created_date?: string;
}

// Device
export interface Device {
  id: string;
  rack_config_id: string;
  name: string;
  manufacturer: 'cisco' | 'ubiquiti' | 'fs' | 'tripplite' | 'dell' | 'hp' | 'juniper' | 'arista' | 'custom';
  model?: string;
  device_type: 'router' | 'switch' | 'fiber_switch' | 'ups' | 'patch_panel' | 'server' | 'firewall' | 'load_balancer' | 'storage' | 'pdu' | 'other';
  size_u: number;
  position_u: number;
  port_count?: number;
  power_watts?: number;
  notes?: string;
}

// Connection
export interface Connection {
  id: string;
  source_device_id: string;
  source_port: string;
  destination_device_id: string;
  destination_port: string;
  cable_type: 'cat5e' | 'cat6' | 'cat6a' | 'cat7' | 'fiber_om3' | 'fiber_om4' | 'fiber_sm' | 'sfp' | 'sfp_plus' | 'qsfp' | 'qsfp28' | 'dac' | 'power';
  cable_length_ft?: number;
  description?: string;
  vlan?: string;
  source_port_id?: string;
  destination_port_id?: string;
}

// Custom Device
export interface CustomDevice {
  id: string;
  name: string;
  manufacturer: string;
  model?: string;
  device_type: 'router' | 'switch' | 'fiber_switch' | 'ups' | 'patch_panel' | 'server' | 'firewall' | 'load_balancer' | 'storage' | 'pdu' | 'other';
  size_u: number;
  port_count?: number;
  power_watts?: number;
  description?: string;
  created_date?: string;
}

// Rack Position (for floor plan)
export interface RackPosition {
  id: string;
  rack_config_id: string;
  x_position: number;
  y_position: number;
  rotation?: number;
}

// Port
export interface Port {
  id: string;
  device_id: string;
  port_number: string;
  port_type: 'ethernet' | 'sfp' | 'sfp_plus' | 'qsfp' | 'qsfp28' | 'fiber' | 'power' | 'management' | 'other';
  status: 'available' | 'connected' | 'disabled' | 'reserved';
  description?: string;
  vlan?: string;
  speed?: '10M' | '100M' | '1G' | '2.5G' | '5G' | '10G' | '25G' | '40G' | '100G';
  notes?: string;
}

// Standalone Device (for floor plan)
export interface StandaloneDevice {
  id: string;
  name: string;
  device_type: 'isp' | 'router' | 'switch' | 'fiber_switch' | 'firewall' | 'server' | 'patch_panel' | 'fiber_panel' | 'ups' | 'pdu' | 'load_balancer' | 'access_point' | 'camera' | 'door_controller' | 'keycard_reader' | 'telephone' | 'intercom' | 'poe_injector' | 'media_converter' | 'other';
  manufacturer?: string;
  model?: string;
  x_position: number;
  y_position: number;
  icon_color: 'blue' | 'purple' | 'cyan' | 'green' | 'orange' | 'red' | 'yellow' | 'pink';
  port_count?: number;
  notes?: string;
}

// Topology Connection (for floor plan)
export interface TopologyConnection {
  id: string;
  source_device_id: string;
  source_type: 'standalone' | 'rack';
  destination_device_id: string;
  destination_type: 'standalone' | 'rack';
  connection_type: 'fiber' | 'ethernet' | 'sfp' | 'qsfp' | 'dac' | 'wireless' | 'other';
  bandwidth?: string;
  description?: string;
}

// Network Plan
export interface NetworkPlan {
  id: string;
  name: string;
  facility_size: 'small' | 'medium' | 'large' | 'enterprise';
  total_devices?: number;
  wired_devices: number;
  wireless_devices: number;
  access_points?: number;
  cameras?: number;
  phones?: number;
  floors?: number;
  square_feet?: number;
  ip_scheme?: {
    base: string;
    management?: string;
    servers?: string;
    users?: string;
    guest?: string;
    iot?: string;
  };
  vlan_config?: Array<{
    vlan_id: string;
    name: string;
    description: string;
    subnet: string;
    ports?: string;
    device_count?: string;
  }>;
  poe_budget?: number;
  notes?: string;
  created_date?: string;
}

// NAS Configuration
export interface NASConfiguration {
  id: string;
  name: string;
  chassis_type: '2bay' | '4bay' | '8bay' | '12bay' | '16bay' | '24bay' | '45bay' | 'custom';
  drives?: Array<{
    bay_number: number;
    drive_type: 'hdd' | 'ssd' | 'nvme';
    capacity_tb: number;
    rpm?: number;
    interface: 'sata' | 'sas' | 'nvme';
  }>;
  raid_type: 'raid0' | 'raid1' | 'raid5' | 'raid6' | 'raid10' | 'raid50' | 'raid60' | 'jbod';
  total_capacity_tb?: number;
  usable_capacity_tb?: number;
  network_interfaces?: number;
  notes?: string;
}