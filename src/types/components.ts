import { ReactNode } from "react";
import { Connection, CustomDevice, Device, Port, RackConfiguration, StandaloneDevice } from "./entities";

// ===== dashboard ===== //
export interface RackListProps {
  racks: RackConfiguration[];
  devices: Device[];
  isLoading: boolean;
  onRackDeleted: () => void;
}

export interface StatsGridProps {
  totalRacks: number;
  totalDevices: number;
  utilizationPercent: number;
  isLoading: boolean;
}


// ===== device-library ===== //
export interface CustomDeviceDialogProps {
  device?: CustomDevice;
  onSave: (deviceData: Omit<CustomDevice, 'id'>) => Promise<void>;
  onClose: () => void;
}


// ===== device-ports ===== //
export interface ConnectionCreatorProps {
  sourceDevice: Device;
  sourcePort: Port;
  allDevices: Device[];
  onClose: () => void;
}

export interface PortCardProps {
  port: Port;
  connection?: Connection;
  allDevices: Device[];
  index: number;
  onEdit: () => void;
  onConnect: () => void;
  onRefresh: () => void;
}

export interface PortEditorProps {
  port?: Port;
  deviceId: string;
  onClose: () => void;
}

// ===== floor-plan ===== //
export interface StandaloneDeviceDialogProps {
  device?: StandaloneDevice;
  onClose: () => void;
}

export interface TopologyConnectionDialogProps {
  devices: (StandaloneDevice | RackConfiguration)[];
  onClose: () => void;
}


// ===== network-tools ===== //
export interface IPSegment {
  name: string;
  subnet: string;
  hosts: string;
  range: string;
}

export interface DriveConfig {
  bay_number: number;
  drive_type: 'hdd' | 'ssd' | 'nvme';
  capacity_tb: number;
  rpm?: number;
  interface: 'sata' | 'sas' | 'nvme';
}

export interface PlanData {
  name: string;
  facility_size: 'small' | 'medium' | 'large' | 'enterprise';
  total_devices: number;
  wired_devices: number;
  wireless_devices: number;
  access_points: number;
  cameras: number;
  phones: number;
  floors: number;
  square_feet: number;
}

export interface IPScheme {
  base: string;
  management?: string;
  servers?: string;
  users?: string;
  guest?: string;
  iot?: string;
}

export interface VLANConfig {
  vlan_id: string;
  name: string;
  description: string;
  subnet: string;
  ports?: string;
  device_count?: string;
}

export interface SubnetResult {
  network: string;
  broadcast: string;
  subnetMask: string;
  firstUsable: string;
  lastUsable: string;
  totalHosts: number;
  usableHosts: number;
  recommendedDevices: {
    workstations: number;
    servers: number;
    printers: number;
    iot: number;
    reserved: number;
  };
}

export interface ResultRowProps {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface VLAN {
  id: number;
  vlan_id: string;
  name: string;
  description: string;
  color: string;
  ports: string;
}


// ===== rack ===== //
export interface DeviceGraphicProps {
  type: string;
  className?: string;
}

export interface DevicePaletteProps {
  devices: (Device | CustomDevice)[];
  onDeviceSelect: (device: Device | CustomDevice) => void;
  selectedDevice: (Device | CustomDevice) | null;
  onDragStart?: (size: number) => void;
  onDragEnd?: () => void;
}

export interface RackVisualizerProps {
  rackSizeU: number;
  devices: Device[];
  onDeviceClick: (device: Device) => void;
  onDeviceRemove: (deviceId: string) => void;
  onPositionClick: (positionU: number) => void;
  onDeviceDrop: (position: number, device: any, isMoving?: boolean) => void;
  selectedPosition: number | null;
  draggedDeviceSize?: number;
}


// ===== rack-builder ===== //
export interface DevicePropertiesPanelProps {
  device: Device;
  onUpdate: (updates: Partial<Device>) => void;
  onClose: () => void;
}

export interface DeviceSelectorProps {
  rackSize: number;
  existingDevices: Device[];
  onAddDevice: (device: Partial<Device>) => void;
}

export interface PresetDevice {
  name: string;
  manufacturer: string;
  model: string;
  device_type: Device['device_type'];
  size_u: number;
  port_count: number;
  power_watts: number;
  description: string;
}

export interface RackVisualizerProps {
  rackSize: number;
  devices: Device[];
  selectedDevice?: Device;
  onDeviceSelect: (device: Device) => void;
  onDeviceRemove: (deviceId: string) => void;
  onDeviceMove: (deviceId: string, newPosition: number) => void;
  colorTag?: string;
}

export interface DropEffect {
  id: number;
  unit: number;
  delay: number;
}


// ===== rack-details ===== //
export interface ConnectionManagerProps {
  devices: Device[];
  connections: Connection[];
  onClose: () => void;
}

export interface DeviceConnectionsViewProps {
  device: Device;
  connections: Connection[];
  allDevices: Device[];
  onClose: () => void;
}

// ===== Layout ===== //
export interface LayoutProps {
  children?: ReactNode;
}

// ===== ProtectedRoute ===== //
export interface ProtectedRouteProps {
  children: ReactNode;
}