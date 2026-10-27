'use client';

// ================================
// CREW JOBS LIST PAGE
// Real Supabase Database
// ================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCrewAuth } from '@/contexts/CrewAuthContext';
import { VisitCard } from '@/components';
import { groupByVisit, JOB_VISIT_EMBEDS, todayLocalISO } from '@/lib/jobVisits';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { JobWithCrew } from '@/types/database';

const supabase = getSupabaseBrowserClient();

type FilterType = 'all' | 'today' | 'upcoming' | 'completed';

export default function CrewJobsPage() {
  const router = useRouter();
  const { crewInfo, profile, isAuthenticated, isLoading: authLoading, logout } = useCrewAuth();
  const [jobs, setJobs] = useState<JobWithCrew[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch jobs from database
  const fetchJobs = useCallback(async () => {
    console.log('fetchJobs called, profile?.crew_id:', profile?.crew_id);
    if (!profile?.crew_id) {
      console.log('No crew_id found, skipping fetch');
      return;
    }
    
    try {
      // No crew_id filter: a crew sees every Sub Job of the Jobs it is assigned to, and
      // row-level security (via job_visit_crews) is what limits that. The Job's stop number
      // (route_order) and the estimated minutes to it come along so the list can follow the planned route.
      // If a column does not exist yet (a database script has not been run), try the shorter list of
      // fields rather than showing a crew nothing at all, and keep the stop number whenever it exists.
      let data: unknown[] | null = null;
      let fetchError: { message: string } | null = null;
      for (const embed of JOB_VISIT_EMBEDS) {
        const res = await supabase
          .from('jobs')
          .select(embed ? `*, crew:crews(*), ${embed}` : '*, crew:crews(*)')
          .order('date', { ascending: true })
          .order('job_visit_id', { ascending: true });
        data = res.data;
        fetchError = res.error;
        if (!fetchError) break;
        console.warn('Some route details unavailable, trying fewer fields:', fetchError.message);
      }

      console.log('Jobs query result:', { data, error: fetchError });
      
      if (fetchError) throw fetchError;
      setJobs((data || []) as JobWithCrew[]);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    }
  }, [profile?.crew_id]);

  // Initial load
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    
    if (!isAuthenticated) {
      router.replace('/crew/login');
      return;
    }

    let cancelled = false;

    async function loadJobs() {
      setIsLoading(true);
      await fetchJobs();
      if (!cancelled) setIsLoading(false);
    }

    loadJobs();
    return () => { cancelled = true; };
  }, [authLoading, isAuthenticated, router, fetchJobs]);

  // The app can stay open on a phone for hours. When the crew comes back to it, look again, so a route the
  // office planned (stop numbers and minutes) or a Job another crew started shows up without pressing Refresh.
  useEffect(() => {
    if (!isAuthenticated) return;
    function onVisible() {
      if (document.visibilityState === 'visible') fetchJobs();
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchJobs, isAuthenticated]);

  // One card per Job (property visit), in the order the crew should work them. A Job's status
  // is worked out from its services, and the tabs below filter at the Job level.
  const visits = useMemo(() => groupByVisit(jobs), [jobs]);

  const filteredVisits = useMemo(() => {
    const today = todayLocalISO();
    const open = (status: string) => status !== 'completed' && status !== 'cancelled';
    switch (filter) {
      case 'all':
        return visits.filter((v) => v.status !== 'cancelled');
      case 'today':
        return visits.filter((v) => v.date === today && open(v.status));
      case 'upcoming':
        return visits.filter((v) => v.date > today && open(v.status));
      case 'completed':
        return visits.filter((v) => v.status === 'completed');
      default:
        return visits;
    }
  }, [visits, filter]);

  // Job counts for the badges
  const jobCounts = useMemo(() => {
    const today = todayLocalISO();
    const open = (status: string) => status !== 'completed' && status !== 'cancelled';
    return {
      all: visits.filter((v) => v.status !== 'cancelled').length,
      today: visits.filter((v) => v.date === today && open(v.status)).length,
      upcoming: visits.filter((v) => v.date > today && open(v.status)).length,
      completed: visits.filter((v) => v.status === 'completed').length,
      in_progress: visits.filter((v) => v.status === 'in_progress').length,
      scheduled: visits.filter((v) => v.status === 'scheduled').length,
    };
  }, [visits]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchJobs();
    setIsRefreshing(false);
  }, [fetchJobs]);

  const handleLogout = async () => {
    await logout();
    router.replace('/crew/login');
  };

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return null;
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-emerald-600 text-white px-4 pt-12 pb-6 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-emerald-200 text-sm sm:text-base">Welcome back,</p>
            <h1 className="text-xl sm:text-2xl font-bold">{crewInfo?.name || 'Crew'}</h1>
            {crewInfo?.truck_number && (
              <p className="text-emerald-200 text-xs mt-0.5">Truck #{crewInfo.truck_number}</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="p-2 bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors"
            aria-label="Logout"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-emerald-700/50 rounded-xl p-3 sm:p-4 text-center">
            <p className="text-2xl sm:text-3xl font-bold">{jobCounts.scheduled}</p>
            <p className="text-emerald-200 text-xs sm:text-sm">Scheduled</p>
          </div>
          <div className="bg-emerald-700/50 rounded-xl p-3 sm:p-4 text-center">
            <p className="text-2xl sm:text-3xl font-bold">{jobCounts.in_progress}</p>
            <p className="text-emerald-200 text-xs sm:text-sm">In Progress</p>
          </div>
          <div className="bg-emerald-700/50 rounded-xl p-3 sm:p-4 text-center">
            <p className="text-2xl sm:text-3xl font-bold">{jobCounts.completed}</p>
            <p className="text-emerald-200 text-xs sm:text-sm">Completed</p>
          </div>
        </div>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide sm:flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              {f.label}
              <span
                className={`ml-1.5 ${
                  filter === f.key ? 'text-emerald-200' : 'text-gray-400'
                }`}
              >
                ({jobCounts[f.key]})
              </span>
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="px-4 mb-3 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-600 transition-colors"
        >
          <svg
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 sm:mx-6 lg:mx-8 mb-4">
          <div className="max-w-4xl mx-auto bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        /* Jobs List */
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4 sm:space-y-0">
          {filteredVisits.length === 0 ? (
            <div className="sm:col-span-2 lg:col-span-3">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">No jobs found</p>
              <p className="text-gray-400 text-sm mt-1">
                {filter === 'today'
                  ? 'No jobs scheduled for today'
                  : filter === 'upcoming'
                  ? 'No upcoming jobs scheduled'
                  : 'No completed jobs yet'}
              </p>
            </div>
            </div>
          ) : (
            filteredVisits.map((group) => (
              <VisitCard key={group.visitId ?? group.jobs[0]?.id} group={group} />
            ))
          )}
          </div>
        </div>
      )}
    </div>
  );
}
