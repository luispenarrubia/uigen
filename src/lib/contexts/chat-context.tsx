"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
} from "react";
import { useChat as useAIChat } from "@ai-sdk/react";
import { Message } from "ai";
import { useFileSystem } from "./file-system-context";
import { setHasAnonWork } from "@/lib/anon-work-tracker";

interface ChatContextProps {
  projectId?: string;
  initialMessages?: Message[];
}

interface ChatContextType {
  messages: Message[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  status: string;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({
  children,
  projectId,
  initialMessages = [],
}: ChatContextProps & { children: ReactNode }) {
  const { fileSystem, handleToolCall } = useFileSystem();
  const [localInput, setLocalInput] = useState("");

  const chatResult = useAIChat({
    api: "/api/chat",
    initialMessages,
    fetch: async (input, init) => {
      const body = JSON.parse(init?.body as string || '{}');
      const enhancedBody = {
        ...body,
        files: fileSystem.serialize(),
        projectId,
      };

      console.log('Custom fetch - enhanced body:', {
        hasFiles: !!enhancedBody.files,
        filesKeys: enhancedBody.files ? Object.keys(enhancedBody.files) : [],
        hasProjectId: !!enhancedBody.projectId,
      });

      return fetch(input, {
        ...init,
        body: JSON.stringify(enhancedBody),
      });
    },
    onToolCall: ({ toolCall }) => {
      handleToolCall(toolCall);
    },
  });

  const {
    messages,
    sendMessage,
    status,
  } = chatResult;

  const customHandleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalInput(e.target.value);
  };

  // Track anonymous work
  useEffect(() => {
    if (!projectId && messages.length > 0) {
      setHasAnonWork(messages, fileSystem.serialize());
    }
  }, [messages, fileSystem, projectId]);

  const customHandleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!localInput.trim() || !sendMessage) return;

    const message = localInput;
    setLocalInput(""); // Clear input immediately

    await sendMessage({
      role: "user",
      content: message,
    });
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        input: localInput,
        handleInputChange: customHandleInputChange,
        handleSubmit: customHandleSubmit,
        status,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}