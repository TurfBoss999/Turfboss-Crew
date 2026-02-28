// ================================
// TURFBOSS CREW CLIENT - TYPE DEFINITIONS
// ================================

export type TaskStatus = 'pending' | 'in-progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';
export type IssueType = 'equipment-failure' | 'access-blocked' | 'weather' | 'safety-concern' | 'other';

export interface Crew {
  id: string;
  name: string;
  phone: string;
  email: string;
  password: string; // For mock auth only
}

export interface Site {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  images: string[];
}

export interface Task {
  id: string;
  siteId: string;
  assignedCrewId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  scheduledDate: string;
  notes?: string;
}

export interface Issue {
  id: string;
  taskId: string;
  crewId: string;
  type: IssueType;
  description: string;
  createdAt: string;
}

export interface UploadedPhoto {
  id: string;
  taskId: string;
  url: string;
  uploadedAt: string;
}

export interface CrewAuthState {
  crew: Crew | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}
