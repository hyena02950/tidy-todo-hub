
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InterviewCard } from "@/components/InterviewCard";

export const InterviewsTab = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const interviews = [
    {
      id: "INT-001",
      candidateName: "John Doe",
      jobTitle: "Senior React Developer",
      interviewType: "Technical",
      date: "Dec 15, 2024",
      time: "10:00 AM",
      interviewer: "Sarah Wilson",
      status: "scheduled",
      location: "Conference Room A"
    },
    {
      id: "INT-002",
      candidateName: "Jane Smith",
      jobTitle: "DevOps Engineer",
      interviewType: "HR",
      date: "Dec 16, 2024",
      time: "2:00 PM",
      interviewer: "Mark Johnson",
      status: "completed",
      location: "Video Call"
    }
  ];

  const handleScheduleInterview = () => {
    navigate("/schedule-interview");
  };

  const handleReschedule = (interviewId: string) => {
    navigate(`/schedule-interview?interviewId=${interviewId}&mode=reschedule`);
  };

  const handleSubmitFeedback = async (interviewId: string, feedbackData: any) => {
    try {
      // API call would go here
      toast({
        title: "Success",
        description: "Feedback submitted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to submit feedback",
        variant: "destructive",
      });
    }
  };

  const handleFilter = () => {
    toast({
      title: "Filter",
      description: "Filter options would open here",
    });
  };

  const filteredInterviews = interviews.filter(interview =>
    interview.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    interview.jobTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search interviews..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleFilter}>
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button size="sm" onClick={handleScheduleInterview}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Interview
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredInterviews.map((interview) => (
          <InterviewCard 
            key={interview.id} 
            interview={interview}
            onReschedule={handleReschedule}
            onSubmitFeedback={handleSubmitFeedback}
          />
        ))}
      </div>
    </div>
  );
};
