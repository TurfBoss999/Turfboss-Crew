'use client';

// ================================
// JOB DETAIL PAGE
// Real Supabase Database
// ================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCrewAuth } from '@/contexts/CrewAuthContext';
import { StatusBadge, BottomActionBar, IssueModal, ImageUploadPreview } from '@/components';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { Job, JobStatus, IssueType } from '@/types/database';

const supabase = getSupabaseBrowserClient();

// Issue type labels for display
const issueTypeLabels: Record<IssueType, string> = {
  equipment_failure: 'Equipment Failure',
  access_blocked: 'Access Blocked',
  safety_hazard: 'Safety Hazard',
  weather_delay: 'Weather Delay',
  client_not_available: 'Client Not Available',
  other: 'Other',
};

// Format time for display
function formatTime(time: string | null): string | null {
  if (!time) return null;
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { profile, isAuthenticated, isLoading: authLoading } = useCrewAuth();
  
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);

  const jobId = params?.id as string;

  // Fetch job from database
  const fetchJob = useCallback(async () => {
    if (!jobId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (fetchError) throw fetchError;
      setJob(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch job:', err);
      setError(err instanceof Error ? err.message : 'Failed to load job');
    }
  }, [jobId]);

  // Initial load
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    
    if (!isAuthenticated) {
      router.replace('/crew/login');
      return;
    }

    let cancelled = false;

    async function loadJob() {
      setIsLoading(true);
      await fetchJob();
      if (!cancelled) setIsLoading(false);
    }

    loadJob();
    return () => { cancelled = true; };
  }, [authLoading, isAuthenticated, router, fetchJob]);

  // Show success message temporarily
  const showSuccessMessage = (message: string) => {
    setShowSuccess(message);
    setTimeout(() => setShowSuccess(null), 2500);
  };

  // Update job status
  const handleStatusUpdate = async (newStatus: JobStatus) => {
    if (!job) return;
    
    setIsUpdating(true);
    
    try {
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      if (updateError) throw updateError;
      
      // Update local state optimistically
      setJob(prev => prev ? { ...prev, status: newStatus } : null);
      
      const messages: Record<JobStatus, string> = {
        scheduled: 'Job reset to scheduled',
        in_progress: 'Job started!',
        completed: 'Job completed!',
        cancelled: 'Job cancelled',
      };
      
      showSuccessMessage(messages[newStatus]);

      // If completing, show photo upload prompt
      if (newStatus === 'completed') {
        setShowPhotoUpload(true);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle issue submission
  const handleIssueSubmit = async (issueType: IssueType, description: string) => {
    if (!job) return;
    
    try {
      const timestamp = new Date().toLocaleString();
      const issueLabel = issueTypeLabels[issueType];
      const issueNote = `\n[ISSUE - ${timestamp}]\nType: ${issueLabel}\n${description}`;
      
      const newNotes = job.notes ? job.notes + issueNote : issueNote;
      
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ 
          notes: newNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      if (updateError) throw updateError;
      
      // Update local state
      setJob(prev => prev ? { ...prev, notes: newNotes } : null);
      setIsIssueModalOpen(false);
      showSuccessMessage('Issue reported successfully');
    } catch (err) {
      console.error('Failed to report issue:', err);
      setError(err instanceof Error ? err.message : 'Failed to report issue');
    }
  };

  // Handle photo upload
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handlePhotoUpload = async (file: File, _previewUrl: string) => {
    if (!job) return;
    
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${job.id}/completion_${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('job-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('job-images')
        .getPublicUrl(fileName);

      // Update job with photo URL
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ 
          completion_photo_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      if (updateError) throw updateError;
      
      // Update local state
      setJob(prev => prev ? { ...prev, completion_photo_url: publicUrl } : null);
      showSuccessMessage('Photo uploaded successfully');
    } catch (err) {
      console.error('Failed to upload photo:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
    }
  };

  // Build action buttons based on current status
  const getActionButtons = () => {
    if (!job) return [];

    const buttons = [];

    if (job.status === 'scheduled') {
      buttons.push({
        label: 'Start Job',
        onClick: () => handleStatusUpdate('in_progress'),
        variant: 'primary' as const,
        disabled: isUpdating,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      });
    }

    if (job.status === 'in_progress') {
      buttons.push({
        label: 'Complete',
        onClick: () => handleStatusUpdate('completed'),
        variant: 'primary' as const,
        disabled: isUpdating,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      });
    }

    if (job.status !== 'completed' && job.status !== 'cancelled') {
      buttons.push({
        label: 'Report Issue',
        onClick: () => setIsIssueModalOpen(true),
        variant: 'warning' as const,
        disabled: isUpdating,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
      });
    }

    return buttons;
  };

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return null;
  }

  if (error || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">{error || 'Job not found'}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-emerald-600 font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 left-4 right-4 z-50 animate-in slide-in-from-top">
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 max-w-md mx-auto">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {showSuccess}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-gray-900 truncate sm:text-lg">{job.service_type}</h1>
            <p className="text-sm text-gray-500 truncate sm:text-base">{job.address}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Status Badge */}
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={job.status} />
        </div>

        {/* Address & Navigation Card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4">
            <h2 className="font-semibold text-gray-900 mb-1">{job.service_type}</h2>
            <p className="text-gray-600 text-sm">{job.address}</p>
          </div>

          {/* Google Maps Embed */}
          <div className="h-48 sm:h-64 lg:h-80 relative">
            {job.lat && job.lng ? (
              <iframe
                src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}&q=${job.lat},${job.lng}&zoom=16`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Job Location Map"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-gray-400 text-sm">No location available</p>
                </div>
              </div>
            )}
            {/* Navigate Button */}
            {job.lat && job.lng && (
              <a
                href={`https://maps.google.com/maps?daddr=${job.lat},${job.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-3 right-3 bg-white px-4 py-2.5 rounded-lg shadow-md text-sm font-medium text-emerald-600 flex items-center gap-2 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Navigate
              </a>
            )}
          </div>
        </div>

        {/* Schedule Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Schedule
          </h3>
          <div className="space-y-2 text-sm">
            <p className="text-gray-700">
              <span className="text-gray-500">Date:</span> {formatDate(job.date)}
            </p>
            {(job.time_window_start || job.time_window_end) && (
              <p className="text-gray-700">
                <span className="text-gray-500">Time Window:</span>{' '}
                {formatTime(job.time_window_start)} - {formatTime(job.time_window_end)}
              </p>
            )}
            {job.est_duration_min && (
              <p className="text-gray-700">
                <span className="text-gray-500">Est. Duration:</span> {job.est_duration_min} minutes
              </p>
            )}
          </div>
        </div>

        {/* Notes from Admin */}
        {job.notes && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Notes
            </h3>
            <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
              {job.notes}
            </div>
          </div>
        )}

        {/* GPS Coordinates */}
        {job.lat && job.lng && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              GPS Coordinates
            </h3>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-gray-500">Lat:</span>{' '}
                <span className="text-gray-900 font-mono">{job.lat.toFixed(6)}</span>
              </div>
              <div>
                <span className="text-gray-500">Lng:</span>{' '}
                <span className="text-gray-900 font-mono">{job.lng.toFixed(6)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Job Images (from admin) */}
        {job.image_urls && job.image_urls.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Site Images
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {job.image_urls.map((url, idx) => (
                <img 
                  key={idx} 
                  src={url} 
                  alt={`Site image ${idx + 1}`} 
                  className="aspect-video object-cover rounded-lg bg-gray-200"
                />
              ))}
            </div>
          </div>
        )}

        {/* Photo Upload Section */}
        {(showPhotoUpload || job.status === 'completed') && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Completion Photo
            </h3>
            
            {job.completion_photo_url ? (
              <div className="space-y-3">
                <img 
                  src={job.completion_photo_url} 
                  alt="Completion photo" 
                  className="w-full aspect-video object-cover rounded-lg"
                />
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Photo uploaded
                </p>
              </div>
            ) : (
              <ImageUploadPreview onUpload={handlePhotoUpload} maxFiles={1} />
            )}
          </div>
        )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      {job.status !== 'completed' && job.status !== 'cancelled' && (
        <BottomActionBar actions={getActionButtons()} />
      )}

      {/* Completed State */}
      {job.status === 'completed' && (
        <div className="fixed bottom-0 left-0 right-0 bg-green-50 border-t border-green-200 p-4 pb-safe">
          <div className="max-w-lg mx-auto text-center">
            <div className="flex items-center justify-center gap-2 text-green-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Job Completed</span>
            </div>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      <IssueModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onSubmit={handleIssueSubmit}
        jobAddress={job.address}
      />
    </div>
  );
}
