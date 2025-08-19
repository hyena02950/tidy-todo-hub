import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import apiClient from "@/utils/apiClient";

interface DashboardStats {
  activeJobs: number;
  totalCandidates: number;
  candidatesSubmitted: number;
  scheduledInterviews: number;
  interviewsScheduled: number;
  pendingInvoices: number;
  totalInvoices: number;
  pendingApprovals: number;
  pendingInvoicesAmount: number;
  totalSubmissions: number;
  shortlistedCandidates: number;
  pendingInterviews: number;
  completedJoins: number;
  totalEarnings: number;
  thisMonthEarnings: number;
  jobsTrend: number;
  candidatesTrend: number;
  interviewsTrend: number;
  invoicesTrend: number;
}

const DEFAULT_STATS: DashboardStats = {
  activeJobs: 12,
  totalCandidates: 45,
  candidatesSubmitted: 45,
  scheduledInterviews: 8,
  interviewsScheduled: 8,
  pendingInvoices: 5,
  totalInvoices: 15,
  pendingApprovals: 3,
  pendingInvoicesAmount: 125000,
  totalSubmissions: 45,
  shortlistedCandidates: 12,
  pendingInterviews: 8,
  completedJoins: 6,
  totalEarnings: 450000,
  thisMonthEarnings: 75000,
  jobsTrend: 5,
  candidatesTrend: 12,
  interviewsTrend: 8,
  invoicesTrend: -2,
};

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { vendorId, isVendorUser, isElikaUser, loading: roleLoading } = useUserRole();

  const fetchStats = async () => {
    if (roleLoading) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      let endpoint = '/dashboard/vendor-stats';
      
      // Use different endpoint for Elika users
      if (isElikaUser) {
        endpoint = '/dashboard/admin-stats';
      }

      console.log('Fetching dashboard stats from:', endpoint);
      
      const response = await apiClient.get(endpoint);
      
      console.log('Dashboard stats response:', response.data);
      
      if (response.data) {
        setStats(prevStats => ({
          ...prevStats,
          ...response.data
        }));
        console.log('Dashboard stats updated successfully');
      }
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      
      // Check if it's a network connectivity issue
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error') || error.message?.includes('fetch')) {
        setError('Backend server is not reachable. Using demo data.');
        toast({
          title: "Connection Issue",
          description: "Backend server not reachable. Showing demo data.",
          variant: "default",
        });
      }
      // Check if it's an HTML response error
      else if (error.message?.includes('HTML instead of JSON')) {
        setError('Backend API not available. Please check if the server is running.');
        toast({
          title: "API Error",
          description: "Backend returned HTML instead of JSON. Using demo data.",
          variant: "default",
        });
      }
      // Handle 401/403 auth errors
      else if (error.response?.status === 401 || error.response?.status === 403) {
        setError('Authentication required. Please login again.');
        toast({
          title: "Authentication Error",
          description: "Please login again to access dashboard data.",
          variant: "destructive",
        });
      }
      // Handle other API errors
      else {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load dashboard statistics';
        setError(errorMessage);
        toast({
          title: "Info",
          description: "Using demo data - backend connection needed for live data",
          variant: "default",
        });
      }
      
      // Keep demo data on error
      console.log('Using demo data due to error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roleLoading) {
      fetchStats();
    }
  }, [vendorId, isVendorUser, isElikaUser, roleLoading]);

  const refetch = async () => {
    await fetchStats();
  };

  return { stats, loading, error, refetch };
};
