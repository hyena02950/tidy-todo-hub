
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VendorOnboarding } from "@/components/VendorOnboarding";
import { NewVendorRegistration } from "@/components/NewVendorRegistration";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { useUserRole } from "@/hooks/useUserRole";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getToken } from "@/utils/auth";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, XCircle, FileText } from "lucide-react";

const VendorDashboard = () => {
  const { loading: roleLoading, isVendorUser, vendorId } = useUserRole();
  const { user } = useAuth();
  const [hasVendorProfile, setHasVendorProfile] = useState<boolean | null>(null);
  const [checkingVendor, setCheckingVendor] = useState(true);
  const [vendorData, setVendorData] = useState<any>(null);
  const [applicationProgress, setApplicationProgress] = useState<any>(null);

  useEffect(() => {
    const checkVendorProfile = async () => {
      if (!user) {
        setHasVendorProfile(false);
        setCheckingVendor(false);
        return;
      }

      try {
        const token = getToken();
        if (!token) {
          setHasVendorProfile(false);
          setCheckingVendor(false);
          return;
        }

        // If user has vendor roles and vendorId, they have a vendor profile
        if (isVendorUser && vendorId) {
          const response = await fetch(`/api/vendors/${vendorId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setVendorData(data.data || data);
            setHasVendorProfile(true);
            
            // Fetch application progress
            await fetchApplicationProgress();
          } else {
            setHasVendorProfile(false);
          }
        } else {
          // No vendor role or vendorId means no vendor profile
          setHasVendorProfile(false);
        }
      } catch (error) {
        console.error('Error checking vendor profile:', error);
        setHasVendorProfile(false);
      } finally {
        setCheckingVendor(false);
      }
    };

    if (!roleLoading) {
      checkVendorProfile();
    }
  }, [user, isVendorUser, vendorId, roleLoading]);

  const fetchApplicationProgress = async () => {
    if (!vendorId) return;

    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`/api/vendors/${vendorId}/application`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setApplicationProgress(data.application);
      }
    } catch (error) {
      console.error('Error fetching application progress:', error);
    }
  };

  const handleVendorCreated = (newVendorId: string) => {
    console.log('Vendor created with ID:', newVendorId);
    setHasVendorProfile(true);
    // Reload the page to update user roles
    window.location.reload();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
      case 'under_review':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  if (roleLoading || checkingVendor) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Show vendor registration for users without vendor profiles
  if (hasVendorProfile === false) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 p-6">
            <div className="container mx-auto">
              <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold">Vendor Registration</h1>
                  <p className="text-muted-foreground mt-2">
                    Create your vendor profile to get started with the platform.
                  </p>
                </div>
                <NewVendorRegistration onVendorCreated={handleVendorCreated} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show vendor dashboard with tabs for users with vendor profiles
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 p-6">
          <div className="container mx-auto">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-bold">Vendor Dashboard</h1>
                <p className="text-muted-foreground mt-2">
                  Manage your vendor profile, upload documents, and track your application progress.
                </p>
              </div>

              {/* Application Progress Summary */}
              {vendorData && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      {getStatusIcon(vendorData.status)}
                      <span>Application Status</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {vendorData.status === 'active' ? '100' : '0'}%
                        </div>
                        <div className="text-sm text-muted-foreground">Complete</div>
                      </div>
                      <div className="text-center">
                        <Badge variant={vendorData.status === 'active' ? 'default' : 'secondary'}>
                          {vendorData.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <div className="text-sm text-muted-foreground mt-1">Vendor Status</div>
                      </div>
                      <div className="text-center">
                        {applicationProgress && (
                          <>
                            <Badge variant="outline">
                              {applicationProgress.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <div className="text-sm text-muted-foreground mt-1">Application Status</div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {vendorData.status !== 'active' && (
                      <div className="mt-4">
                        <Progress value={applicationProgress?.status === 'approved' ? 100 : 50} className="w-full" />
                        <p className="text-sm text-muted-foreground mt-2">
                          {vendorData.status === 'pending' 
                            ? 'Complete document upload and application submission to activate your account.'
                            : 'Your application is being processed.'}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Tabs defaultValue="documents" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="documents">Document Upload & Progress</TabsTrigger>
                  <TabsTrigger value="profile">Vendor Profile</TabsTrigger>
                </TabsList>

                <TabsContent value="documents" className="space-y-4">
                  <VendorOnboarding />
                </TabsContent>
                
                <TabsContent value="profile" className="space-y-4">
                  <div className="bg-card rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Vendor Profile Management</h2>
                    
                    {vendorData ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Company Name</label>
                            <p className="text-lg">{vendorData.name}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Email</label>
                            <p className="text-lg">{vendorData.email}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Contact Person</label>
                            <p className="text-lg">{vendorData.contactPerson}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Phone</label>
                            <p className="text-lg">{vendorData.phone || 'Not provided'}</p>
                          </div>
                        </div>
                        
                        {vendorData.address && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Address</label>
                            <p className="text-lg">{vendorData.address}</p>
                          </div>
                        )}

                        <div className="bg-muted p-4 rounded-md">
                          <p className="text-sm">Vendor ID: {vendorId}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Created: {new Date(vendorData.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-muted p-4 rounded-md">
                        <p className="text-sm">Loading vendor profile...</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;
