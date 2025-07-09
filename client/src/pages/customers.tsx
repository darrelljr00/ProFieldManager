import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Users, Mail, Phone, MapPin, Edit, Trash2, Search, SortAsc, X, FileSpreadsheet, Upload } from "lucide-react";
import type { Customer, InsertCustomer } from "@shared/schema";

export default function Customers() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "email" | "firstName" | "lastName">("name");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertCustomer>>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "US",
  });
  const { toast } = useToast();

  const { data: customers, isLoading } = useQuery({
    queryKey: ["/api/customers"],
  });

  // Filter and sort customers based on search term and sort criteria
  const filteredAndSortedCustomers = useMemo(() => {
    if (!customers) return [];

    let filtered = customers;

    // Apply search filter
    if (searchTerm) {
      filtered = customers.filter(customer => {
        const searchLower = searchTerm.toLowerCase();
        return (
          customer.name.toLowerCase().includes(searchLower) ||
          customer.email.toLowerCase().includes(searchLower) ||
          (customer.phone && customer.phone.toLowerCase().includes(searchLower)) ||
          (customer.address && customer.address.toLowerCase().includes(searchLower)) ||
          (customer.city && customer.city.toLowerCase().includes(searchLower)) ||
          (customer.state && customer.state.toLowerCase().includes(searchLower))
        );
      });
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "firstName":
          const aFirstName = a.name.split(' ')[0].toLowerCase();
          const bFirstName = b.name.split(' ')[0].toLowerCase();
          return aFirstName.localeCompare(bFirstName);
        case "lastName":
          const aLastName = a.name.split(' ').slice(-1)[0].toLowerCase();
          const bLastName = b.name.split(' ').slice(-1)[0].toLowerCase();
          return aLastName.localeCompare(bLastName);
        case "email":
          return a.email.toLowerCase().localeCompare(b.email.toLowerCase());
        case "name":
        default:
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      }
    });
  }, [customers, searchTerm, sortBy]);

  const createMutation = useMutation({
    mutationFn: (data: InsertCustomer) => apiRequest("POST", "/api/customers", data),
    onSuccess: (newCustomer) => {
      // Force refetch of customers data
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.refetchQueries({ queryKey: ["/api/customers"] });
      
      setIsCreateModalOpen(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        country: "US",
      });
      toast({
        title: "Success",
        description: "Customer created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertCustomer> }) => 
      apiRequest("PUT", `/api/customers/${id}`, data),
    onSuccess: (updatedCustomer) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setEditingCustomer(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        country: "US",
      });
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update customer",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Success",
        description: "Customer deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete customer",
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: (formData: FormData) => apiRequest("POST", "/api/customers/import", formData),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsImportModalOpen(false);
      setImportFile(null);
      setImportPreview([]);
      setIsProcessingImport(false);
      toast({
        title: "Import Successful",
        description: `Imported ${result.imported} customers successfully. ${result.skipped || 0} duplicate entries were skipped.`,
      });
    },
    onError: (error: any) => {
      setIsProcessingImport(false);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import customers",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: formData });
    } else {
      createMutation.mutate(formData as InsertCustomer);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      zipCode: customer.zipCode || "",
      country: customer.country || "US",
    });
  };

  const closeModal = () => {
    setIsCreateModalOpen(false);
    setEditingCustomer(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "US",
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Invalid File",
        description: "Please select an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      return;
    }

    setImportFile(file);
    
    // Read file and show preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        // We'll import XLSX dynamically to avoid bundle size issues
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Take first 5 rows for preview
        setImportPreview(jsonData.slice(0, 5));
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to read Excel file",
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = () => {
    if (!importFile) return;
    
    setIsProcessingImport(true);
    const formData = new FormData();
    formData.append('file', importFile);
    importMutation.mutate(formData);
  };

  return (
    <div className="flex-1">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
            <p className="text-gray-600">Manage your customer database.</p>
          </div>
          
          {/* Search and Sort Controls */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 w-64"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <SortAsc className="w-4 h-4 text-gray-500" />
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Full Name</SelectItem>
                  <SelectItem value="firstName">First Name</SelectItem>
                  <SelectItem value="lastName">Last Name</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Customer
                </Button>
              </DialogTrigger>
            </Dialog>
            
            <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Import Excel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Import Customers from Excel</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {!importFile && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Excel File</h3>
                      <p className="text-gray-500 mb-4">
                        Upload an Excel file (.xlsx or .xls) with customer data
                      </p>
                      <p className="text-sm text-gray-400 mb-4">
                        Expected columns: Name, Email, Phone, Address, City, State, ZipCode, Country
                      </p>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="excel-upload"
                      />
                      <label
                        htmlFor="excel-upload"
                        className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Choose Excel File
                      </label>
                    </div>
                  )}
                  
                  {importFile && importPreview.length > 0 && (
                    <div>
                      <h4 className="text-lg font-medium mb-2">Preview (First 5 rows)</h4>
                      <div className="border rounded-lg overflow-auto max-h-96">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              {Object.keys(importPreview[0] || {}).map((key) => (
                                <th key={key} className="px-4 py-2 text-left font-medium text-gray-700 border-b">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {importPreview.map((row, index) => (
                              <tr key={index} className="border-b">
                                {Object.values(row).map((value: any, colIndex) => (
                                  <td key={colIndex} className="px-4 py-2 text-gray-600">
                                    {value?.toString() || ''}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex justify-between mt-4">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setImportFile(null);
                            setImportPreview([]);
                          }}
                        >
                          Choose Different File
                        </Button>
                        <Button
                          onClick={handleImport}
                          disabled={isProcessingImport}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isProcessingImport ? "Importing..." : "Import Customers"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Customer Create/Edit Dialog */}
      <Dialog open={isCreateModalOpen || !!editingCustomer} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "Edit Customer" : "Create New Customer"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="zipCode">Zip Code</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-primary hover:bg-blue-700"
              >
                {editingCustomer ? "Update" : "Create"} Customer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="p-6">
        {/* Results Summary */}
        {!isLoading && customers && (
          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredAndSortedCustomers.length} of {customers.length} customers
            {searchTerm && (
              <span className="ml-2">
                for "{searchTerm}"
              </span>
            )}
          </div>
        )}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAndSortedCustomers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? `No customers match "${searchTerm}"` : "Get started by creating your first customer."}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Customer
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedCustomers.map((customer) => (
              <Card key={customer.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-medium text-gray-900 mb-1">
                        {customer.name}
                      </CardTitle>
                      <div className="flex items-center text-sm text-gray-500">
                        <Mail className="w-4 h-4 mr-1" />
                        {customer.email}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(customer)}
                        className="text-gray-400 hover:text-blue-600"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(customer.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    {customer.phone && (
                      <div className="flex items-center text-gray-600">
                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                        {customer.phone}
                      </div>
                    )}
                    {(customer.address || customer.city || customer.state) && (
                      <div className="flex items-start text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          {customer.address && <div>{customer.address}</div>}
                          {(customer.city || customer.state) && (
                            <div>
                              {customer.city}{customer.city && customer.state ? ", " : ""}{customer.state} {customer.zipCode}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}