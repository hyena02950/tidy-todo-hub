
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Search, Filter, UserPlus, FileText, Mail, Phone, Calendar, Building } from "lucide-react";
import { getToken } from "@/utils/auth";

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

export const CandidatesTab = () => {
  const { isElikaUser, isVendorUser } = useUserRole();
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchCandidates = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch('/api/candidates', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCandidates(data.candidates || []);
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch candidates",
        variant: "destructive",
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
            <Card key={candidate._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Candidate Avatar and Basic Info */}
                  <div className="flex items-start gap-4 flex-shrink-0">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="text-lg">
                        {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-1">
                      <h3 className="text-xl font-semibold">{candidate.name}</h3>
                      <p className="text-lg text-muted-foreground">{candidate.position}</p>
                      <Badge variant={getStatusBadgeVariant(candidate.status)} className="w-fit">
                        {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  {/* Candidate Details */}
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Contact Information */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Contact Information</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span>{candidate.email}</span>
                          </div>
                          {candidate.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span>{candidate.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Professional Information */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Professional Details</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Building className="w-4 h-4 text-muted-foreground" />
                            <span>{candidate.experience} experience</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>Submitted {new Date(candidate.submissionDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Skills */}
                    {candidate.skills && candidate.skills.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {candidate.skills.map((skill, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Submission Details */}
                    {isElikaUser && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Submission Details</h4>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Submitted by:</span> {candidate.vendorName || candidate.submittedBy}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {candidate.resumeUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                          <FileText className="w-4 h-4 mr-2" />
                          View Resume
                        </a>
                      </Button>
                    )}
                    
                    {isElikaUser && (
                      <div className="space-y-2">
                        <Select defaultValue={candidate.status}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="submitted">Submitted</SelectItem>
                            <SelectItem value="screening">Screening</SelectItem>
                            <SelectItem value="interviewing">Interviewing</SelectItem>
                            <SelectItem value="selected">Selected</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Button variant="outline" size="sm" className="w-full">
                          Schedule Interview
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
