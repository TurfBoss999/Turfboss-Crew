import { JobStatus, JobWithCrew, ServiceType } from '@/types/database';

// A Job is one property visit (a job_visits row); its services are the Sub Jobs (jobs rows) under it.
// This file is a copy of the matching parts of the Admin app's src/lib/jobVisits.ts. The two apps are
// separate repos, so keep the rules the same by hand rather than importing across them.

// A Job's status is computed from its services, never stored: Completed when every service that
// is not cancelled is done, In Progress once any has started or finished, Cancelled only when all of
// them are, otherwise Scheduled. (A service with no status counts as scheduled.)
export function visitStatus(jobs: { status: JobStatus | null }[]): JobStatus {
  if (jobs.length === 0) return 'scheduled';
  const active = jobs.filter((j) => (j.status ?? 'scheduled') !== 'cancelled');
  if (active.length === 0) return 'cancelled';
  if (active.every((j) => j.status === 'completed')) return 'completed';
  if (active.some((j) => j.status === 'in_progress' || j.status === 'completed')) return 'in_progress';
  return 'scheduled';
}

// Today as a plain YYYY-MM-DD string in the crew's own time zone. date columns are plain strings, so
// compare them with this: toISOString() reports UTC and would call tonight "tomorrow".
export function todayLocalISO(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// The order services are listed in on a Job, the same every time
const SERVICE_ORDER: ServiceType[] = ['plow_lot', 'salt_lot', 'salt_walk', 'shovel_walks'];

export interface VisitGroup {
  // null only for a Sub Job with no Job (should not exist); its card then opens the Sub Job itself
  visitId: string | null;
  date: string;
  address: string;
  routeOrder: number | null;
  // Estimated drive minutes from the previous stop (stop 1: from the start), when the office saved them
  legMinutes: number | null;
  // Services still on the Job (cancelled ones are left out), in a fixed order
  jobs: JobWithCrew[];
  status: JobStatus;
  doneCount: number;
  totalCount: number;
  timeWindowStart: string | null;
  timeWindowEnd: string | null;
}

// One group per Job, in the order the crew should work them: date, then the planned stop number
// (Jobs with no number last), then the Job id so the order never jumps around.
export function groupByVisit(subJobs: JobWithCrew[]): VisitGroup[] {
  const byKey = new Map<string, JobWithCrew[]>();
  for (const job of subJobs) {
    const key = job.job_visit_id ?? `solo-${job.id}`;
    const list = byKey.get(key);
    if (list) list.push(job);
    else byKey.set(key, [job]);
  }

  const groups: VisitGroup[] = [];
  byKey.forEach((all) => {
    const first = all[0];
    const live = all
      .filter((j) => (j.status ?? 'scheduled') !== 'cancelled')
      .sort((a, b) => SERVICE_ORDER.indexOf(a.service_type) - SERVICE_ORDER.indexOf(b.service_type));
    groups.push({
      visitId: first.job_visit_id,
      date: first.date,
      address: first.address,
      routeOrder: first.job_visit?.route_order ?? null,
      legMinutes: first.job_visit?.route_leg_minutes ?? null,
      jobs: live,
      // the status of the whole Job counts cancelled services too (a Job whose services are all cancelled is cancelled)
      status: visitStatus(all),
      doneCount: live.filter((j) => j.status === 'completed').length,
      totalCount: live.length,
      timeWindowStart: live.find((j) => j.time_window_start)?.time_window_start ?? null,
      timeWindowEnd: live.find((j) => j.time_window_end)?.time_window_end ?? null,
    });
  });

  const stop = (g: VisitGroup) => g.routeOrder ?? Number.POSITIVE_INFINITY;
  return groups.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (stop(a) !== stop(b)) return stop(a) < stop(b) ? -1 : 1;
    const ka = a.visitId ?? '';
    const kb = b.visitId ?? '';
    if (ka !== kb) return ka < kb ? -1 : 1;
    return 0;
  });
}

// The Job's fields to read along with each Sub Job, newest first. If the database does not have a newer
// column yet, the next shorter list is tried, so a missing column costs that field only, never the stop number.
export const JOB_VISIT_EMBEDS: (string | null)[] = [
  'job_visit:job_visits(route_order, route_leg_minutes)',
  'job_visit:job_visits(route_order)',
  null,
];

// "About 8 min from the previous stop" for the card, or null when the office saved no minutes
export function legMinutesText(group: Pick<VisitGroup, 'routeOrder' | 'legMinutes'>): string | null {
  if (group.routeOrder == null || group.legMinutes == null) return null;
  return `About ${group.legMinutes} min from ${group.routeOrder === 1 ? 'the start' : 'the previous stop'}`;
}

// What to show next to one service: its state and who has it
export function serviceStateText(job: Pick<JobWithCrew, 'status' | 'crew_id' | 'crew'>): string {
  const who = job.crew?.name;
  if (job.status === 'completed') return who ? `Completed by ${who}` : 'Completed';
  if (job.status === 'in_progress') return who ? `In Progress by ${who}` : 'In Progress';
  return job.crew_id ? (who ? `Claimed by ${who}` : 'Claimed') : 'Available';
}
