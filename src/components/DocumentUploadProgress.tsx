
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, Upload, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/utils/auth";

interface DocumentUploadProgressProps {
  vendorId: string;
}

interface VendorDocument {
  id: string;
  document_type: string;
  file_name: string;
  status: 'pending' | 'approved' | 'rejected';
  review_notes?: string;
  uploaded_at: string;
}

const REQUIRED_DOCUMENTS = [
  { type: 'msa', label: 'Master Service Agreement (MSA)', required: true },
  { type: 'nda', label: 'Non-Disclosure Agreement (NDA)', required: true },
  { type: 'incorporation_certificate', label: 'Incorporation Certificate (CIN)', required: true },
  { type: 'gst_certificate', label: 'GST Certificate', required: true },
  { type: 'shop_act_license', label: 'Shop Act License', required: true },
  { type: 'msme_registration', label: 'MSME Registration', required: false },
];

export const DocumentUploadProgress = ({ vendorId }: DocumentUploadProgressProps) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<VendorDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [vendorId]);

  const fetchDocuments = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`/api/vendors/${vendorId}/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (documentType: string, file: File) => {
    const token = getToken();
    if (!token) {
      toast({
        title: "Error",
        description: "Authentication required",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(documentType);

    try {
      const formData = new FormData();
      formData.append('documentType', documentType);
      formData.append('document', file);
      formData.append('vendorId', vendorId);

      const response = await fetch('/api/vendors/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload document');
      }

      toast({
        title: "Document Uploaded",
        description: `${file.name} has been uploaded successfully and is pending review.`,
      });

      await fetchDocuments();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: `Failed to upload document: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Upload className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending Review</Badge>;
      default:
        return <Badge variant="outline">Not Uploaded</Badge>;
    }
  };

  const getDocumentStatus = (documentType: string) => {
    const doc = documents.find(d => d.document_type === documentType);
    return doc?.status || null;
  };

  const uploadedCount = REQUIRED_DOCUMENTS.filter(doc => 
    documents.some(d => d.document_type === doc.type)
  ).length;
  
  const approvedCount = REQUIRED_DOCUMENTS.filter(doc => 
    documents.some(d => d.document_type === doc.type && d.status === 'approved')
  ).length;

  const progress = (uploadedCount / REQUIRED_DOCUMENTS.length) * 100;
  const approvalProgress = (approvedCount / REQUIRED_DOCUMENTS.length) * 100;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading documents...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Document Upload Progress
          <Button variant="outline" size="sm" onClick={fetchDocuments}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Upload Progress: {uploadedCount}/{REQUIRED_DOCUMENTS.length}</span>
            <span>Approved: {approvedCount}/{REQUIRED_DOCUMENTS.length}</span>
          </div>
          <div className="space-y-1">
            <Progress value={progress} className="w-full" />
            <div className="text-xs text-muted-foreground">
              Upload Progress: {Math.round(progress)}%
            </div>
          </div>
          <div className="space-y-1">
            <Progress value={approvalProgress} className="w-full bg-green-100" />
            <div className="text-xs text-muted-foreground">
              Approval Progress: {Math.round(approvalProgress)}%
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {REQUIRED_DOCUMENTS.map((doc) => {
            const status = getDocumentStatus(doc.type);
            const document = documents.find(d => d.document_type === doc.type);
            
            return (
              <div key={doc.type} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(status)}
                  <div>
                    <div className="font-medium">{doc.label}</div>
                    {doc.required && (
                      <div className="text-xs text-red-500">Required</div>
                    )}
                    {document?.review_notes && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Review Notes: {document.review_notes}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {getStatusBadge(status)}
                  
                  <div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.png"
                      className="hidden"
                      id={`file-${doc.type}`}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(doc.type, file);
                        }
                      }}
                      disabled={uploading === doc.type}
                    />
                    <label htmlFor={`file-${doc.type}`} className="cursor-pointer">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploading === doc.type}
                        asChild
                      >
                        <span>
                          {uploading === doc.type ? (
                            <>
                              <Upload className="h-4 w-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              {status ? 'Replace' : 'Upload'}
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
