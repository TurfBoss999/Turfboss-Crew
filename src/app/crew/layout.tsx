'use client';

// ================================
// CREW LAYOUT
// Mobile-first layout for field crews
// Blue accent color scheme
// ================================

import { ReactNode } from 'react';
import { CrewAuthProvider } from '@/contexts/CrewAuthContext';

interface CrewLayoutProps {
  children: ReactNode;
}

export default function CrewLayout({ children }: CrewLayoutProps) {
  return (
    <CrewAuthProvider>
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    </CrewAuthProvider>
  );
}
