
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, MessageSquare, User, MapPin, Briefcase } from "lucide-react";
import { useState } from "react";

interface Interview {
  id: string;
  candidateName: string;
  jobTitle: string;
  interviewType: string;
  date: string;
  time: string;
  interviewer: string;
  status: string;
  location: string;
}

interface InterviewCardProps {
  interview: Interview;
  onReschedule: (id: string) => void;
  onSubmitFeedback: (id: string, feedback: any) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "scheduled": return "default";
    case "completed": return "secondary";
    case "cancelled": return "destructive";
    default: return "secondary";
  }
};

export const InterviewCard = ({ interview, onReschedule, onSubmitFeedback }: InterviewCardProps) => {
  const [feedbackData, setFeedbackData] = useState({ 
    rating: "", 
    feedback: "", 
    recommendation: "" 
  });

  const handleSubmitFeedback = () => {
    onSubmitFeedback(interview.id, feedbackData);
    setFeedbackData({ rating: "", feedback: "", recommendation: "" });
  };

  return (
    <Card className="bg-gradient-card shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              {interview.candidateName}
            </CardTitle>
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <Briefcase className="w-4 h-4" />
              {interview.jobTitle} • {interview.interviewType}
            </p>
          </div>
          <Badge variant={getStatusColor(interview.status)}>
            {interview.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            {interview.date}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {interview.time}
          </div>
          <div className="text-sm text-muted-foreground">
            Interviewer: {interview.interviewer}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            {interview.location}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onReschedule(interview.id)}>
            <Calendar className="mr-2 h-4 w-4" />
            Reschedule
          </Button>
          
          {interview.status === "completed" && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Add Feedback
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Interview Feedback - {interview.candidateName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="rating" className="text-sm font-medium">Rating (1-5)</label>
                    <Input
                      id="rating"
                      type="number"
                      min="1"
                      max="5"
                      placeholder="Rate the candidate"
                      value={feedbackData.rating}
                      onChange={(e) => setFeedbackData(prev => ({ ...prev, rating: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="feedback" className="text-sm font-medium">Feedback</label>
                    <Textarea
                      id="feedback"
                      placeholder="Enter your feedback about the candidate"
                      value={feedbackData.feedback}
                      onChange={(e) => setFeedbackData(prev => ({ ...prev, feedback: e.target.value }))}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="recommendation" className="text-sm font-medium">Recommendation</label>
                    <select
                      id="recommendation"
                      value={feedbackData.recommendation}
                      onChange={(e) => setFeedbackData(prev => ({ ...prev, recommendation: e.target.value }))}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    >
                      <option value="">Select recommendation</option>
                      <option value="proceed">Proceed to next round</option>
                      <option value="reject">Reject</option>
                      <option value="hold">Hold for later</option>
                    </select>
                  </div>
                  <Button onClick={handleSubmitFeedback} className="w-full">
                    Submit Feedback
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
