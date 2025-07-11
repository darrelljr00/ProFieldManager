import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { 
  Upload, 
  Download, 
  Share2, 
  FolderPlus, 
  FileText, 
  Image, 
  Video, 
  File, 
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  FileSignature,
  Link,
  Calendar,
  User
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FileItem {
  id: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  fileType: string;
  description?: string;
  tags?: string[];
  downloadCount: number;
  uploadedByUser?: {
    username: string;
    firstName?: string;
    lastName?: string;
  };
  createdAt: string;
  updatedAt: string;
  folder?: {
    id: number;
    name: string;
  };
  // DocuSign fields
  docusignEnvelopeId?: string;
  signatureStatus?: string;
  signatureUrl?: string;
  signedDocumentUrl?: string;
}

interface Folder {
  id: number;
  name: string;
  description?: string;
  parentFolderId?: number;
  createdAt: string;
}

export default function FileManager() {
  const [selectedFolderId, setSelectedFolderId] = useState<number | undefined>();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [docusignDialogOpen, setDocusignDialogOpen] = useState(false);
  const [createFileDialogOpen, setCreateFileDialogOpen] = useState(false);
  const [editFileDialogOpen, setEditFileDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [fileDescription, setFileDescription] = useState("");
  const [fileTags, setFileTags] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermissions, setSharePermissions] = useState("view");
  const [shareExpiry, setShareExpiry] = useState("");
  const [docusignEmail, setDocusignEmail] = useState("");
  const [docusignName, setDocusignName] = useState("");
  const [docusignSubject, setDocusignSubject] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [editingFileContent, setEditingFileContent] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch files
  const { data: files, isLoading: filesLoading } = useQuery({
    queryKey: ["/api/files", selectedFolderId],
    queryFn: () => apiRequest("GET", `/api/files${selectedFolderId ? `?folderId=${selectedFolderId}` : ""}`).then(res => res.json()),
  });

  // Fetch folders
  const { data: folders } = useQuery({
    queryKey: ["/api/folders", selectedFolderId],
    queryFn: () => apiRequest("GET", `/api/folders${selectedFolderId ? `?parentId=${selectedFolderId}` : ""}`).then(res => res.json()),
  });

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("POST", "/api/files/upload", data);
    },
    onSuccess: () => {
      toast({
        title: "File uploaded successfully",
        description: "Your file has been uploaded to the file manager.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/files", selectedFolderId] });
      setUploadDialogOpen(false);
      setUploadFile(null);
      setFileDescription("");
      setFileTags("");
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    },
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; parentFolderId?: number }) => {
      return await apiRequest("POST", "/api/folders", data);
    },
    onSuccess: () => {
      toast({
        title: "Folder created successfully",
        description: "New folder has been created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      setFolderDialogOpen(false);
      setFolderName("");
      setFolderDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create folder",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Share file mutation
  const shareFileMutation = useMutation({
    mutationFn: async (data: { fileId: number; sharedWith?: string; permissions: string; expiresAt?: string }) => {
      return await apiRequest("POST", `/api/files/${data.fileId}/share`, data);
    },
    onSuccess: (response) => {
      toast({
        title: "File shared successfully",
        description: "Share link has been created.",
      });
      setShareDialogOpen(false);
      setShareEmail("");
      setSharePermissions("view");
      setShareExpiry("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to share file",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // DocuSign mutation
  const docusignMutation = useMutation({
    mutationFn: async (data: { fileId: number; recipientEmail: string; recipientName: string; subject?: string }) => {
      return await apiRequest("POST", `/api/files/${data.fileId}/docusign`, data);
    },
    onSuccess: () => {
      toast({
        title: "Document sent for signature",
        description: "The recipient will receive an email with signing instructions.",
      });
      setDocusignDialogOpen(false);
      setDocusignEmail("");
      setDocusignName("");
      setDocusignSubject("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send for signature",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      return await apiRequest("DELETE", `/api/files/${fileId}`);
    },
    onSuccess: () => {
      toast({
        title: "File deleted",
        description: "File has been removed from the file manager.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete file",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Create text file mutation
  const createTextFileMutation = useMutation({
    mutationFn: async (data: { name: string; content: string; folderId?: number }) => {
      return await apiRequest("POST", "/api/files/create-text", data).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "File created successfully",
        description: "New text file has been created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/files", selectedFolderId] });
      setCreateFileDialogOpen(false);
      setNewFileName("");
      setNewFileContent("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create file",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Update file content mutation
  const updateFileContentMutation = useMutation({
    mutationFn: async (data: { fileId: number; content: string }) => {
      return await apiRequest("PUT", `/api/files/${data.fileId}/content`, { content: data.content }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "File updated successfully",
        description: "File content has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      setEditFileDialogOpen(false);
      setSelectedFile(null);
      setEditingFileContent("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update file",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Convert to PDF mutation
  const convertToPdfMutation = useMutation({
    mutationFn: async (fileId: number) => {
      return await apiRequest("POST", `/api/files/${fileId}/convert-to-pdf`).then(res => res.json());
    },
    onSuccess: (response) => {
      toast({
        title: "File converted to PDF",
        description: "PDF version has been created and added to your files.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/files", selectedFolderId] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to convert to PDF",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Fetch file content query
  const { data: fileContent, refetch: refetchFileContent } = useQuery({
    queryKey: ["/api/files", selectedFile?.id, "content"],
    queryFn: () => 
      selectedFile ? 
        apiRequest("GET", `/api/files/${selectedFile.id}/content`).then(res => res.json()) : 
        null,
    enabled: !!selectedFile && editFileDialogOpen,
  });

  const handleUpload = () => {
    if (!uploadFile) return;

    const formData = new FormData();
    formData.append("file", uploadFile);
    if (fileDescription) formData.append("description", fileDescription);
    if (fileTags) formData.append("tags", JSON.stringify(fileTags.split(",").map(t => t.trim())));
    if (selectedFolderId) formData.append("folderId", selectedFolderId.toString());

    uploadMutation.mutate(formData);
  };

  const handleCreateFolder = () => {
    createFolderMutation.mutate({
      name: folderName,
      description: folderDescription || undefined,
      parentFolderId: selectedFolderId,
    });
  };

  const handleShareFile = () => {
    if (!selectedFile) return;

    shareFileMutation.mutate({
      fileId: selectedFile.id,
      sharedWith: shareEmail || undefined,
      permissions: sharePermissions,
      expiresAt: shareExpiry || undefined,
    });
  };

  const handleDocuSign = () => {
    if (!selectedFile) return;

    docusignMutation.mutate({
      fileId: selectedFile.id,
      recipientEmail: docusignEmail,
      recipientName: docusignName,
      subject: docusignSubject || undefined,
    });
  };

  const handleCreateTextFile = () => {
    if (!newFileName || !newFileContent) return;

    createTextFileMutation.mutate({
      name: newFileName,
      content: newFileContent,
      folderId: selectedFolderId,
    });
  };

  const handleEditFile = async (file: FileItem) => {
    setSelectedFile(file);
    setEditFileDialogOpen(true);
    // Fetch file content when dialog opens
    const response = await apiRequest("GET", `/api/files/${file.id}/content`);
    const data = await response.json();
    setEditingFileContent(data.content || "");
  };

  const handleUpdateFileContent = () => {
    if (!selectedFile) return;

    updateFileContentMutation.mutate({
      fileId: selectedFile.id,
      content: editingFileContent,
    });
  };

  const handleConvertToPdf = (file: FileItem) => {
    convertToPdfMutation.mutate(file.id);
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const response = await apiRequest("GET", `/api/files/${file.id}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message || "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (fileType: string, mimeType: string) => {
    switch (fileType) {
      case "image":
        return <Image className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getDocuSignStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Sent for Signature</Badge>;
      case 'delivered':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Delivered</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Signed</Badge>;
      case 'declined':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Declined</Badge>;
      case 'voided':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Voided</Badge>;
      default:
        return null;
    }
  };

  const isDocumentSignable = (mimeType: string) => {
    return ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(mimeType);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">File Manager</h1>
            <p className="text-gray-600">Upload, organize, and share your documents</p>
          </div>
          <div className="flex gap-3">
            <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FolderPlus className="mr-2 h-4 w-4" />
                  New Folder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Folder</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="folder-name">Folder Name</Label>
                    <Input
                      id="folder-name"
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      placeholder="Enter folder name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="folder-description">Description (Optional)</Label>
                    <Textarea
                      id="folder-description"
                      value={folderDescription}
                      onChange={(e) => setFolderDescription(e.target.value)}
                      placeholder="Enter folder description"
                    />
                  </div>
                  <Button 
                    onClick={handleCreateFolder} 
                    disabled={!folderName || createFolderMutation.isPending}
                    className="w-full"
                  >
                    {createFolderMutation.isPending ? "Creating..." : "Create Folder"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={createFileDialogOpen} onOpenChange={setCreateFileDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Create Text File
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Text File</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="new-file-name">File Name</Label>
                    <Input
                      id="new-file-name"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      placeholder="Enter file name (e.g., document.txt)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-file-content">Content</Label>
                    <Textarea
                      id="new-file-content"
                      value={newFileContent}
                      onChange={(e) => setNewFileContent(e.target.value)}
                      placeholder="Enter file content"
                      rows={10}
                    />
                  </div>
                  <Button 
                    onClick={handleCreateTextFile} 
                    disabled={!newFileName || !newFileContent || createTextFileMutation.isPending}
                    className="w-full"
                  >
                    {createTextFileMutation.isPending ? "Creating..." : "Create File"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload File</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="file-upload">Select File</Label>
                    <Input
                      id="file-upload"
                      type="file"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="file-description">Description (Optional)</Label>
                    <Textarea
                      id="file-description"
                      value={fileDescription}
                      onChange={(e) => setFileDescription(e.target.value)}
                      placeholder="Enter file description"
                    />
                  </div>
                  <div>
                    <Label htmlFor="file-tags">Tags (Optional)</Label>
                    <Input
                      id="file-tags"
                      value={fileTags}
                      onChange={(e) => setFileTags(e.target.value)}
                      placeholder="Enter tags separated by commas"
                    />
                  </div>
                  <Button 
                    onClick={handleUpload} 
                    disabled={!uploadFile || uploadMutation.isPending}
                    className="w-full"
                  >
                    {uploadMutation.isPending ? "Uploading..." : "Upload File"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Folders Section */}
        {folders && folders.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Folders</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {folders.map((folder: Folder) => (
                <Card 
                  key={folder.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedFolderId(folder.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <FolderPlus className="h-8 w-8 text-blue-500 mr-3" />
                      <div>
                        <h3 className="font-medium">{folder.name}</h3>
                        {folder.description && (
                          <p className="text-sm text-gray-600">{folder.description}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Separator className="my-6" />
          </div>
        )}

        {/* Files Section */}
        <div>
          <h2 className="text-xl font-semibold mb-3">Files</h2>
          {filesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files?.map((file: FileItem) => (
                <Card key={file.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        {getFileIcon(file.fileType, file.mimeType)}
                        <span className="ml-2 font-medium truncate">{file.originalName}</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownload(file)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          {file.fileType === 'text' && (
                            <DropdownMenuItem onClick={() => handleEditFile(file)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {file.fileType === 'text' && (
                            <DropdownMenuItem onClick={() => handleConvertToPdf(file)}>
                              <FileText className="mr-2 h-4 w-4" />
                              Convert to PDF
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedFile(file);
                              setShareDialogOpen(true);
                            }}
                          >
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                          </DropdownMenuItem>
                          {isDocumentSignable(file.mimeType) && (
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedFile(file);
                                setDocusignDialogOpen(true);
                              }}
                            >
                              <FileSignature className="mr-2 h-4 w-4" />
                              {file.signatureStatus === 'completed' ? 'View Signed Document' : 'Send for Signature'}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => deleteFileMutation.mutate(file.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{formatFileSize(file.fileSize)}</span>
                        <span>{file.downloadCount} downloads</span>
                      </div>
                      
                      {file.description && (
                        <p className="text-sm text-gray-700">{file.description}</p>
                      )}
                      
                      {file.tags && file.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {file.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {file.signatureStatus && file.signatureStatus !== 'none' && (
                        <div className="mt-2">
                          {getDocuSignStatusBadge(file.signatureStatus)}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {file.uploadedByUser.firstName || file.uploadedByUser.username}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Share Dialog */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share File</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="share-email">Share with Email (Optional)</Label>
                <Input
                  id="share-email"
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <Label htmlFor="share-permissions">Permissions</Label>
                <Select value={sharePermissions} onValueChange={setSharePermissions}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View Only</SelectItem>
                    <SelectItem value="download">View & Download</SelectItem>
                    <SelectItem value="edit">View, Download & Edit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="share-expiry">Expiry Date (Optional)</Label>
                <Input
                  id="share-expiry"
                  type="datetime-local"
                  value={shareExpiry}
                  onChange={(e) => setShareExpiry(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleShareFile} 
                disabled={shareFileMutation.isPending}
                className="w-full"
              >
                {shareFileMutation.isPending ? "Creating Share Link..." : "Create Share Link"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* DocuSign Dialog */}
        <Dialog open={docusignDialogOpen} onOpenChange={setDocusignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send for Digital Signature</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="docusign-email">Recipient Email</Label>
                <Input
                  id="docusign-email"
                  type="email"
                  value={docusignEmail}
                  onChange={(e) => setDocusignEmail(e.target.value)}
                  placeholder="Enter recipient email"
                  required
                />
              </div>
              <div>
                <Label htmlFor="docusign-name">Recipient Name</Label>
                <Input
                  id="docusign-name"
                  value={docusignName}
                  onChange={(e) => setDocusignName(e.target.value)}
                  placeholder="Enter recipient name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="docusign-subject">Email Subject (Optional)</Label>
                <Input
                  id="docusign-subject"
                  value={docusignSubject}
                  onChange={(e) => setDocusignSubject(e.target.value)}
                  placeholder="Enter email subject"
                />
              </div>
              <Button 
                onClick={handleDocuSign} 
                disabled={!docusignEmail || !docusignName || docusignMutation.isPending}
                className="w-full"
              >
                {docusignMutation.isPending ? "Sending..." : "Send for Signature"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit File Dialog */}
        <Dialog open={editFileDialogOpen} onOpenChange={setEditFileDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Edit File: {selectedFile?.originalName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-file-content">File Content</Label>
                <Textarea
                  id="edit-file-content"
                  value={editingFileContent}
                  onChange={(e) => setEditingFileContent(e.target.value)}
                  placeholder="Edit file content..."
                  rows={15}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleUpdateFileContent} 
                  disabled={updateFileContentMutation.isPending}
                  className="flex-1"
                >
                  {updateFileContentMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setEditFileDialogOpen(false);
                    setSelectedFile(null);
                    setEditingFileContent("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}