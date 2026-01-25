"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useState as useStateReact } from "react";

interface PdfViewerDialogProps {
  isOpen: boolean;
  bookId: string;
  bookTitle: string;
  onOpenChange: (open: boolean) => void;
}

export function PdfViewerDialog({ isOpen, bookId, bookTitle, onOpenChange }: PdfViewerDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const handleDownload = () => {
    window.location.href = `/api/documents/${bookId}/pdf`;
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const fetchPdfUrl = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get the book metadata to construct the PDF URL
        const response = await fetch(`/api/documents/${bookId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch document");
        }

        const book = await response.json();

        // Set up the PDF URL for viewing via PDF.js or iframe
        setPdfUrl(`/api/documents/${bookId}/pdf`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load PDF");
      } finally {
        setLoading(false);
      }
    };

    fetchPdfUrl();
  }, [isOpen, bookId]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-none h-[90vh] flex flex-col overflow-hidden p-0"
        style={{ maxWidth: "95vw" }}
      >
        <DialogHeader className="shrink-0 px-6 py-4 border-b flex flex-row items-center justify-between pr-14">
          <DialogTitle>{bookTitle}</DialogTitle>
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={loading || error !== null}
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
        </DialogHeader>
        <div className="flex-1 overflow-hidden bg-gray-100">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Spinner />
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded text-center max-w-md">
                {error}
              </div>
            </div>
          )}

          {pdfUrl && !loading && !error && (
            <div className="w-full h-full flex flex-col">
              <iframe
                src={`${pdfUrl}#page=${pageNumber}`}
                className="flex-1 w-full border-0"
                title={`${bookTitle} PDF Viewer`}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
