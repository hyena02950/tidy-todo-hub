import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { useNavigate } from 'react-router-dom';
import { BackendConnectionTest } from "@/components/BackendConnectionTest";

const Index = () => {
  const { user, loading } = useAuth();
  const { isElikaAdmin, isVendorUser, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user === null) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!roleLoading && isElikaAdmin) {
      navigate('/dashboard');
    } else if (!roleLoading && isVendorUser) {
      navigate('/vendor-dashboard');
    }
  }, [isElikaAdmin, isVendorUser, roleLoading, navigate]);

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto py-8 px-4 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold tracking-tight mb-4">
                  Welcome to Vendor Portal
                </h1>
                <p className="text-xl text-muted-foreground mb-8">
                  Streamline your recruitment process with our comprehensive vendor management platform
                </p>
              </div>

              {/* Backend Connection Test - Remove this after testing */}
              <div className="mb-8">
                <BackendConnectionTest />
              </div>

              <div className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 rounded-lg border shadow-sm">
                    <h2 className="text-2xl font-semibold tracking-tight">
                      Getting Started
                    </h2>
                    <p className="text-muted-foreground mt-2">
                      Explore the platform and start managing your recruitment
                      process.
                    </p>
                    <ul className="list-disc pl-5 mt-4">
                      <li>
                        <a
                          href="/jobs"
                          className="text-primary hover:underline"
                        >
                          Browse Job Descriptions
                        </a>
                      </li>
                      <li>
                        <a
                          href="/candidates"
                          className="text-primary hover:underline"
                        >
                          Manage Candidates
                        </a>
                      </li>
                      <li>
                        <a
                          href="/interviews"
                          className="text-primary hover:underline"
                        >
                          Schedule Interviews
                        </a>
                      </li>
                    </ul>
                  </div>

                  <div className="p-6 rounded-lg border shadow-sm">
                    <h2 className="text-2xl font-semibold tracking-tight">
                      Account Management
                    </h2>
                    <p className="text-muted-foreground mt-2">
                      Manage your profile and settings.
                    </p>
                    <ul className="list-disc pl-5 mt-4">
                      <li>
                        <a
                          href="/profile"
                          className="text-primary hover:underline"
                        >
                          Edit Profile
                        </a>
                      </li>
                      <li>
                        <a
                          href="/settings"
                          className="text-primary hover:underline"
                        >
                          Account Settings
                        </a>
                      </li>
                      <li>
                        <a
                          href="/logout"
                          className="text-primary hover:underline"
                        >
                          Logout
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="p-6 rounded-lg border shadow-sm">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Quick Links
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    Access important resources and information.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <a
                      href="/documentation"
                      className="inline-flex items-center justify-center px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-colors"
                    >
                      Documentation
                    </a>
                    <a
                      href="/support"
                      className="inline-flex items-center justify-center px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-colors"
                    >
                      Support
                    </a>
                    <a
                      href="/faq"
                      className="inline-flex items-center justify-center px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-colors"
                    >
                      FAQ
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
