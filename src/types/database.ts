// ================================
// TURFBOSS DATABASE TYPES
// ================================

export type UserRole = 'admin' | 'crew';
export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export type ServiceType = 'salt_lot' | 'plow_lot' | 'salt_walk' | 'shovel_walks';

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  salt_lot: 'Salt Lot',
  plow_lot: 'Plow Lot',
  salt_walk: 'Salt Walk',
  shovel_walks: 'Shovel Walks',
};

export interface Profile {
  id: string;
  role: UserRole;
  crew_id: string | null;
}

export interface Crew {
  id: string;
  name: string;
  phone: string | null;
  truck_number: string | null;
}

export interface Job {
  id: string;
  date: string;
  address: string;
  service_type: ServiceType;
  time_window_start: string | null;
  time_window_end: string | null;
  est_duration_min: number | null;
  service_notes: string | null;
  field_notes: string | null;
  lat: number | null;
  lng: number | null;
  crew_id: string | null;
  property_id: string | null;
  status: JobStatus;
  started_at: string | null;
  completed_at: string | null;
  completion_photo_url: string | null;
  image_urls: string[] | null;
  skid_steer_used: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobWithCrew extends Job {
  crew: Crew | null;
}

// Issue types for crew reporting
export type IssueType = 
  | 'equipment_failure' 
  | 'access_blocked' 
  | 'safety_hazard' 
  | 'weather_delay' 
  | 'client_not_available' 
  | 'other';

// API Response types
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
