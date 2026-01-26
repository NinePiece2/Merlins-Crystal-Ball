"use client";

import React, { useEffect, useState, useMemo, useCallback, useTransition, memo } from "react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

interface SearchInputProps {
  searchQuery: string;
  isSearching: boolean;
  onChange: (value: string) => void;
}

const SearchInput = memo(function SearchInput({
  searchQuery,
  isSearching,
  onChange,
}: SearchInputProps) {
  return (
    <div className="flex-1 min-w-[250px] relative">
      {isSearching ? (
        <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
      ) : (
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      )}
      <Input
        placeholder="Search documents by title, description, or filename..."
        value={searchQuery}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
      />
    </div>
  );
});

export default function DocumentsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [isPending2, startTransition] = useTransition();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [bulkDeleteDocIds, setBulkDeleteDocIds] = useState<Set<string> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setDebouncedSearchQuery(searchQuery);
      });
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery, startTransition]);

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

  const handleUpload = async (
    data: { title: string; description: string; file: File },
    onProgress?: (progress: number) => void,
  ) => {
    setUploading(true);
    try {
      const file = data.file;
      const fileSize = file.size;
      const fileSizeMB = fileSize / (1024 * 1024);

      // Dynamic chunk size and parallel uploads based on file size
      // IMPORTANT: Chunk size must be under 10MB due to Next.js body size limit
      let CHUNK_SIZE: number;
      let MAX_PARALLEL_UPLOADS: number;

      if (fileSizeMB < 50) {
        // Small files: 8MB chunks, 2 parallel
        CHUNK_SIZE = 8 * 1024 * 1024;
        MAX_PARALLEL_UPLOADS = 2;
      } else if (fileSizeMB < 250) {
        // Medium files (100-250MB): 8MB chunks, 6 parallel for faster upload
        CHUNK_SIZE = 8 * 1024 * 1024;
        MAX_PARALLEL_UPLOADS = 6;
      } else if (fileSizeMB < 1000) {
        // Large files: 8MB chunks, 5 parallel
        CHUNK_SIZE = 8 * 1024 * 1024;
        MAX_PARALLEL_UPLOADS = 5;
      } else {
        // Very large files: 8MB chunks, 4 parallel to avoid overwhelming server
        CHUNK_SIZE = 8 * 1024 * 1024;
        MAX_PARALLEL_UPLOADS = 4;
      }

      // If file is small enough, upload directly
      if (fileSize < CHUNK_SIZE) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", data.title);
        formData.append("description", data.description);
        formData.append("fileType", file.type);

        const response = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to upload document");
        }
        onProgress?.(100);
      } else {
        // For large files, chunk and upload in parallel
        const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
        const uploadId = crypto.randomUUID();

        // Create array of chunk uploads
        const chunkUploads = Array.from({ length: totalChunks }, (_, chunkIndex) => ({
          chunkIndex,
          start: chunkIndex * CHUNK_SIZE,
          end: Math.min((chunkIndex + 1) * CHUNK_SIZE, fileSize),
        }));

        let completedChunks = 0;

        // Upload chunks in parallel batches
        for (let i = 0; i < chunkUploads.length; i += MAX_PARALLEL_UPLOADS) {
          const batch = chunkUploads.slice(i, i + MAX_PARALLEL_UPLOADS);

          await Promise.all(
            batch.map(async ({ chunkIndex, start, end }) => {
              const chunk = file.slice(start, end);
              const chunkFormData = new FormData();
              chunkFormData.append("file", chunk);
              chunkFormData.append("title", data.title);
              chunkFormData.append("description", data.description);
              chunkFormData.append("uploadId", uploadId);
              chunkFormData.append("chunkIndex", chunkIndex.toString());
              chunkFormData.append("totalChunks", totalChunks.toString());
              chunkFormData.append("fileType", file.type);

              const response = await fetch("/api/documents", {
                method: "POST",
                body: chunkFormData,
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(
                  error.error || `Failed to upload chunk ${chunkIndex + 1}/${totalChunks}`,
                );
              }

              completedChunks++;
              const progress = Math.round((completedChunks / totalChunks) * 100);
              onProgress?.(progress);
            }),
          );
        }
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

  const handleBulkDelete = async (docIds: Set<string>) => {
    try {
      let failedCount = 0;
      for (const docId of docIds) {
        try {
          const response = await fetch(`/api/documents/${docId}`, {
            method: "DELETE",
          });
          if (!response.ok) {
            failedCount++;
          }
        } catch {
          failedCount++;
        }
      }

      const successCount = docIds.size - failedCount;
      if (successCount > 0) {
        toast.success(`Deleted ${successCount} document(s)`);
      }
      if (failedCount > 0) {
        toast.error(`Failed to delete ${failedCount} document(s)`);
      }

      setBulkDeleteDocIds(null);
      setSelectedDocuments(new Set());
      fetchDocuments();
    } catch {
      toast.error("Bulk delete failed");
    }
  };

  const handleUpdateDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editingTitle,
          description: editingDescription,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update document");
      }

      toast.success("Document updated successfully!");
      setEditingDocId(null);
      fetchDocuments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      toast.error(message);
    }
  };

  const handleDownload = (documentId: string) => {
    window.open(`/api/documents/${documentId}/pdf`, "_blank");
  };

  const handleViewDocument = (doc: Document) => {
    setSelectedDocument(doc);
    setShowViewer(true);
  };

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const filteredDocuments = useMemo(
    () =>
      documents
        .filter(
          (doc) =>
            doc.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            doc.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            doc.fileName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()),
        )
        .sort((a, b) => a.title.localeCompare(b.title)),
    [documents, debouncedSearchQuery],
  );

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  const totalPages = itemsPerPage === 0 ? 1 : Math.ceil(filteredDocuments.length / itemsPerPage);
  const paginatedDocuments = useMemo(() => {
    if (itemsPerPage === 0) return filteredDocuments;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDocuments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDocuments, currentPage, itemsPerPage]);

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
    if (paginatedDocuments.every((d) => selectedDocuments.has(d.id))) {
      // Deselect all on current page
      const newSelected = new Set(selectedDocuments);
      paginatedDocuments.forEach((d) => newSelected.delete(d.id));
      setSelectedDocuments(newSelected);
    } else {
      // Select all on current page
      const newSelected = new Set(selectedDocuments);
      paginatedDocuments.forEach((d) => newSelected.add(d.id));
      setSelectedDocuments(newSelected);
    }
  };

  const handleDownloadAll = async () => {
    if (selectedDocuments.size === 0) return;

    setDownloadingAll(true);
    try {
      // Use streaming bulk download endpoint
      const response = await fetch("/api/documents/download-bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentIds: Array.from(selectedDocuments),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to download documents");
      }

      // Get the blob from the streaming response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch
        ? filenameMatch[1]
        : `documents_${new Date().toISOString().split("T")[0]}.zip`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Downloaded ${selectedDocuments.size} document(s) as zip`);
      setSelectedDocuments(new Set());
    } catch (error) {
      console.error("Download error:", error);
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

  const formatFullDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-background">
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
              <SearchInput
                searchQuery={searchQuery}
                isSearching={isPending2}
                onChange={handleSearchChange}
              />
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
                  {isAdmin && (
                    <Button
                      onClick={() => setBulkDeleteDocIds(selectedDocuments)}
                      variant="destructive"
                      className="gap-2"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete All
                    </Button>
                  )}
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
            <div className="overflow-hidden border border-border rounded-lg relative flex flex-col h-139">
              {isPending2 && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Searching...</p>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto overflow-y-auto flex-1">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow className="hover:bg-muted/50">
                      <TableHead className="w-12 text-center">
                        <Checkbox
                          checked={
                            paginatedDocuments.length > 0 &&
                            paginatedDocuments.every((d) => selectedDocuments.has(d.id))
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
                    {paginatedDocuments.map((doc) => (
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
                            {editingDocId === doc.id ? (
                              <Input
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                className="h-8"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <span
                                className={isAdmin ? "cursor-pointer hover:underline" : ""}
                                onClick={() => {
                                  if (isAdmin) {
                                    setEditingDocId(doc.id);
                                    setEditingTitle(doc.title);
                                    setEditingDescription(doc.description || "");
                                  }
                                }}
                              >
                                {doc.title}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs">
                          <div className="truncate">
                            {editingDocId === doc.id ? (
                              <Input
                                value={editingDescription}
                                onChange={(e) => setEditingDescription(e.target.value)}
                                placeholder="Add description..."
                                className="h-8"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <span
                                className={isAdmin ? "cursor-pointer hover:underline" : ""}
                                onClick={() => {
                                  if (isAdmin) {
                                    setEditingDocId(doc.id);
                                    setEditingTitle(doc.title);
                                    setEditingDescription(doc.description || "");
                                  }
                                }}
                              >
                                {doc.description || <span className="italic">No description</span>}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="secondary" className="font-mono">
                            {formatFileSize(doc.fileSize)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="cursor-help">{formatDate(doc.createdAt)}</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{formatFullDateTime(doc.createdAt)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end items-center">
                            {editingDocId === doc.id ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateDocument(doc.id)}
                                  className="gap-1"
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingDocId(null)}
                                  className="gap-1"
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleViewDocument(doc)}
                                  className="gap-1"
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDownload(doc.id)}
                                  className="gap-1"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                {isAdmin && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingDocId(doc.id);
                                        setEditingTitle(doc.title);
                                        setEditingDescription(doc.description || "");
                                      }}
                                      className="gap-1"
                                      title="Edit"
                                    >
                                      ✎
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setDeleteDocumentId(doc.id)}
                                      className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination Controls */}
              {(totalPages > 1 || filteredDocuments.length > 10) && (
                <div className="flex items-center justify-between px-6 py-4 border-t bg-background shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      {itemsPerPage === 0
                        ? `All ${filteredDocuments.length} results`
                        : `Page ${currentPage} of ${totalPages} (${filteredDocuments.length} total)`}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="outline" size="sm">
                          Results per page: {itemsPerPage === 0 ? "All" : itemsPerPage}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem
                          onClick={() => {
                            setItemsPerPage(10);
                            setCurrentPage(1);
                          }}
                        >
                          10 per page
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setItemsPerPage(25);
                            setCurrentPage(1);
                          }}
                        >
                          25 per page
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setItemsPerPage(50);
                            setCurrentPage(1);
                          }}
                        >
                          50 per page
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setItemsPerPage(0);
                            setCurrentPage(1);
                          }}
                        >
                          All
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex gap-2">
                    {itemsPerPage > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
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

            {/* Bulk Delete Confirmation Dialog */}
            <AlertDialog
              open={bulkDeleteDocIds !== null}
              onOpenChange={(open) => !open && setBulkDeleteDocIds(null)}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Documents</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {bulkDeleteDocIds?.size} document(s)? This
                    action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex gap-2 justify-end pt-2">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => bulkDeleteDocIds && handleBulkDelete(bulkDeleteDocIds)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete All
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
