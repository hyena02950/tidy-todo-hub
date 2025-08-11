
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { VendorDashboardPage } from "@/pages/VendorDashboardPage";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, FileText, TrendingUp } from "lucide-react";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { isVendorUser, isElikaUser, loading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-4">
              Welcome to Elika Platform
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Streamline your recruitment process with our comprehensive vendor management system
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="text-center">
              <CardHeader>
                <Building2 className="h-8 w-8 mx-auto text-primary" />
                <CardTitle className="text-lg">Vendor Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Complete vendor onboarding and management system
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Users className="h-8 w-8 mx-auto text-primary" />
                <CardTitle className="text-lg">Candidate Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Track candidates through the entire recruitment lifecycle
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <FileText className="h-8 w-8 mx-auto text-primary" />
                <CardTitle className="text-lg">Document Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Secure document storage and approval workflows
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <TrendingUp className="h-8 w-8 mx-auto text-primary" />
                <CardTitle className="text-lg">Analytics & Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Comprehensive analytics and performance metrics
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <p className="text-muted-foreground mb-4">Please log in to access the platform</p>
          </div>
        </div>
      </div>
    );
  }

  // Route based on user role
  if (isVendorUser) {
    return <VendorDashboardPage />;
  }

  if (isElikaUser) {
    return <AdminDashboard />;
  }

  // Fallback for users without proper roles
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Pending</h1>
        <p className="text-muted-foreground">
          Your account is being set up. Please contact your administrator for access.
        </p>
      </div>
    </div>
  );
};

export default Index;
