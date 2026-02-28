// ================================
// STATUS BADGE COMPONENT
// Snow Removal Job Status Badges
// ================================

import { JobStatus } from '@/types/database';

interface StatusBadgeProps {
  status: JobStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const statusConfig: Record<JobStatus, { bg: string; text: string; border: string; dotColor: string; label: string }> = {
    scheduled: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dotColor: 'bg-emerald-500',
      label: 'Scheduled',
    },
    in_progress: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      dotColor: 'bg-yellow-500',
      label: 'In Progress',
    },
    completed: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-200',
      dotColor: 'bg-green-500',
      label: 'Completed',
    },
    cancelled: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-200',
      dotColor: 'bg-red-500',
      label: 'Cancelled',
    },
  };

  const config = statusConfig[status];

  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${config.dotColor}`} />
      {config.label}
    </span>
  );
}
