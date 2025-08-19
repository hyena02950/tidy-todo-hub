
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eye, Edit, Trash2, FileText, Calendar, DollarSign, User } from "lucide-react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  candidateName: string;
  jobTitle: string;
  amount: number;
  status: string;
  submittedDate: string;
  dueDate: string;
  jobId: string;
}

interface InvoiceCardProps {
  invoice: Invoice;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending": return "secondary";
    case "approved": return "default";
    case "paid": return "outline";
    case "rejected": return "destructive";
    default: return "secondary";
  }
};

export const InvoiceCard = ({ invoice, onEdit, onDelete, onDownload }: InvoiceCardProps) => {
  return (
    <Card className="bg-gradient-card shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {invoice.invoiceNumber}
            </CardTitle>
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <User className="w-4 h-4" />
              {invoice.candidateName} • {invoice.jobTitle}
            </p>
          </div>
          <Badge variant={getStatusColor(invoice.status)}>
            {invoice.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span>₹{invoice.amount.toLocaleString()}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Job ID: {invoice.jobId}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            Submitted: {invoice.submittedDate}
          </div>
          <div className="text-sm text-muted-foreground">
            Due: {invoice.dueDate}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 pt-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default" size="sm">
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Invoice Details - {invoice.invoiceNumber}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Invoice Information</h4>
                    <p className="text-sm text-muted-foreground">Invoice #: {invoice.invoiceNumber}</p>
                    <p className="text-sm text-muted-foreground">Amount: ₹{invoice.amount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Status: {invoice.status}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Candidate Details</h4>
                    <p className="text-sm text-muted-foreground">Name: {invoice.candidateName}</p>
                    <p className="text-sm text-muted-foreground">Position: {invoice.jobTitle}</p>
                    <p className="text-sm text-muted-foreground">Job ID: {invoice.jobId}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Dates</h4>
                  <p className="text-sm text-muted-foreground">Submitted: {invoice.submittedDate}</p>
                  <p className="text-sm text-muted-foreground">Due Date: {invoice.dueDate}</p>
                </div>
                <Button onClick={() => onDownload(invoice.id)} className="w-full">
                  <FileText className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" size="sm" onClick={() => onEdit(invoice.id)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => onDelete(invoice.id)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
