'use client';

// ================================
// JOB CARD COMPONENT
// Snow Removal Job Card
// ================================

import Link from 'next/link';
import { Job } from '@/types/database';
import { StatusBadge } from './StatusBadge';

interface JobCardProps {
  job: Job;
}

// Format time window display
function formatTimeWindow(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };
  
  if (start && end) {
    return `${formatTime(start)} - ${formatTime(end)}`;
  }
  return start ? formatTime(start) : formatTime(end!);
}

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function JobCard({ job }: JobCardProps) {
  const timeWindow = formatTimeWindow(job.time_window_start, job.time_window_end);
  
  return (
    <Link href={`/crew/jobs/${job.id}`} className="block">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 active:bg-gray-50 transition-colors hover:shadow-md sm:p-5">
        {/* Header with status badge */}
        <div className="flex items-start justify-between mb-3">
          <StatusBadge status={job.status} />
          <svg
            className="w-5 h-5 text-gray-400 shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>

        {/* Service type */}
        <h3 className="font-semibold text-gray-900 text-lg sm:text-xl mb-1 line-clamp-1">
          {job.service_type}
        </h3>

        {/* Address */}
        <div className="flex items-start gap-2 text-gray-500 text-sm mb-2">
          <svg
            className="w-4 h-4 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="line-clamp-2">{job.address}</span>
        </div>

        {/* Date & Time */}
        <div className="flex items-center gap-4 text-gray-500 text-sm">
          <div className="flex items-center gap-1.5">
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>{formatDate(job.date)}</span>
          </div>
          
          {timeWindow && (
            <div className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{timeWindow}</span>
            </div>
          )}
        </div>

        {/* Estimated duration */}
        {job.est_duration_min && (
          <div className="mt-2 text-xs text-gray-400">
            Est. {job.est_duration_min} min
          </div>
        )}
      </div>
    </Link>
  );
}
