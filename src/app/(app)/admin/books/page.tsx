"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/auth-client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DocumentUpload } from "@/components/dnd-book-upload";
import { PdfViewerDialog } from "@/components/pdf-viewer-dialog";
import {
  Download,
  Eye,
  Trash2,
  Plus,
  FileText,
  Upload as UploadIcon,
  Search,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Document {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function DocumentsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [downloadingAll, setDownloadingAll] = useState(false);

  const isAdmin =
    session?.user &&
    "isAdmin" in session.user &&
    (session.user as unknown as { isAdmin: boolean }).isAdmin;

  useEffect(() => {
    if (isPending) return;

    // Allow all authenticated users to view documents
    if (!session?.user) {
      router.push("/login");
      return;
    }

    fetchDocuments();
  }, [session, isPending, router]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/documents");
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
      toast.error("Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (data: { title: string; description: string; file: File }) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("title", data.title);
      formData.append("description", data.description);

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload document");
      }

      toast.success("Document uploaded successfully!");
      setShowUpload(false);
      fetchDocuments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete document");
      }

      toast.success("Document deleted successfully!");
      setDeleteDocumentId(null);
      fetchDocuments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast.error(message);
    }
  };

  const handleDownload = (documentId: string) => {
    window.location.href = `/api/documents/${documentId}/pdf`;
  };

  const handleViewDocument = (doc: Document) => {
    setSelectedDocument(doc);
    setShowViewer(true);
  };

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const toggleDocumentSelection = (docId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocuments(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map((d) => d.id)));
    }
  };

  const handleDownloadAll = async () => {
    if (selectedDocuments.size === 0) return;

    setDownloadingAll(true);
    try {
      for (const docId of selectedDocuments) {
        await new Promise((resolve) => {
          const link = document.createElement("a");
          link.href = `/api/documents/${docId}/pdf`;
          link.download = "";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(resolve, 300);
        });
      }
      toast.success(`Downloaded ${selectedDocuments.size} document(s)`);
      setSelectedDocuments(new Set());
    } catch (err) {
      toast.error("Failed to download documents");
    } finally {
      setDownloadingAll(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
                <FileText className="w-10 h-10" />
                Documents
              </h1>
              <p className="text-muted-foreground">
                {isAdmin ? "Upload and manage documents" : "View available documents"}
              </p>
            </div>
            {isAdmin && (
              <Button onClick={() => setShowUpload(true)} className="gap-2 h-11 px-6" size="lg">
                <UploadIcon className="w-5 h-5" />
                Upload Documents
              </Button>
            )}
          </div>

          {/* Search and Actions Bar */}
          {!loading && documents.length > 0 && (
            <div className="flex gap-3 items-center flex-wrap">
              <div className="flex-1 min-w-[250px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents by title, description, or filename..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {selectedDocuments.size > 0 && (
                <div className="flex gap-2 items-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    {selectedDocuments.size} selected
                  </span>
                  <Button
                    onClick={handleDownloadAll}
                    disabled={downloadingAll}
                    className="gap-2"
                    size="sm"
                  >
                    {downloadingAll ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Download All
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Cards */}
        {!loading && documents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 border-l-4 border-l-primary">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
                <p className="text-3xl font-bold">
                  {searchQuery
                    ? `${filteredDocuments.length} / ${documents.length}`
                    : documents.length}
                </p>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-blue-500">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Size</p>
                <p className="text-3xl font-bold">
                  {formatFileSize(filteredDocuments.reduce((acc, d) => acc + d.fileSize, 0))}
                </p>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-green-500">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="text-2xl font-semibold">
                  {filteredDocuments.length > 0 ? formatDate(filteredDocuments[0].updatedAt) : "—"}
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Content Section */}
        {loading ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Loading documents...</p>
            </div>
          </Card>
        ) : filteredDocuments.length === 0 ? (
          <Card className="p-12 text-center border-2 border-dashed">
            <div className="flex flex-col items-center gap-4">
              <FileText className="w-16 h-16 text-muted-foreground/40" />
              <div>
                <p className="text-lg font-medium text-foreground">
                  {searchQuery ? "No documents found" : "No documents yet"}
                </p>
                <p className="text-muted-foreground mt-1">
                  {searchQuery
                    ? "Try adjusting your search"
                    : "Start uploading documents to get started"}
                </p>
              </div>
              {!searchQuery && isAdmin && (
                <Button onClick={() => setShowUpload(true)} className="gap-2 mt-4">
                  <Plus className="w-4 h-4" />
                  Upload First Document
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden border border-border rounded-lg">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-muted/50">
                      <TableHead className="w-12 text-center">
                        <Checkbox
                          checked={
                            selectedDocuments.size === filteredDocuments.length &&
                            filteredDocuments.length > 0
                          }
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="font-semibold">Title</TableHead>
                      <TableHead className="font-semibold">Description</TableHead>
                      <TableHead className="font-semibold">File Size</TableHead>
                      <TableHead className="font-semibold">Uploaded</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => (
                      <TableRow
                        key={doc.id}
                        className="hover:bg-muted/50 transition-colors border-b last:border-b-0"
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={selectedDocuments.has(doc.id)}
                            onCheckedChange={() => toggleDocumentSelection(doc.id)}
                          />
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground/60" />
                            {doc.title}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs">
                          <div className="truncate">
                            {doc.description || <span className="italic">No description</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="secondary" className="font-mono">
                            {formatFileSize(doc.fileSize)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(doc.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger>
                                <Button size="sm" variant="outline" className="gap-2">
                                  Actions
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDocument(doc)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownload(doc.id)}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                {isAdmin && (
                                  <DropdownMenuItem
                                    onClick={() => setDeleteDocumentId(doc.id)}
                                    className="text-red-600 dark:text-red-400"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog
              open={deleteDocumentId !== null}
              onOpenChange={(open) => !open && setDeleteDocumentId(null)}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Document</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;
                    {documents.find((d) => d.id === deleteDocumentId)?.title}&quot;? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex gap-2 justify-end pt-2">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteDocumentId && handleDelete(deleteDocumentId)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {isAdmin && (
          <DocumentUpload
            open={showUpload}
            onOpenChange={setShowUpload}
            onUpload={handleUpload}
            isLoading={uploading}
          />
        )}

        {selectedDocument && (
          <PdfViewerDialog
            isOpen={showViewer}
            bookId={selectedDocument.id}
            bookTitle={selectedDocument.title}
            onOpenChange={setShowViewer}
          />
        )}
      </div>
    </div>
  );
}
