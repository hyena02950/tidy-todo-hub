
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InvoiceCard } from "@/components/InvoiceCard";

export const InvoicesTab = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const invoices = [
    {
      id: "INV-001",
      invoiceNumber: "INV-2024-001",
      candidateName: "John Doe",
      jobTitle: "Senior React Developer",
      amount: 50000,
      status: "pending",
      submittedDate: "Dec 10, 2024",
      dueDate: "Dec 25, 2024",
      jobId: "JD001"
    },
    {
      id: "INV-002",
      invoiceNumber: "INV-2024-002",
      candidateName: "Jane Smith",
      jobTitle: "DevOps Engineer",
      amount: 45000,
      status: "approved",
      submittedDate: "Dec 12, 2024",
      dueDate: "Dec 27, 2024",
      jobId: "JD002"
    }
  ];

  const handleCreateInvoice = () => {
    navigate("/invoice-upload");
  };

  const handleEditInvoice = (invoiceId: string) => {
    navigate(`/invoice-upload?invoiceId=${invoiceId}&mode=edit`);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      // API call would go here
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    }
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    toast({
      title: "Download",
      description: "Downloading invoice...",
    });
  };

  const handleFilter = () => {
    toast({
      title: "Filter",
      description: "Filter options would open here",
    });
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search invoices..." 
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
          <Button size="sm" onClick={handleCreateInvoice}>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredInvoices.map((invoice) => (
          <InvoiceCard 
            key={invoice.id} 
            invoice={invoice}
            onEdit={handleEditInvoice}
            onDelete={handleDeleteInvoice}
            onDownload={handleDownloadInvoice}
          />
        ))}
      </div>
    </div>
  );
};
