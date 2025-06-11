import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { doc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";
import { Send, MessageSquareText } from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps): React.ReactElement {
  const [feedback, setFeedback] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const auth = getAuth();
  const user = auth.currentUser;

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) {
      alert("Feedback cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "feedback"), {
        userId: user?.uid || "anonymous",
        userEmail: user?.email || "anonymous",
        feedback: feedback.trim(),
        timestamp: serverTimestamp(),
      });
      alert("Thank you for your feedback!");
      setFeedback("");
      onClose();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-br from-green-50 via-white to-green-50">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-green-800 flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-green-600" /> Send Feedback
          </DialogTitle>
          <DialogDescription className="text-gray-500 mt-1">
            Report a bug, suggest a feature, or leave a general comment.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="feedback" className="sr-only">Your Feedback</Label>
            <Textarea
              id="feedback"
              rows={5}
              placeholder="Tell us what you think..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="border-green-200 resize-none"
              disabled={isSubmitting}
            />
          </div>
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={handleSubmitFeedback}
            disabled={isSubmitting}
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? "Sending..." : "Send Feedback"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 