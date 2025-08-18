import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUserRole, AppRole } from "@/hooks/useUserRole";
import { Info, Save, RefreshCw } from "lucide-react";

type PermissionType = 'read' | 'create' | 'update' | 'delete' | 'view' | 'approve' | 'reject';
type ResourceType = 'candidates' | 'jobs' | 'invoices' | 'documents' | 'vendors' | 'users' | 'roles' | 'analytics';

interface RolePermission {
  role: AppRole;
  resource: ResourceType;
  permission: PermissionType;
}

// Enhanced permissions matrix with full elika_admin access including ALL analytics permissions
const defaultPermissions: RolePermission[] = [
  // Elika Admin - FULL ACCESS TO EVERYTHING INCLUDING ALL ANALYTICS
  { role: 'elika_admin', resource: 'candidates', permission: 'read' },
  { role: 'elika_admin', resource: 'candidates', permission: 'create' },
  { role: 'elika_admin', resource: 'candidates', permission: 'update' },
  { role: 'elika_admin', resource: 'candidates', permission: 'delete' },
  { role: 'elika_admin', resource: 'candidates', permission: 'approve' },
  { role: 'elika_admin', resource: 'candidates', permission: 'reject' },
  
  { role: 'elika_admin', resource: 'jobs', permission: 'read' },
  { role: 'elika_admin', resource: 'jobs', permission: 'create' },
  { role: 'elika_admin', resource: 'jobs', permission: 'update' },
  { role: 'elika_admin', resource: 'jobs', permission: 'delete' },
  { role: 'elika_admin', resource: 'jobs', permission: 'approve' },
  { role: 'elika_admin', resource: 'jobs', permission: 'reject' },
  
  { role: 'elika_admin', resource: 'invoices', permission: 'read' },
  { role: 'elika_admin', resource: 'invoices', permission: 'create' },
  { role: 'elika_admin', resource: 'invoices', permission: 'update' },
  { role: 'elika_admin', resource: 'invoices', permission: 'delete' },
  { role: 'elika_admin', resource: 'invoices', permission: 'approve' },
  { role: 'elika_admin', resource: 'invoices', permission: 'reject' },
  
  { role: 'elika_admin', resource: 'documents', permission: 'read' },
  { role: 'elika_admin', resource: 'documents', permission: 'create' },
  { role: 'elika_admin', resource: 'documents', permission: 'update' },
  { role: 'elika_admin', resource: 'documents', permission: 'delete' },
  { role: 'elika_admin', resource: 'documents', permission: 'approve' },
  { role: 'elika_admin', resource: 'documents', permission: 'reject' },
  
  { role: 'elika_admin', resource: 'vendors', permission: 'read' },
  { role: 'elika_admin', resource: 'vendors', permission: 'create' },
  { role: 'elika_admin', resource: 'vendors', permission: 'update' },
  { role: 'elika_admin', resource: 'vendors', permission: 'delete' },
  { role: 'elika_admin', resource: 'vendors', permission: 'approve' },
  { role: 'elika_admin', resource: 'vendors', permission: 'reject' },
  
  { role: 'elika_admin', resource: 'users', permission: 'read' },
  { role: 'elika_admin', resource: 'users', permission: 'create' },
  { role: 'elika_admin', resource: 'users', permission: 'update' },
  { role: 'elika_admin', resource: 'users', permission: 'delete' },
  { role: 'elika_admin', resource: 'users', permission: 'approve' },
  { role: 'elika_admin', resource: 'users', permission: 'reject' },
  
  { role: 'elika_admin', resource: 'roles', permission: 'read' },
  { role: 'elika_admin', resource: 'roles', permission: 'create' },
  { role: 'elika_admin', resource: 'roles', permission: 'update' },
  { role: 'elika_admin', resource: 'roles', permission: 'delete' },
  { role: 'elika_admin', resource: 'roles', permission: 'approve' },
  { role: 'elika_admin', resource: 'roles', permission: 'reject' },
  
  // ALL ANALYTICS PERMISSIONS FOR ELIKA ADMIN
  { role: 'elika_admin', resource: 'analytics', permission: 'read' },
  { role: 'elika_admin', resource: 'analytics', permission: 'create' },
  { role: 'elika_admin', resource: 'analytics', permission: 'update' },
  { role: 'elika_admin', resource: 'analytics', permission: 'delete' },
  { role: 'elika_admin', resource: 'analytics', permission: 'view' },
  { role: 'elika_admin', resource: 'analytics', permission: 'approve' },
  { role: 'elika_admin', resource: 'analytics', permission: 'reject' },
  
  // Vendor Admin - Limited access to their vendor data
  { role: 'vendor_admin', resource: 'candidates', permission: 'read' },
  { role: 'vendor_admin', resource: 'candidates', permission: 'create' },
  { role: 'vendor_admin', resource: 'candidates', permission: 'update' },
  { role: 'vendor_admin', resource: 'jobs', permission: 'read' },
  { role: 'vendor_admin', resource: 'invoices', permission: 'read' },
  { role: 'vendor_admin', resource: 'invoices', permission: 'create' },
  { role: 'vendor_admin', resource: 'documents', permission: 'read' },
  { role: 'vendor_admin', resource: 'documents', permission: 'create' },
  
  // Vendor Recruiter - Basic access
  { role: 'vendor_recruiter', resource: 'candidates', permission: 'read' },
  { role: 'vendor_recruiter', resource: 'candidates', permission: 'create' },
  { role: 'vendor_recruiter', resource: 'jobs', permission: 'read' },
  
  // Delivery Head - Management access
  { role: 'delivery_head', resource: 'candidates', permission: 'read' },
  { role: 'delivery_head', resource: 'candidates', permission: 'approve' },
  { role: 'delivery_head', resource: 'candidates', permission: 'reject' },
  { role: 'delivery_head', resource: 'jobs', permission: 'read' },
  { role: 'delivery_head', resource: 'jobs', permission: 'create' },
  { role: 'delivery_head', resource: 'jobs', permission: 'update' },
  { role: 'delivery_head', resource: 'vendors', permission: 'read' },
  { role: 'delivery_head', resource: 'analytics', permission: 'read' },
  
  // Finance Team - Financial access
  { role: 'finance_team', resource: 'invoices', permission: 'read' },
  { role: 'finance_team', resource: 'invoices', permission: 'approve' },
  { role: 'finance_team', resource: 'invoices', permission: 'reject' },
  { role: 'finance_team', resource: 'vendors', permission: 'read' },
  { role: 'finance_team', resource: 'analytics', permission: 'read' },
];

export const RolePermissionMatrix = () => {
  const { isElikaAdmin } = useUserRole();
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<RolePermission[]>(defaultPermissions);
  const [isSaving, setIsSaving] = useState(false);

  const roles: AppRole[] = ['elika_admin', 'vendor_admin', 'vendor_recruiter', 'delivery_head', 'finance_team'];
  const resources: ResourceType[] = ['candidates', 'jobs', 'invoices', 'documents', 'vendors', 'users', 'roles', 'analytics'];
  const permissionTypes: PermissionType[] = ['read', 'create', 'update', 'delete', 'approve', 'reject', 'view'];

  const hasPermission = (role: AppRole, resource: ResourceType, permission: PermissionType): boolean => {
    return permissions.some(p => p.role === role && p.resource === resource && p.permission === permission);
  };

  const togglePermission = (role: AppRole, resource: ResourceType, permission: PermissionType) => {
    const hasCurrentPermission = hasPermission(role, resource, permission);
    
    if (hasCurrentPermission) {
      // Remove permission
      setPermissions(prev => prev.filter(p => 
        !(p.role === role && p.resource === resource && p.permission === permission)
      ));
    } else {
      // Add permission
      setPermissions(prev => [...prev, { role, resource, permission }]);
    }
  };

  const savePermissions = async () => {
    setIsSaving(true);
    try {
      // Simulate API call to save permissions
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Permissions Saved",
        description: "Role permissions have been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save permissions",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setPermissions(defaultPermissions);
    toast({
      title: "Permissions Reset",
      description: "Permissions have been reset to default values",
    });
  };

  const getRoleLabel = (role: AppRole) => {
    const labels: Record<AppRole, string> = {
      elika_admin: 'Elika Admin',
      vendor_admin: 'Vendor Admin',
      vendor_recruiter: 'Vendor Recruiter',
      delivery_head: 'Delivery Head',
      finance_team: 'Finance Team',
    };
    return labels[role] || role;
  };

  const getResourceLabel = (resource: ResourceType) => {
    const labels: Record<ResourceType, string> = {
      candidates: 'Candidates',
      jobs: 'Jobs',
      invoices: 'Invoices',
      documents: 'Documents',
      vendors: 'Vendors',
      users: 'Users',
      roles: 'Roles',
      analytics: 'Analytics',
    };
    return labels[resource] || resource;
  };

  const getPermissionLabel = (permission: PermissionType) => {
    const labels: Record<PermissionType, string> = {
      read: 'Read',
      create: 'Create',
      update: 'Update',
      delete: 'Delete',
      view: 'View',
      approve: 'Approve',
      reject: 'Reject',
    };
    return labels[permission] || permission;
  };

  if (!isElikaAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            You need Elika admin permissions to manage role permissions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Role Permissions Matrix</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <Info className="h-4 w-4" />
              <span>Elika Admin has full system access. Configure permissions for other roles.</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={resetToDefaults}
              disabled={isSaving}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button 
              onClick={savePermissions}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {roles.map((role) => (
            <div key={role} className="space-y-4">
              <h3 className="text-2xl font-bold flex items-center gap-3">
                <Badge 
                  variant="outline" 
                  className="text-lg px-4 py-2 bg-primary/10 border-primary text-primary font-semibold"
                >
                  {getRoleLabel(role)}
                </Badge>
              </h3>
              
              <div className="grid gap-4">
                {resources.map((resource) => (
                  <div key={resource} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">{getResourceLabel(resource)}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {permissionTypes.map((permission) => (
                        <div key={permission} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${role}-${resource}-${permission}`}
                            checked={hasPermission(role, resource, permission)}
                            onCheckedChange={() => togglePermission(role, resource, permission)}
                          />
                          <label 
                            htmlFor={`${role}-${resource}-${permission}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {getPermissionLabel(permission)}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
