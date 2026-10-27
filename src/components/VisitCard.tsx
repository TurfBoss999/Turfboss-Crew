'use client';

// ================================
// JOB CARD: one card per Job (property visit), with its services inside
// ================================

import Link from 'next/link';
import { SERVICE_TYPE_LABELS } from '@/types/database';
import { StatusBadge } from './StatusBadge';
import { legMinutesText, serviceStateText, VisitGroup } from '@/lib/jobVisits';

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${minutes} ${ampm}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function VisitCard({ group }: { group: VisitGroup }) {
  // A Job opens its own screen; a Sub Job with no Job (should not exist) opens the Sub Job itself
  const href = group.visitId ? `/crew/visits/${group.visitId}` : `/crew/jobs/${group.jobs[0]?.id ?? ''}`;
  const windowText =
    group.timeWindowStart && group.timeWindowEnd
      ? `${formatTime(group.timeWindowStart)} - ${formatTime(group.timeWindowEnd)}`
      : group.timeWindowStart
        ? formatTime(group.timeWindowStart)
        : group.timeWindowEnd
          ? formatTime(group.timeWindowEnd)
          : null;

  return (
    <Link href={href} className="block" data-testid="visit-card">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 active:bg-gray-50 transition-colors hover:shadow-md sm:p-5">
        <div className="flex items-start justify-between mb-2 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {group.routeOrder != null && (
              <span className="text-xs font-semibold text-white bg-gray-800 rounded-full px-2.5 py-1">
                Stop {group.routeOrder}
              </span>
            )}
            <StatusBadge status={group.status} />
          </div>
          <svg className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>

        <h3 className="font-semibold text-gray-900 text-base sm:text-lg line-clamp-2">{group.address}</h3>
        <p className="text-gray-500 text-sm mt-0.5">
          {formatDate(group.date)}
          {windowText && <> &middot; {windowText}</>}
        </p>
        {legMinutesText(group) && (
          <p className="text-gray-500 text-sm mt-0.5" data-testid="leg-minutes">
            {legMinutesText(group)}
          </p>
        )}

        <ul className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
          {group.jobs.map((job) => (
            <li key={job.id} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-gray-800">{SERVICE_TYPE_LABELS[job.service_type]}</span>
              <span
                className={`text-xs text-right ${
                  job.status === 'completed'
                    ? 'text-green-700'
                    : job.status === 'in_progress'
                      ? 'text-yellow-700'
                      : 'text-gray-500'
                }`}
              >
                {serviceStateText(job)}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-sm font-medium text-gray-700">
          {group.doneCount} of {group.totalCount} done
        </p>
      </div>
    </Link>
  );
}
