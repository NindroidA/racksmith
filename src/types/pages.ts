// ===== FloorPlan ===== //
export interface DraggedItem {
  id: string;
  type: 'standalone' | 'rack';
  [key: string]: any;
}


// ===== NetworkTools //
export type ToolType = 'builder' | 'subnet' | 'vlan' | 'nas';

export interface PlanData {
  plan_name: string;
  facility_size: 'small' | 'medium' | 'large' | 'enterprise';
  square_feet: number;
  floors: number;
  wired_devices: number;
  wireless_devices: number;
  cameras: number;
  phones: number;
}

export interface VLANConfig {
  vlan_id: string;
  name: string;
  description: string;
  ports: string;
  color: string;
}