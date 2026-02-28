// ================================
// TURFBOSS DATABASE TYPES
// ================================

export type UserRole = 'admin' | 'crew';
export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

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
  service_type: string;      // e.g. "Snow Plowing", "Salting / De-Icing", "Sidewalk Clearing"
  time_window_start: string | null;
  time_window_end: string | null;
  est_duration_min: number | null;
  notes: string | null;
  lat: number | null;
  lng: number | null;
  crew_id: string | null;
  status: JobStatus;
  completion_photo_url: string | null;
  image_urls: string[] | null;
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
