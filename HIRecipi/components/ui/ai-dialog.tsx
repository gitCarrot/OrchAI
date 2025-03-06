'use client';

import { useEffect } from 'react';
import { useAI } from '@/hooks/use-ai';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AIDialog() {
  const { response, isDialogOpen, setIsDialogOpen } = useAI();

  console.log('[AIDialog] Render with:', { 
    response, 
    isDialogOpen,
    hasResponse: !!response 
  });

  useEffect(() => {
    console.log('[AIDialog] Response or dialog state changed:', {
      response,
      isDialogOpen
    });
  }, [response, isDialogOpen]);

  // Dialog는 항상 렌더링하되, open 상태로 제어
  return (
    <Dialog 
      open={isDialogOpen && !!response} 
      onOpenChange={(open) => {
        console.log('[AIDialog] Dialog open state changing to:', open);
        setIsDialogOpen(open);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI 응답</DialogTitle>
        </DialogHeader>
        <div className="mt-4 whitespace-pre-wrap">{response}</div>
      </DialogContent>
    </Dialog>
  );
} 