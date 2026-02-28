import { redirect } from 'next/navigation';

// ================================
// CREW INDEX - REDIRECT TO LOGIN
// ================================

export default function CrewIndexPage() {
  redirect('/crew/login');
}
