import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, X, Calendar } from "lucide-react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

interface Drawing {
  id: string;
  prompt: string;
  imageBase64: string;
  createdAt?: { toDate: () => Date };
}

interface PromptSubmissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  submissions: Drawing[];
  onDelete: (id: string) => void;
}

export default function PromptSubmissionsModal({
  isOpen,
  onClose,
  prompt,
  submissions,
  onDelete,
}: PromptSubmissionsModalProps): React.ReactElement {
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this submission?")) return;
    try {
      await deleteDoc(doc(db, "drawings", id));
      onDelete(id);
    } catch (error) {
      console.error("Error deleting submission:", error);
      alert("Failed to delete submission. Please try again.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col bg-gradient-to-br from-green-50 via-white to-green-50 [&>button]:hidden">
        <DialogHeader className="pb-2 border-b border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-semibold text-green-800 flex items-center gap-2">
                Submissions for "{prompt}"
              </DialogTitle>
              <DialogDescription className="text-gray-500 mt-1">
                {submissions.length} {submissions.length === 1 ? 'submission' : 'submissions'} total
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-green-100"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-6 px-1">
          {submissions.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="group relative bg-white rounded-xl shadow-sm border border-green-100 overflow-hidden transition-all hover:shadow-md"
                >
                  <div className="aspect-square relative">
                    <img
                      src={submission.imageBase64}
                      alt={`Submission for ${prompt}`}
                      className="w-full h-full object-contain p-2"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 shadow-lg"
                        onClick={() => handleDelete(submission.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  {submission.createdAt && (
                    <div className="px-3 py-2 bg-green-50/50 border-t border-green-100 flex items-center gap-1.5 text-xs text-gray-600">
                      <Calendar className="h-3.5 w-3.5" />
                      {submission.createdAt.toDate().toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No submissions yet</h3>
              <p className="text-gray-500 max-w-sm">
                This prompt hasn't received any submissions yet. Share the dataset to start collecting drawings.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 