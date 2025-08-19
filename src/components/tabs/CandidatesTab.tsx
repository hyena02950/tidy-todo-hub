import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Search, Filter, UserPlus } from "lucide-react";
import { CandidateCard } from "@/components/CandidateCard";
import apiClient from "@/utils/apiClient";

interface Candidate {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  position: string;
  experience: string;
  skills: string[];
  status: 'submitted' | 'screening' | 'interviewing' | 'selected' | 'rejected';
  submittedBy: string;
  submissionDate: string;
  vendorName?: string;
  resumeUrl?: string;
}

const generateMockCandidates = (): Candidate[] => {
  return [
    {
      _id: '1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-0123',
      position: 'Senior Software Engineer',
      experience: '5 years',
      skills: ['React', 'Node.js', 'TypeScript', 'AWS'],
      status: 'submitted',
      submittedBy: 'vendor_1',
      submissionDate: new Date().toISOString(),
      vendorName: 'Tech Solutions Inc',
      resumeUrl: '/resume/john-doe.pdf'
    },
    {
      _id: '2',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '+1-555-0124',
      position: 'Frontend Developer',
      experience: '3 years',
      skills: ['React', 'Vue.js', 'CSS', 'JavaScript'],
      status: 'interviewing',
      submittedBy: 'vendor_2',
      submissionDate: new Date(Date.now() - 86400000).toISOString(),
      vendorName: 'Digital Innovations',
      resumeUrl: '/resume/jane-smith.pdf'
    },
    {
      _id: '3',
      name: 'Mike Johnson',
      email: 'mike.johnson@example.com',
      phone: '+1-555-0125',
      position: 'DevOps Engineer',
      experience: '4 years',
      skills: ['Docker', 'Kubernetes', 'AWS', 'Jenkins'],
      status: 'selected',
      submittedBy: 'vendor_1',
      submissionDate: new Date(Date.now() - 172800000).toISOString(),
      vendorName: 'Tech Solutions Inc',
      resumeUrl: '/resume/mike-johnson.pdf'
    }
  ];
};

export const CandidatesTab = () => {
  const { isElikaUser, isVendorUser } = useUserRole();
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from API first
      const response = await apiClient.get('/candidates');
      
      if (response.data?.candidates) {
        setCandidates(response.data.candidates);
      } else {
        // Fallback to mock data
        setCandidates(generateMockCandidates());
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
      // Show mock data for demo purposes
      setCandidates(generateMockCandidates());
      toast({
        title: "Info",
        description: "Showing demo data - backend connection needed for live data",
        variant: "default",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'submitted': return 'outline';
      case 'screening': return 'secondary';
      case 'interviewing': return 'default';
      case 'selected': return 'default';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         candidate.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || candidate.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Candidates</h2>
          <p className="text-muted-foreground">
            {isVendorUser ? "Your submitted candidates" : "All candidate submissions"}
          </p>
        </div>
        
        {isVendorUser && (
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Submit Candidate
          </Button>
        )}
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search candidates by name, email, or position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="screening">Screening</SelectItem>
            <SelectItem value="interviewing">Interviewing</SelectItem>
            <SelectItem value="selected">Selected</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Candidates List */}
      <div className="space-y-4">
        {filteredCandidates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <UserPlus className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No candidates found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? "Try adjusting your search or filter criteria"
                  : "No candidates have been submitted yet"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCandidates.map((candidate) => (
            <CandidateCard key={candidate._id} candidate={candidate} />
          ))
        )}
      </div>
    </div>
  );
};
