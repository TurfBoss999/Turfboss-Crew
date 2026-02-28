'use client';

// ================================
// ISSUE MODAL COMPONENT
// Snow Removal Issue Reporting
// ================================

import { useState } from 'react';
import { IssueType } from '@/types/database';

interface IssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (issueType: IssueType, description: string) => void;
  jobAddress: string;
}

const issueTypes: { value: IssueType; label: string; icon: string }[] = [
  { value: 'equipment_failure', label: 'Equipment Failure', icon: '🔧' },
  { value: 'access_blocked', label: 'Access Blocked', icon: '🚧' },
  { value: 'safety_hazard', label: 'Safety Hazard', icon: '⚠️' },
  { value: 'weather_delay', label: 'Weather Delay', icon: '🌨️' },
  { value: 'client_not_available', label: 'Client Not Available', icon: '🏠' },
  { value: 'other', label: 'Other', icon: '📝' },
];

export function IssueModal({ isOpen, onClose, onSubmit, jobAddress }: IssueModalProps) {
  const [selectedType, setSelectedType] = useState<IssueType>('other');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!description.trim()) return;
    
    setIsSubmitting(true);
    await onSubmit(selectedType, description);
    setDescription('');
    setSelectedType('other');
    setIsSubmitting(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Report Issue</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Job reference */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Reporting issue for:</p>
            <p className="font-medium text-gray-900 text-sm">{jobAddress}</p>
          </div>

          {/* Issue type selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {issueTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`p-3 sm:p-4 rounded-lg border-2 text-left transition-all ${
                    selectedType === type.value
                      ? 'border-emerald-600 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg sm:text-xl mb-1 block">{type.icon}</span>
                  <span className="text-sm font-medium text-gray-900">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none text-gray-900 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 px-4 rounded-xl font-semibold text-gray-700 bg-gray-200 active:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!description.trim() || isSubmitting}
              className={`flex-1 py-3.5 px-4 rounded-xl font-semibold transition-colors ${
                description.trim() && !isSubmitting
                  ? 'bg-red-500 text-white active:bg-red-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Submit Report'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
