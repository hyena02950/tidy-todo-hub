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

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
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
  });
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

      const response = await apiClient.get(endpoint);
      
      if (response.data) {
        setStats(prevStats => ({
          ...prevStats,
          ...response.data
        }));
      }
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      
      // Check if it's an HTML response error
      if (error.message?.includes('HTML instead of JSON')) {
        setError('Backend API not available. Please check if the server is running.');
        toast({
          title: "Connection Error",
          description: "Cannot connect to backend. Using demo data.",
          variant: "default",
        });
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load dashboard statistics';
        setError(errorMessage);
        toast({
          title: "Info",
          description: "Showing demo data - backend connection needed for live data",
          variant: "default",
        });
      }
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
