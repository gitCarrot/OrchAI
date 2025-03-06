'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface ResponseModalProps {
  isOpen: boolean
  onClose: () => void
  isLoading: boolean
  response: string | null
  onAccept?: () => void
  onReject?: () => void
}

export function ResponseModal({
  isOpen,
  onClose,
  isLoading,
  response,
  onAccept,
  onReject
}: ResponseModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-32px)] sm:w-full sm:max-w-[500px] p-4 sm:p-6 gap-4">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg">AI Response</DialogTitle>
          <DialogDescription className="text-sm">
            Review the AI's suggestion and choose to accept or reject it.
          </DialogDescription>
        </DialogHeader>
        
        <div className="min-h-[100px] flex items-center justify-center py-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Processing your request...</span>
            </div>
          ) : (
            <div className="text-sm leading-6 break-words">{response}</div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onReject}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Reject
          </Button>
          <Button
            onClick={onAccept}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 