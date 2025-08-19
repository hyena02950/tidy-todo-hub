
import { useState, useEffect } from "react";
import { useUserRole } from "./useUserRole";
import { getToken } from "@/utils/auth";

export interface UserProfile {
  id: string;
  _id?: string;
  company_name?: string | null;
  contact_person?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  created_at?: string;
  updated_at?: string;
  full_name?: string;
  name?: string;
  user_roles?: Array<{
    role: string;
    vendorId?: string;
  }>;
  roles?: Array<{
    role: string;
    vendorId?: string;
  }>;
}

export const useUserProfiles = () => {
  const { isElikaAdmin } = useUserRole();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = async () => {
    if (!isElikaAdmin) {
      console.log('Not an Elika admin, skipping profile fetch');
      setProfiles([]);
      setLoading(false);
      return;
    }

    try {
      console.log("Fetching user profiles...");
      setError(null);
      
      const token = getToken();
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://13.235.100.18:3001';
      const response = await fetch(`${API_BASE_URL}/api/users/profiles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch profiles' }));
        throw new Error(errorData.message || 'Failed to fetch profiles');
      }

      const data = await response.json();
      console.log('Raw user profiles response:', data);
      
      // Normalize the profiles data structure
      const normalizedProfiles = (data.profiles || []).map((profile: any) => {
        // Handle both _id and id fields
        const userId = profile._id || profile.id;
        
        // Normalize the name field from various sources
        const displayName = profile.full_name || 
                           profile.name || 
                           profile.contact_person || 
                           profile.email?.split('@')[0] || 
                           'Unknown User';

        // Normalize roles from both user_roles and roles fields
        const userRoles = profile.user_roles || profile.roles || [];
        
        return {
          id: userId,
          _id: userId,
          email: profile.email,
          full_name: displayName,
          name: displayName,
          contact_person: profile.contact_person,
          company_name: profile.company_name,
          phone: profile.phone,
          address: profile.address,
          created_at: profile.created_at || profile.createdAt,
          updated_at: profile.updated_at || profile.updatedAt,
          user_roles: userRoles,
          roles: userRoles
        } as UserProfile;
      });
      
      console.log('Normalized user profiles:', normalizedProfiles);
      setProfiles(normalizedProfiles);
    } catch (err) {
      console.error('Error fetching profiles:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();

    if (isElikaAdmin) {
      // Set up polling for profile changes every 30 seconds
      const interval = setInterval(fetchProfiles, 30000);
      return () => clearInterval(interval);
    }
  }, [isElikaAdmin]);

  const refetch = () => {
    setLoading(true);
    fetchProfiles();
  };

  return {
    profiles,
    loading,
    error,
    refetch
  };
};
