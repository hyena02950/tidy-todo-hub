
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VendorOnboarding } from "@/components/VendorOnboarding";
import { NewVendorRegistration } from "@/components/NewVendorRegistration";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { useUserRole } from "@/hooks/useUserRole";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getToken } from "@/utils/auth";

const VendorDashboard = () => {
  const { loading, isVendorUser, vendorId } = useUserRole();
  const { user } = useAuth();
  const [hasVendorProfile, setHasVendorProfile] = useState<boolean | null>(null);
  const [checkingVendor, setCheckingVendor] = useState(true);

  useEffect(() => {
    const checkVendorProfile = async () => {
      if (!user) {
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

        const response = await fetch('/api/vendors', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const hasVendor = data.vendors && data.vendors.length > 0;
          setHasVendorProfile(hasVendor);
        } else {
          setHasVendorProfile(false);
        }
      } catch (error) {
        console.error('Error checking vendor profile:', error);
        setHasVendorProfile(false);
      } finally {
        setCheckingVendor(false);
      }
    };

    checkVendorProfile();
  }, [user]);

  const handleVendorCreated = (newVendorId: string) => {
    console.log('Vendor created with ID:', newVendorId);
    setHasVendorProfile(true);
    // Reload the page to update user roles
    window.location.reload();
  };

  if (loading || checkingVendor) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Show access denied only if user has no vendor profile and is not a vendor user
  if (!isVendorUser && hasVendorProfile === false) {
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
                    Create your vendor profile to get started.
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

  // Show access denied if we can't determine vendor status
  if (!isVendorUser && hasVendorProfile === null) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground mt-2">You don't have permission to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  // Show vendor dashboard with tabs for vendor users OR users with vendor profiles
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
                  Manage your vendor profile, upload documents, and track your submissions.
                </p>
              </div>

              <Tabs defaultValue="onboarding" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="onboarding">Document Upload & Onboarding</TabsTrigger>
                  <TabsTrigger value="profile">Vendor Profile</TabsTrigger>
                </TabsList>

                <TabsContent value="onboarding" className="space-y-4">
                  <VendorOnboarding />
                </TabsContent>
                
                <TabsContent value="profile" className="space-y-4">
                  <div className="bg-card rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Vendor Profile Management</h2>
                    <p className="text-muted-foreground mb-4">
                      Your vendor profile information and settings will be displayed here.
                    </p>
                    {vendorId && (
                      <div className="bg-muted p-4 rounded-md">
                        <p className="text-sm">Vendor ID: {vendorId}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Profile management features coming soon.
                        </p>
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
