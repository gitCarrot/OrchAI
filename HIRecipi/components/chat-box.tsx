'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { useAI } from '@/hooks/use-ai';

export function ChatBox() {
  const [message, setMessage] = useState('');
  const { sendMessage, isLoading } = useAI();
  const { toast } = useToast();

  console.log('[ChatBox] Render with:', { message, isLoading });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[ChatBox] Form submitted with message:', message);
    
    if (!message.trim() || isLoading) {
      console.log('[ChatBox] Submission blocked:', { 
        emptyMessage: !message.trim(), 
        isLoading 
      });
      return;
    }

    try {
      console.log('[ChatBox] Sending message...');
      await sendMessage(message);
      console.log('[ChatBox] Message sent successfully');
      
      setMessage('');
      
      toast({
        title: "응답 수신",
        description: "AI의 응답이 도착했습니다.",
      });
    } catch (error) {
      console.error('[ChatBox] Error:', error);
      toast({
        variant: "destructive",
        title: "오류",
        description: "메시지 전송 중 오류가 발생했습니다.",
      });
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-[300px] bg-background rounded-lg shadow-lg border p-4 z-50">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="무엇이든 물어보세요..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading} size="sm">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            '전송'
          )}
        </Button>
      </form>
    </div>
  );
} 
