'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useAI } from "@/hooks/use-ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Check, X, Minimize2, Maximize2, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useRefrigeratorStore } from "@/store/refrigerator";
import { useRecipeStore } from "@/store/recipe";
import { toolUtils } from "@/hooks/use-ai";

export function ChatBox() {
  const [message, setMessage] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatHeight, setChatHeight] = useState(200);
  const [isMounted, setIsMounted] = useState(false);
  const [toolStatus, setToolStatus] = useState<{
    isExecuting: boolean;
    name: string;
    startTime: number;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const {
    isLoading,
    latestResponse,
    error,
    pendingToolApproval,
    toolsToApprove,
    sendMessage,
    resetConversation,
    responseHistory,
  } = useAI();

  const router = useRouter();

  // Calculate execution time
  const getExecutionTime = useCallback(() => {
    if (!toolStatus?.startTime) return "";
    const seconds = Math.floor((Date.now() - toolStatus.startTime) / 1000);
    return `${seconds}s`;
  }, [toolStatus?.startTime]);

  // Check if component is mounted
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Dynamically adjust chat window height
  useEffect(() => {
    if (contentRef.current && isChatOpen) {
      const contentHeight = contentRef.current.scrollHeight;
      const headerHeight = 52;
      const inputHeight = 64;
      const padding = 32;

      const newHeight = Math.min(
        Math.max(contentHeight + headerHeight + inputHeight + padding, 200),
        600
      );
      setChatHeight(newHeight);
    } else {
      setChatHeight(116); // minimum height
    }
  }, [latestResponse, pendingToolApproval, isChatOpen, error]);

  // Don't render anything during server-side rendering
  if (!isMounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    try {
      const userMsg = message.trim();
      setMessage("");

      // 새 대화를 시작하려면 이 시점에서 resetConversation()을 호출
      // resetConversation(); // (원하는 경우)

      const response = await sendMessage(userMsg);
      console.log("[ChatBox] sendMessage response:", response);
      // response?.type === "tool_approval"일 땐 승인/거부 UI가 뜸
      // response?.type === "message"면 latestResponse가 업데이트됨
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleToolResponse = async (approve: boolean) => {
    if (isLoading) return;

    try {
      const currentTool = toolsToApprove?.[0];
      if (!currentTool) return;

      // 임시로 "승인/거부" 안내 문구를 보여주고 싶다면:
      // -> useAI() 훅에 따로 latestResponse를 덮어쓰는 등 가능
      if (approve) {
        setToolStatus({
          isExecuting: true,
          name: currentTool.name,
          startTime: Date.now(),
        });
      }

      const serverResponse = await sendMessage(approve ? "y" : "n");
      console.log("[handleToolResponse] Server response:", serverResponse);

      // 필요하다면, 냉장고/레시피 로컬 스토어 갱신
      if (serverResponse?.type === "message" && serverResponse.complete) {
        const toolName = currentTool.name || "";
        if (approve && toolName) {
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const toolNameLower = toolName.toLowerCase();
          const pathname = window.location.pathname;

          if (
            toolNameLower.includes("create_refrigerator") ||
            toolNameLower.includes("update_refrigerator") ||
            toolNameLower.includes("delete_refrigerator")
          ) {
            if (pathname === "/refrigerators") {
              await useRefrigeratorStore.getState().refreshList();
            }
          } else if (
            toolNameLower.includes("create_recipe") ||
            toolNameLower.includes("update_recipe") ||
            toolNameLower.includes("delete_recipe")
          ) {
            if (pathname === "/recipes") {
              await useRecipeStore.getState().refreshList();
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to handle tool response:", error);
      setToolStatus(null);
    } finally {
      // 승인/거부 로직이 끝났으니 toolStatus 해제
      // (에러든 성공이든 무조건 끝났다고 가정)
      setToolStatus(null);
    }
  };

  const toggleChat = () => {
    setIsChatOpen((prev) => !prev);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 w-[400px] bg-background border rounded-2xl shadow-lg transition-all duration-300 z-50",
        isLoading &&
          "p-[1px] before:absolute before:inset-0 before:rounded-2xl before:content-[''] before:bg-gradient-to-r before:from-pink-500 before:via-purple-500 before:to-blue-500 before:animate-border"
      )}
      style={{ height: `${chatHeight}px` }}
    >
      <div
        className={cn(
          "relative w-full h-full bg-background rounded-2xl flex flex-col overflow-hidden",
          isLoading && "animate-pulse"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-[52px] border-b">
          <span className="text-sm font-medium">AI Assistant</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleChat}
            className="h-8 w-8 rounded-full hover:bg-accent"
          >
            {isChatOpen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>

        {/* Chat content */}
        <div
          ref={scrollRef}
          className={cn(
            "flex-1 overflow-y-auto transition-all duration-300",
            isChatOpen ? "opacity-100" : "opacity-0 h-0 absolute"
          )}
        >
          <div ref={contentRef} className="p-4 space-y-4">
            {/* Display approval/reject UI if tool approval is pending */}
            {pendingToolApproval && toolsToApprove && (
              <div className="flex flex-col gap-3 bg-muted/50 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm font-medium">Would you like to execute the following task?</p>
                </div>
                
                {toolsToApprove.map((tool) => {
                  const formattedTool = toolUtils.formatTool(tool);
                  
                  return (
                    <div 
                      key={tool.id} 
                      className="bg-background rounded-lg p-3 border border-border"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-primary">
                          {formattedTool.displayName}
                        </span>
                      </div>
                      
                      {Object.entries(formattedTool.args).length > 0 && (
                        <div className="space-y-1.5">
                          {Object.entries(formattedTool.args).map(([key, value]) => {
                            const displayKey = toolUtils.argNames[key as keyof typeof toolUtils.argNames] || key;
                            const displayValue = toolUtils.formatArgValue(key, value);
                            
                            if (!displayValue) return null;
                            
                            return (
                              <div 
                                key={key} 
                                className="flex items-start gap-2 text-sm"
                              >
                                <span className="text-muted-foreground min-w-[80px]">
                                  {displayKey}
                                </span>
                                <span className="text-foreground break-words">
                                  {displayValue}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="w-full"
                    onClick={() => handleToolResponse(true)}
                    disabled={isLoading}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleToolResponse(false)}
                    disabled={isLoading}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            )}

            {/* AI response history */}
            {!pendingToolApproval && responseHistory?.length > 0 && (
              <div className="space-y-4">
                {responseHistory.map((response, index) => (
                  <div key={index} className="flex justify-start">
                    <div className={cn(
                      "bg-muted rounded-xl p-4 max-w-[100%]",
                      response.isSystemMessage && "border border-blue-200 bg-blue-50",
                      response.type === "thinking" && "border border-yellow-200 bg-yellow-50"
                    )}>
                      {response.type === "thinking" ? (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
                            <p className="text-sm font-medium text-yellow-700">AI 사고 과정</p>
                          </div>
                          <p className="text-sm m-0 whitespace-pre-wrap text-yellow-700">{response.content}</p>
                        </>
                      ) : (
                        <p className="text-sm m-0 whitespace-pre-wrap">{response.content}</p>
                      )}
                      {response.current_state && !response.isSystemMessage && (
                        <p className="text-xs text-muted-foreground mt-2 mb-0">
                          Current State: {response.current_state}
                        </p>
                      )}
                      {response.isSystemMessage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRefresh}
                          className="mt-2 w-full"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh Page
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tool execution status */}
            {toolStatus && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {toolStatus.name} executing... ({getExecutionTime()})
                </span>
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && !pendingToolApproval && (
              <div className="flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="text-xs text-destructive bg-destructive/10 rounded-xl p-4">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Input form */}
        <div
          className={cn(
            "border-t p-3",
            !isChatOpen && "absolute bottom-0 left-0 right-0 bg-background"
          )}
        >
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message..."
              className="text-sm h-9 rounded-xl"
              disabled={isLoading || pendingToolApproval}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button
              type="submit"
              size="sm"
              className="h-9 px-3 rounded-xl"
              disabled={isLoading || pendingToolApproval || !message.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}