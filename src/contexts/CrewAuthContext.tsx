// 'use client';

// // ================================
// // TURFBOSS CREW CLIENT - AUTH CONTEXT
// // Real Supabase Authentication
// // ================================

// import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
// import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
// import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';
// import { Profile } from '@/types/database';

// const supabase = getSupabaseBrowserClient();

// // Profile cache to reduce database calls
// const profileCache = new Map<string, Profile>();

// interface CrewInfo {
//   id: string;
//   name: string;
//   phone: string | null;
//   truck_number: string | null;
// }

// interface CrewAuthState {
//   user: User | null;
//   session: Session | null;
//   profile: Profile | null;
//   crewInfo: CrewInfo | null;
//   isLoading: boolean;
//   isAuthenticated: boolean;
//   login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
//   logout: () => Promise<void>;
// }

// const CrewAuthContext = createContext<CrewAuthState | undefined>(undefined);

// interface CrewAuthProviderProps {
//   children: ReactNode;
// }

// export function CrewAuthProvider({ children }: CrewAuthProviderProps) {
//   const [user, setUser] = useState<User | null>(null);
//   const [session, setSession] = useState<Session | null>(null);
//   const [profile, setProfile] = useState<Profile | null>(null);
//   const [crewInfo, setCrewInfo] = useState<CrewInfo | null>(null);
//   const [isLoading, setIsLoading] = useState(true);

//   // Fetch profile and crew info
//   const fetchProfileAndCrew = useCallback(async (userId: string): Promise<{ profile: Profile | null; crew: CrewInfo | null }> => {
//     // Check cache first
//     const cachedProfile = profileCache.get(userId);
//     if (cachedProfile && cachedProfile.role === 'crew' && cachedProfile.crew_id) {
//       // Fetch crew info
//       const { data: crewData } = await supabase
//         .from('crews')
//         .select('id, name, phone, truck_number')
//         .eq('id', cachedProfile.crew_id)
//         .single();
      
//       return { profile: cachedProfile, crew: crewData };
//     }

//     // Fetch profile from database
//     const { data: profileData, error: profileError } = await supabase
//       .from('profiles')
//       .select('id, role, crew_id')
//       .eq('id', userId)
//       .single();

//     if (profileError || !profileData) {
//       console.error('Failed to fetch profile:', profileError);
//       return { profile: null, crew: null };
//     }

//     // Cache the profile
//     profileCache.set(userId, profileData as Profile);

//     // Fetch crew info if the user has a crew_id
//     let crewData: CrewInfo | null = null;
//     if (profileData.crew_id) {
//       const { data } = await supabase
//         .from('crews')
//         .select('id, name, phone, truck_number')
//         .eq('id', profileData.crew_id)
//         .single();
//       crewData = data;
//     }

//     return { profile: profileData as Profile, crew: crewData };
//   }, []);

//   // Initialize session on mount - use onAuthStateChange for all auth events
//   useEffect(() => {
//     let isMounted = true;
//     let hasInitialized = false;

//     // Process session (shared logic for all auth scenarios)
//     async function processSession(session: Session | null) {
//       if (!isMounted) return;

//       if (session?.user) {
//         setSession(session);
//         setUser(session.user);
        
//         try {
//           const { profile: userProfile, crew } = await fetchProfileAndCrew(session.user.id);
          
//           if (!isMounted) return;
          
//           // Only set if role is 'crew'
//           if (userProfile?.role === 'crew') {
//             setProfile(userProfile);
//             setCrewInfo(crew);
//           } else {
//             // Not a crew user, clear session
//             setSession(null);
//             setUser(null);
//             setProfile(null);
//             setCrewInfo(null);
//           }
//         } catch (error) {
//           console.error('Failed to fetch profile:', error);
//           setProfile(null);
//           setCrewInfo(null);
//         }
//       } else {
//         setSession(null);
//         setUser(null);
//         setProfile(null);
//         setCrewInfo(null);
//       }

//       // Mark loading as complete after first auth event
//       if (!hasInitialized && isMounted) {
//         hasInitialized = true;
//         setIsLoading(false);
//       }
//     }

//     // Listen for ALL auth state changes (including INITIAL_SESSION)
//     const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
//       await processSession(session);
//     });

//     // Also call getSession as a fallback in case onAuthStateChange is delayed
//     (async () => {
//       const { data: { session } } = await supabase.auth.getSession();
//       if (!hasInitialized) {
//         processSession(session);
//       }
//     })();

//     return () => {
//       isMounted = false;
//       subscription.unsubscribe();
//     };
//   }, [fetchProfileAndCrew]);

//   const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
//     try {
//       const { data, error } = await supabase.auth.signInWithPassword({
//         email,
//         password,
//       });

//       if (error) {
//         return { success: false, error: error.message };
//       }

//       if (!data.user) {
//         return { success: false, error: 'Login failed. Please try again.' };
//       }

//       // Fetch profile to verify role
//       const { profile: userProfile, crew } = await fetchProfileAndCrew(data.user.id);

//       if (!userProfile) {
//         await supabase.auth.signOut();
//         return { success: false, error: 'Profile not found. Please contact support.' };
//       }

//       if (userProfile.role !== 'crew') {
//         await supabase.auth.signOut();
//         return { success: false, error: 'This portal is for crew members only. Admins should use the admin dashboard.' };
//       }

//       setSession(data.session);
//       setUser(data.user);
//       setProfile(userProfile);
//       setCrewInfo(crew);

//       return { success: true };
//     } catch (error) {
//       console.error('Login error:', error);
//       return { success: false, error: 'An unexpected error occurred. Please try again.' };
//     }
//   };

//   const logout = async () => {
//     await supabase.auth.signOut();
//     setUser(null);
//     setSession(null);
//     setProfile(null);
//     setCrewInfo(null);
//     profileCache.clear();
//   };

//   const isAuthenticated = !!user && !!profile && profile.role === 'crew';

//   return (
//     <CrewAuthContext.Provider value={{ 
//       user, 
//       session, 
//       profile, 
//       crewInfo, 
//       isLoading, 
//       isAuthenticated, 
//       login, 
//       logout 
//     }}>
//       {children}
//     </CrewAuthContext.Provider>
//   );
// }

// export function useCrewAuth(): CrewAuthState {
//   const context = useContext(CrewAuthContext);
//   if (context === undefined) {
//     throw new Error('useCrewAuth must be used within a CrewAuthProvider');
//   }
//   return context;
// }

'use client';

// ================================
// TURFBOSS CREW CLIENT - AUTH CONTEXT
// Real Supabase Authentication
// ================================

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { Profile } from '@/types/database';

const supabase = getSupabaseBrowserClient();

// Profile cache to reduce database calls
const profileCache = new Map<string, Profile>();

interface CrewInfo {
  id: string;
  name: string;
  phone: string | null;
  truck_number: string | null;
}

interface CrewAuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  crewInfo: CrewInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const CrewAuthContext = createContext<CrewAuthState | undefined>(undefined);

interface CrewAuthProviderProps {
  children: ReactNode;
}

export function CrewAuthProvider({ children }: CrewAuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [crewInfo, setCrewInfo] = useState<CrewInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use ref to track initialization across async operations
  const hasInitializedRef = useRef(false);
  const isMountedRef = useRef(true);

  // Fetch profile and crew info
  const fetchProfileAndCrew = useCallback(async (userId: string): Promise<{ profile: Profile | null; crew: CrewInfo | null }> => {
    // Check cache first
    const cachedProfile = profileCache.get(userId);
    if (cachedProfile && cachedProfile.role === 'crew' && cachedProfile.crew_id) {
      // Fetch crew info
      const { data: crewData } = await supabase
        .from('crews')
        .select('id, name, phone, truck_number')
        .eq('id', cachedProfile.crew_id)
        .single();
      
      return { profile: cachedProfile, crew: crewData };
    }

    // Fetch profile from database
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, crew_id')
      .eq('id', userId)
      .single();

    if (profileError || !profileData) {
      console.error('[Auth] Failed to fetch profile:', profileError);
      return { profile: null, crew: null };
    }

    // Cache the profile
    profileCache.set(userId, profileData as Profile);

    // Fetch crew info if the user has a crew_id
    let crewData: CrewInfo | null = null;
    if (profileData.crew_id) {
      const { data } = await supabase
        .from('crews')
        .select('id, name, phone, truck_number')
        .eq('id', profileData.crew_id)
        .single();
      crewData = data;
    }

    return { profile: profileData as Profile, crew: crewData };
  }, []);

  // Initialize session on mount
  useEffect(() => {
    isMountedRef.current = true;
    hasInitializedRef.current = false;

    // Process session (shared logic for all auth scenarios)
    async function processSession(currentSession: Session | null, source: string) {
      if (!isMountedRef.current) return;
      
      console.log(`[Auth] Processing session from ${source}:`, currentSession?.user?.email || 'no user');

      if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        
        try {
          const { profile: userProfile, crew } = await fetchProfileAndCrew(currentSession.user.id);
          
          if (!isMountedRef.current) return;
          
          // Only set if role is 'crew'
          if (userProfile?.role === 'crew') {
            setProfile(userProfile);
            setCrewInfo(crew);
          } else {
            // Not a crew user, clear session
            console.log('[Auth] User is not a crew member, clearing session');
            setSession(null);
            setUser(null);
            setProfile(null);
            setCrewInfo(null);
          }
        } catch (error) {
          console.error('[Auth] Failed to fetch profile:', error);
          setProfile(null);
          setCrewInfo(null);
        }
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
        setCrewInfo(null);
      }

      // Mark loading as complete
      if (isMountedRef.current) {
        hasInitializedRef.current = true;
        setIsLoading(false);
      }
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, currentSession: Session | null) => {
      console.log('[Auth] onAuthStateChange event:', event);
      
      // Skip if we're processing initial session and this is INITIAL_SESSION event
      // to avoid double processing
      if (event === 'INITIAL_SESSION' && hasInitializedRef.current) {
        return;
      }
      
      await processSession(currentSession, `onAuthStateChange:${event}`);
    });

    // Immediately fetch session - this is the primary initialization
    // Don't wait for onAuthStateChange which can be unreliable on iOS PWA
    (async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[Auth] getSession error:', error);
        }
        
        // Only process if we haven't initialized yet
        if (!hasInitializedRef.current) {
          await processSession(currentSession, 'getSession');
        }
      } catch (error) {
        console.error('[Auth] getSession exception:', error);
        // Ensure loading is set to false even on error
        if (isMountedRef.current && !hasInitializedRef.current) {
          hasInitializedRef.current = true;
          setIsLoading(false);
        }
      }
    })();

    // Safety timeout - ensure loading state resolves even if everything fails
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current && !hasInitializedRef.current) {
        console.warn('[Auth] Initialization timeout - forcing loading to false');
        hasInitializedRef.current = true;
        setIsLoading(false);
      }
    }, 5000); // 5 second timeout

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [fetchProfileAndCrew]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Login failed. Please try again.' };
      }

      // Fetch profile to verify role
      const { profile: userProfile, crew } = await fetchProfileAndCrew(data.user.id);

      if (!userProfile) {
        await supabase.auth.signOut();
        return { success: false, error: 'Profile not found. Please contact support.' };
      }

      if (userProfile.role !== 'crew') {
        await supabase.auth.signOut();
        return { success: false, error: 'This portal is for crew members only. Admins should use the admin dashboard.' };
      }

      setSession(data.session);
      setUser(data.user);
      setProfile(userProfile);
      setCrewInfo(crew);

      return { success: true };
    } catch (error) {
      console.error('[Auth] Login error:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setCrewInfo(null);
    profileCache.clear();
  };

  const isAuthenticated = !!user && !!profile && profile.role === 'crew';

  return (
    <CrewAuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      crewInfo, 
      isLoading, 
      isAuthenticated, 
      login, 
      logout 
    }}>
      {children}
    </CrewAuthContext.Provider>
  );
}

export function useCrewAuth(): CrewAuthState {
  const context = useContext(CrewAuthContext);
  if (context === undefined) {
    throw new Error('useCrewAuth must be used within a CrewAuthProvider');
  }
  return context;
}