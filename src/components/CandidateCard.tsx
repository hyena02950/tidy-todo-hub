
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, Calendar, Building, FileText } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

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

interface CandidateCardProps {
  candidate: Candidate;
}

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

export const CandidateCard = ({ candidate }: CandidateCardProps) => {
  const { isElikaUser } = useUserRole();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-sm">
                {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{candidate.name}</CardTitle>
              <p className="text-muted-foreground">{candidate.position}</p>
            </div>
          </div>
          <Badge variant={getStatusBadgeVariant(candidate.status)}>
            {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {candidate.skills && candidate.skills.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Skills</h4>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.slice(0, 5).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {candidate.skills.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{candidate.skills.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {isElikaUser && candidate.vendorName && (
          <div className="text-sm">
            <span className="text-muted-foreground">Submitted by:</span> {candidate.vendorName}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {candidate.resumeUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                <FileText className="w-4 h-4 mr-2" />
                View Resume
              </a>
            </Button>
          )}
          
          {isElikaUser && (
            <Select defaultValue={candidate.status}>
              <SelectTrigger className="w-32">
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
          )}
        </div>
      </CardContent>
    </Card>
  );
};
