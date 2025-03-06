import { create } from "zustand";
import { useNavigationStore } from "@/store/navigation";
import { useUser } from "@clerk/nextjs";
import { useTranslations } from "./use-translations";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// Server response format
interface ChatResponse {
  type: "message" | "tool_approval" | "error";
  content?: string;
  tools?: Array<{
    id: string;
    name: string;
    [key: string]: any;
  }>;
  message?: string;
  responses?: Array<{
    type: string;
    content: string;
    current_state?: string;
    tool_info?: {
      name: string;
      args: any;
    };
  }>;
  complete?: boolean;
  thread_id?: string;
}

// Latest AI response type for frontend management
interface AIMessage {
  type: string;        // "message" | "system" | "thinking", ...
  content: string;     // AI output text
  current_state?: string; // Conversation state (e.g., 'recipe', 'assistant', etc.)
  isSystemMessage?: boolean; // System message flag
  tool_info?: {        // Tool information for thinking messages
    name: string;
    args: any;
  };
}

interface ToolDisplay {
  name: string;
  displayName: string;
  args: {
    [key: string]: any;
  };
}

interface AIStore {
  isLoading: boolean;
  latestResponse: AIMessage | null;     // 오직 가장 최근 AI 메시지
  error: string | null;

  // 도구 승인 관련
  pendingToolApproval: boolean;
  toolsToApprove: Array<any> | undefined;

  // 대화 스레드 ID
  threadId: string | null;
  
  // 응답 히스토리 (새로 추가)
  responseHistory: AIMessage[];

  // Actions
  setIsLoading: (loading: boolean) => void;
  setLatestResponse: (msg: AIMessage | null) => void;
  setError: (error: string | null) => void;
  setPendingToolApproval: (pending: boolean, tools?: Array<any>) => void;
  setThreadId: (threadId: string | null) => void;
  addToResponseHistory: (msg: AIMessage) => void;
  clearResponseHistory: () => void;
  resetConversation: () => void;
}

const useAIStore = create<AIStore>((set) => ({
  isLoading: false,
  latestResponse: null,
  error: null,
  pendingToolApproval: false,
  toolsToApprove: undefined,
  threadId: null,
  responseHistory: [],

  setIsLoading: (loading) => {
    set({ isLoading: loading });
  },
  setLatestResponse: (msg) => {
    set({ latestResponse: msg });
  },
  setError: (error) => {
    set({ error });
  },
  setPendingToolApproval: (pending, tools = undefined) => {
    set({
      pendingToolApproval: pending,
      toolsToApprove: tools,
    });
  },
  setThreadId: (threadId) => {
    set({ threadId });
  },
  addToResponseHistory: (msg) => {
    set((state) => ({
      responseHistory: [...state.responseHistory, msg]
    }));
  },
  clearResponseHistory: () => {
    set({ responseHistory: [] });
  },
  resetConversation: () => {
    // "새로운 대화 세션"을 시작하고 싶을 때 호출
    set({
      isLoading: false,
      latestResponse: null,
      error: null,
      pendingToolApproval: false,
      toolsToApprove: undefined,
      threadId: null,
      responseHistory: [],
    });
  },
}));

// Tool display utilities
export const toolUtils = {
  // Tool name localization
  displayNames: {
    create_recipe: "Create Recipe",
    update_recipe: "Update Recipe",
    delete_recipe: "Delete Recipe",
    create_refrigerator: "Create Refrigerator",
    add_refrigerator_multiple_categories: "Add Categories",
    add_refrigerator_single_category: "Add Category",
    update_refrigerator: "Update Refrigerator",
    delete_refrigerator: "Delete Refrigerator",
    add_ingredient: "Add Ingredient",
    update_ingredient: "Update Ingredient",
    delete_ingredient: "Delete Ingredient",
    toggle_favorite: "Toggle Favorite",
    share_recipe: "Share Recipe",
  } as const,

  // Argument name localization
  argNames: {
    name: "Name",
    title: "Title",
    content: "Content",
    description: "Description",
    categories: "Categories",
    type: "Type",
    isPublic: "Public",
    refrigeratorId: "Refrigerator",
    recipeId: "Recipe",
    categoryId: "Category",
    quantity: "Quantity",
    expiryDate: "Expiry Date",
  } as const,

  // Argument value formatting
  formatArgValue(key: string, value: any): string {
    if (value === null || value === undefined) return "";
    
    switch (key) {
      case "type":
        return value === "ai" ? "AI Generated" : "User Generated";
      case "isPublic":
        return value ? "Public" : "Private";
      case "categories":
        return Array.isArray(value) ? value.join(", ") : value;
      case "content":
        return typeof value === "string" && value.length > 100 
          ? `${value.slice(0, 100)}...` 
          : value;
      case "expiryDate":
        return new Date(value).toLocaleDateString();
      default:
        return String(value);
    }
  },

  // Tool information formatting
  formatTool(tool: any): ToolDisplay {
    // tool.args가 문자열이면 파싱, 객체면 그대로 사용
    const args = typeof tool.args === 'string' ? JSON.parse(tool.args) : (tool.args || {});
    return {
      name: tool.name,
      displayName: this.displayNames[tool.name as keyof typeof this.displayNames] || tool.name,
      args
    };
  }
};

/**
 * useAI 훅
 * - 단일 메시지(최신 AI 답변)만 관리
 * - 서버에는 thread_id로 컨텍스트를 유지
 */
export function useAI() {
  const { getCurrentContext } = useNavigationStore();
  const { user, isLoaded } = useUser();
  const { language } = useTranslations();
  const store = useAIStore();

  /**
   * 사용자 메시지를 서버로 전송하고, AI 응답(단일/최신)만 받아옴
   */
  const sendMessage = async (message: string) => {
    if (store.isLoading) return null;
    if (!isLoaded) {
      store.setError("Loading authentication information. Please try again later.");
      return null;
    }
    if (!user?.id) {
      store.setError("Login required for this feature.");
      return null;
    }

    store.setIsLoading(true);
    store.setError(null);
    store.setPendingToolApproval(false, undefined);
    store.clearResponseHistory(); // 새 메시지를 보낼 때 응답 히스토리 초기화

    try {
      const context = {
        ...getCurrentContext(),
        userId: user.id,
        userEmail: user.emailAddresses[0].emailAddress,
        userLanguage: language,
      };

      console.log("[useAI] Sending request to backend:", {
        url: `${BACKEND_URL}/api/chat`,
        message,
        context,
        threadId: store.threadId,
      });

      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_INTERNAL_API_KEY || "",
        },
        body: JSON.stringify({
          message,
          context,
          thread_id: store.threadId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        console.error("[useAI] API Error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(errorData.detail || "API request failed");
      }

      const data: ChatResponse = await response.json();
      console.log("[useAI] Received response:", data);

      // thread_id 갱신
      if (data.thread_id) {
        store.setThreadId(data.thread_id);
      }

      // 1) 도구 승인이 필요한 경우
      if (data.type === "tool_approval" && data.tools) {
        store.setPendingToolApproval(true, data.tools);
        return {
          type: "tool_approval",
          tools: data.tools,
          message: data.message,
        };
      }

      // 2) 일반 메시지
      if (data.type === "message") {
        // 모든 응답을 처리하고 마지막 응답을 최종 응답으로 설정
        const responses = data.responses || [];
        
        // 응답이 있는 경우
        if (responses.length > 0) {
          // 이전 대화 내용을 지우고 현재 질문에 대한 응답만 표시
          store.clearResponseHistory();
          
          // 마지막 응답만 처리 (가장 최신 응답)
          const lastResponse = responses[responses.length - 1];
          const aiMessage: AIMessage = {
            type: lastResponse.type,
            content: lastResponse.content,
            current_state: lastResponse.current_state,
            tool_info: lastResponse.tool_info
          };
          
          // 응답 히스토리에 추가하고 최신 응답으로 설정
          store.addToResponseHistory(aiMessage);
          store.setLatestResponse(aiMessage);
          
          return {
            type: "message",
            responses: [lastResponse],
            complete: data.complete,
          };
        }
        
        if (data.complete) {
          const completeMessage: AIMessage = {
            type: "message",
            content: "Request completed",
            isSystemMessage: true,
          };
          
          store.addToResponseHistory(completeMessage);
          store.setLatestResponse(completeMessage);
          
          return {
            type: "message",
            responses: [{
              type: "message",
              content: "Request completed",
            }],
            complete: true,
          };
        }
        
        store.setLatestResponse(null);
        return { type: "message", responses: [], complete: data.complete };
      }

      throw new Error(data.message || "Unknown error occurred.");
    } catch (error) {
      console.error("[useAI] Error:", error);
      const errMsg = error instanceof Error ? error.message : "Unknown error occurred.";
      store.setError(errMsg);
      return { type: "error", message: errMsg };
    } finally {
      store.setIsLoading(false);
    }
  };

  return {
    // 상태
    isLoading: store.isLoading,
    latestResponse: store.latestResponse,
    error: store.error,

    // 도구 승인
    pendingToolApproval: store.pendingToolApproval,
    toolsToApprove: store.toolsToApprove,

    // 스레드 ID
    threadId: store.threadId,
    
    // 응답 히스토리
    responseHistory: store.responseHistory,

    // 액션
    sendMessage,
    resetConversation: store.resetConversation,
    
    // 응답 히스토리 관련 액션
    addToResponseHistory: store.addToResponseHistory,
    clearResponseHistory: store.clearResponseHistory,

    // (추가적으로) setLatestResponse 직접 조작하고 싶다면
    setLatestResponse: store.setLatestResponse,
  };
}