'use client';

// ================================
// JOB SCREEN: one property visit with every service under it
// A Job is a job_visits row; its services are Sub Jobs (jobs rows). The work on a service
// (start, photos, complete, issues, notes) happens on the existing Sub Job page.
// ================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useCrewAuth } from '@/contexts/CrewAuthContext';
import { StatusBadge, SiteMapViewer } from '@/components';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { JobWithCrew, SERVICE_TYPE_LABELS } from '@/types/database';
import { groupByVisit, JOB_VISIT_EMBEDS, legMinutesText, serviceStateText } from '@/lib/jobVisits';

const supabase = getSupabaseBrowserClient();

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function VisitPage() {
  const router = useRouter();
  const params = useParams();
  const visitId = params?.visitId as string;
  const { profile, isAuthenticated, isLoading: authLoading } = useCrewAuth();

  const [subJobs, setSubJobs] = useState<JobWithCrew[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // 'notfound' covers a Job that does not exist AND one this crew is not on: the database hands back
  // no rows for it, and the page must not say which it was.
  const [problem, setProblem] = useState<'notfound' | 'failed' | null>(null);
  const [siteMapUrl, setSiteMapUrl] = useState<string | null>(null);
  const [siteMapOpen, setSiteMapOpen] = useState(false);

  const fetchVisit = useCallback(async () => {
    if (!visitId) return;
    try {
      // Row-level security limits this to Jobs the crew is on (through job_visit_crews), so a Job
      // that is not theirs simply comes back empty.
      // If a newer column is not in the database yet, try the shorter list of fields (never lose the stop number).
      let data: unknown[] | null = null;
      let error: { code?: string } | null = null;
      for (const embed of JOB_VISIT_EMBEDS) {
        const res = await supabase
          .from('jobs')
          .select(embed ? `*, crew:crews(*), ${embed}` : '*, crew:crews(*)')
          .eq('job_visit_id', visitId);
        data = res.data;
        error = res.error;
        // 22P02 is an invalid id in the address: no shorter list will fix that
        if (!error || error.code === '22P02') break;
      }

      if (error) {
        // 22P02: the id in the address is not even a valid id
        setProblem(error.code === '22P02' ? 'notfound' : 'failed');
        setSubJobs([]);
        return;
      }
      const rows = (data ?? []) as JobWithCrew[];
      setSubJobs(rows);
      setProblem(rows.length === 0 ? 'notfound' : null);

      if (rows.length > 0) {
        // The site map comes through a narrow database function (it returns only the picture's address,
        // and only for a Job this crew is on). Any failure just means no site map is shown.
        const map = await supabase.rpc('get_site_map_for_job', { p_job_id: rows[0].id });
        setSiteMapUrl(!map.error && typeof map.data === 'string' ? map.data : null);
      } else {
        setSiteMapUrl(null);
      }
    } catch {
      setProblem('failed');
    }
  }, [visitId]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/crew/login');
      return;
    }
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      await fetchVisit();
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, router, fetchVisit]);

  // Another crew may start a service while this screen is open, so look again when the crew comes back to it
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible' && isAuthenticated) fetchVisit();
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchVisit, isAuthenticated]);

  const group = useMemo(() => groupByVisit(subJobs)[0] ?? null, [subJobs]);

  // Service notes belong to the property, so they are shown once for the whole Job (the same text
  // is usually saved on every service; different texts are each shown).
  const notes = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const job of group?.jobs ?? []) {
      const text = (job.service_notes ?? '').trim();
      if (text && !seen.has(text)) {
        seen.add(text);
        out.push(text);
      }
    }
    return out;
  }, [group]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading job...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !profile) return null;

  if (problem || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6">
          <p className="text-gray-700 font-medium text-lg">
            {problem === 'failed' ? 'Could not load this job' : 'Not found'}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {problem === 'failed' ? 'Check your connection and try again.' : 'This job is not on your list.'}
          </p>
          <Link href="/crew/jobs" className="mt-4 inline-block text-emerald-600 font-medium">
            Back to my jobs
          </Link>
        </div>
      </div>
    );
  }

  const windowText =
    group.timeWindowStart && group.timeWindowEnd
      ? `${formatTime(group.timeWindowStart)} - ${formatTime(group.timeWindowEnd)}`
      : group.timeWindowStart
        ? formatTime(group.timeWindowStart)
        : group.timeWindowEnd
          ? formatTime(group.timeWindowEnd)
          : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {siteMapOpen && siteMapUrl && <SiteMapViewer url={siteMapUrl} onClose={() => setSiteMapOpen(false)} />}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/crew/jobs"
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Back to my jobs"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-gray-900 truncate sm:text-lg">{group.address}</h1>
            <p className="text-sm text-gray-500 truncate sm:text-base">{formatDate(group.date)}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            {group.routeOrder != null && (
              <span className="text-xs font-semibold text-white bg-gray-800 rounded-full px-2.5 py-1">
                Stop {group.routeOrder}
              </span>
            )}
            <StatusBadge status={group.status} />
            <span className="text-sm font-medium text-gray-700" data-testid="done-count">
              {group.doneCount} of {group.totalCount} done
            </span>
            {windowText && <span className="text-sm text-gray-500">&middot; {windowText}</span>}
            {legMinutesText(group) && (
              <span className="text-sm text-gray-500" data-testid="leg-minutes">
                &middot; {legMinutesText(group)}
              </span>
            )}
          </div>

          {siteMapUrl && (
            <button
              type="button"
              onClick={() => setSiteMapOpen(true)}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-4 text-left"
            >
              <span className="font-medium text-gray-900">Site map</span>
              <span className="text-sm font-medium text-emerald-600">View full size</span>
            </button>
          )}

          {notes.length > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <h2 className="font-medium text-amber-900 mb-1">Service notes</h2>
              {notes.map((text) => (
                <p key={text} className="text-amber-900 text-sm whitespace-pre-wrap">
                  {text}
                </p>
              ))}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            <h2 className="px-4 py-3 font-medium text-gray-900">Services</h2>
            {group.jobs.map((job) => {
              const mine = !!profile.crew_id && job.crew_id === profile.crew_id;
              const claimedByOther = !!job.crew_id && !mine && job.status !== 'completed';
              const canStart = job.status === 'scheduled' && !job.crew_id;
              const canOpen = job.status === 'completed' || (job.status === 'in_progress' && (!job.crew_id || mine));
              return (
                <div key={job.id} className="flex items-center justify-between gap-3 px-4 py-3" data-testid="service-row">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{SERVICE_TYPE_LABELS[job.service_type]}</p>
                    <p
                      className={`text-sm ${
                        job.status === 'completed'
                          ? 'text-green-700'
                          : job.status === 'in_progress'
                            ? 'text-yellow-700'
                            : 'text-gray-500'
                      }`}
                    >
                      {serviceStateText(job)}
                    </p>
                  </div>
                  {canStart && (
                    <Link
                      href={`/crew/jobs/${job.id}`}
                      className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
                    >
                      Start
                    </Link>
                  )}
                  {canOpen && (
                    <Link
                      href={`/crew/jobs/${job.id}`}
                      className="shrink-0 rounded-lg border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700"
                    >
                      Open
                    </Link>
                  )}
                  {claimedByOther && !canOpen && (
                    <span className="shrink-0 text-xs text-gray-500">Another crew has this</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
