// ================================
// TURFBOSS CREW CLIENT - MOCK DATA
// ================================

import { Crew, Site, Task, Issue, UploadedPhoto } from '@/types';

// ================================
// MOCK CREWS
// ================================
export const mockCrews: Crew[] = [
  {
    id: 'crew-001',
    name: 'Alpha Team',
    phone: '+1 (555) 123-4567',
    email: 'alpha@turfboss.com',
    password: 'alpha123',
  },
  {
    id: 'crew-002',
    name: 'Beta Team',
    phone: '+1 (555) 234-5678',
    email: 'beta@turfboss.com',
    password: 'beta123',
  },
  {
    id: 'crew-003',
    name: 'Charlie Team',
    phone: '+1 (555) 345-6789',
    email: 'charlie@turfboss.com',
    password: 'charlie123',
  },
];

// ================================
// MOCK SITES
// ================================
export const mockSites: Site[] = [
  {
    id: 'site-001',
    name: 'Riverside Golf Course',
    address: '1234 Fairway Drive, Palm Beach, FL 33480',
    latitude: 26.7056,
    longitude: -80.0364,
    images: [
      '/placeholder-site-1.jpg',
      '/placeholder-site-2.jpg',
    ],
  },
  {
    id: 'site-002',
    name: 'Oceanview Country Club',
    address: '5678 Ocean Blvd, Miami, FL 33139',
    latitude: 25.7617,
    longitude: -80.1918,
    images: [
      '/placeholder-site-3.jpg',
    ],
  },
  {
    id: 'site-003',
    name: 'Palm Grove Sports Complex',
    address: '910 Palm Avenue, Fort Lauderdale, FL 33301',
    latitude: 26.1224,
    longitude: -80.1373,
    images: [
      '/placeholder-site-4.jpg',
      '/placeholder-site-5.jpg',
    ],
  },
  {
    id: 'site-004',
    name: 'Sunset Park Athletic Fields',
    address: '2468 Sunset Road, Boca Raton, FL 33431',
    latitude: 26.3683,
    longitude: -80.1289,
    images: [
      '/placeholder-site-6.jpg',
    ],
  },
  {
    id: 'site-005',
    name: 'Green Meadows Estate',
    address: '135 Meadow Lane, Jupiter, FL 33458',
    latitude: 26.9342,
    longitude: -80.0942,
    images: [],
  },
];

// ================================
// MOCK TASKS
// ================================
export const mockTasks: Task[] = [
  // Alpha Team Tasks
  {
    id: 'task-001',
    siteId: 'site-001',
    assignedCrewId: 'crew-001',
    title: 'Full Turf Maintenance',
    description: 'Complete maintenance including mowing, edging, and debris removal on all 18 holes. Pay special attention to bunker edges and green surrounds. Apply fertilizer per schedule.',
    status: 'pending',
    priority: 'high',
    scheduledDate: '2026-02-13',
    notes: 'Tournament prep - ensure pristine condition',
  },
  {
    id: 'task-002',
    siteId: 'site-002',
    assignedCrewId: 'crew-001',
    title: 'Irrigation System Check',
    description: 'Inspect and test all irrigation zones. Report any broken heads or leaks. Adjust spray patterns as needed for optimal coverage.',
    status: 'in-progress',
    priority: 'medium',
    scheduledDate: '2026-02-13',
  },
  {
    id: 'task-003',
    siteId: 'site-003',
    assignedCrewId: 'crew-001',
    title: 'Aeration Treatment',
    description: 'Core aeration of main soccer field. Focus on high-traffic goal areas. Apply topdressing after aeration.',
    status: 'completed',
    priority: 'low',
    scheduledDate: '2026-02-12',
  },
  // Beta Team Tasks
  {
    id: 'task-004',
    siteId: 'site-004',
    assignedCrewId: 'crew-002',
    title: 'Emergency Repair - Sinkhole',
    description: 'Assess and repair small sinkhole near field 3. Fill, compact, and reseed area. Mark off until grass establishes.',
    status: 'pending',
    priority: 'high',
    scheduledDate: '2026-02-13',
    notes: 'Safety hazard - prioritize',
  },
  {
    id: 'task-005',
    siteId: 'site-005',
    assignedCrewId: 'crew-002',
    title: 'Lawn Care Service',
    description: 'Weekly lawn maintenance for estate grounds. Mow, edge, blow, and treat for weeds as needed.',
    status: 'pending',
    priority: 'medium',
    scheduledDate: '2026-02-13',
  },
  // Charlie Team Tasks
  {
    id: 'task-006',
    siteId: 'site-001',
    assignedCrewId: 'crew-003',
    title: 'Tree Trimming & Pruning',
    description: 'Trim overhanging branches near fairways 5, 7, and 12. Remove dead branches and shape ornamental trees near clubhouse.',
    status: 'in-progress',
    priority: 'medium',
    scheduledDate: '2026-02-13',
  },
  {
    id: 'task-007',
    siteId: 'site-003',
    assignedCrewId: 'crew-003',
    title: 'Field Line Marking',
    description: 'Mark lines for upcoming tournament. Include soccer field, track lanes, and long jump pit.',
    status: 'pending',
    priority: 'high',
    scheduledDate: '2026-02-14',
    notes: 'Tournament starts Feb 15',
  },
];

// ================================
// MOCK ISSUES (Initially empty, populated during runtime)
// ================================
export const mockIssues: Issue[] = [];

// ================================
// MOCK UPLOADED PHOTOS (Initially empty, populated during runtime)
// ================================
export const mockPhotos: UploadedPhoto[] = [];

// ================================
// HELPER FUNCTIONS
// ================================

export function getSiteById(siteId: string): Site | undefined {
  return mockSites.find(site => site.id === siteId);
}

export function getTaskById(taskId: string): Task | undefined {
  return mockTasks.find(task => task.id === taskId);
}

export function getTasksForCrew(crewId: string): Task[] {
  return mockTasks.filter(task => task.assignedCrewId === crewId);
}

export function getCrewByEmail(email: string): Crew | undefined {
  return mockCrews.find(crew => crew.email.toLowerCase() === email.toLowerCase());
}

export function addIssue(issue: Issue): void {
  mockIssues.push(issue);
}

export function addPhoto(photo: UploadedPhoto): void {
  mockPhotos.push(photo);
}

export function updateTaskStatus(taskId: string, status: Task['status']): boolean {
  const task = mockTasks.find(t => t.id === taskId);
  if (task) {
    task.status = status;
    return true;
  }
  return false;
}
