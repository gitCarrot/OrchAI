'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface AIResponseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  response: string;
}

export function AIResponseDialog({ isOpen, onClose, response }: AIResponseDialogProps) {
  if (!response) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>AI 응답</DialogTitle>
          <DialogDescription>
            AI가 당신의 질문에 답변했습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          <div className="whitespace-pre-wrap text-sm">
            {response}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 

