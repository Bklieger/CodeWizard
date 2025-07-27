"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Form from "@/components/form";
import Message from "@/components/message";
import cx from "@/utils/cx";
import MessageLoading from "@/components/message-loading";
import { SettingsModal, SettingsButton } from "@/components/settings-modal";
import { INITIAL_QUESTIONS } from "@/utils/const";
import CodeWizardLogo from "@/components/logo";
import Header from "@/components/header";

interface MessageProps {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  parts?: Array<{ type: "text"; text: string }>;
  isToolExecution?: boolean;
  toolInfo?: any;
}

interface GroqConfig {
  apiKey: string;
  model: string;
}

export default function Home() {
  const formRef = useRef<HTMLFormElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [streaming, setStreaming] = useState<boolean>(false);
  const [input, setInput] = useState<string>("");
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [shuffledQuestions, setShuffledQuestions] = useState<typeof INITIAL_QUESTIONS>(INITIAL_QUESTIONS);
  const [groqConfig, setGroqConfig] = useState<GroqConfig>({
    apiKey: "",
    model: "moonshotai/kimi-k2-instruct"
  });

  // Shuffle questions after hydration (client-side only)
  useEffect(() => {
    const shuffled = [...INITIAL_QUESTIONS].sort(() => Math.random() - 0.5);
    setShuffledQuestions(shuffled);
  }, []);

  // Load config from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('groq-config');
    if (savedConfig) {
      try {
        setGroqConfig(JSON.parse(savedConfig));
      } catch (error) {
        // Failed to parse saved config
      }
    }
  }, []);

  // Save config to localStorage whenever it changes
  const handleConfigSave = useCallback((config: GroqConfig) => {
    setGroqConfig(config);
    localStorage.setItem('groq-config', JSON.stringify(config));
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!groqConfig.apiKey || !content.trim()) return;

    const userMessage: MessageProps = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      parts: [{ type: "text", text: content.trim() }]
    };

    // Clear previous messages and start fresh with only the new user message
    const freshMessages = [userMessage];
    setMessages(freshMessages);
    setStreaming(true);
    setError("");

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groqApiKey: groqConfig.apiKey,
          groqModel: groqConfig.model,
          messages: freshMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      setMessages(freshMessages);

      let currentAssistantMessage: MessageProps | null = null;
      let accumulatedContent = "";
      let hasError = false;
      const decoder = new TextDecoder();

      while (true && !hasError) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (hasError) break;
          if (line.trim() === '') continue;
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.error) {
                setError(parsed.error);
                setStreaming(false);
                hasError = true;
                break;
              }
              
              const delta = parsed.choices?.[0]?.delta;
              
              if (delta?.tool_execution) {
                const toolMessage: MessageProps = {
                  id: Date.now().toString() + Math.random(),
                  role: "assistant",
                  content: "",
                  parts: [{ type: "text", text: "" }],
                  isToolExecution: true,
                  toolInfo: delta.tool_execution
                };
                
                setMessages(prev => [...prev, toolMessage]);
                // Reset current assistant message so next content creates new message
                currentAssistantMessage = null;
              } else if (delta?.tool_result) {
                // Update the latest tool execution message with the result
                const toolResult = delta.tool_result;
                setMessages(prev => 
                  prev.map(msg => {
                    if (msg.isToolExecution && msg.toolInfo) {
                      // Find the matching tool and add the result
                      const updatedToolInfo = msg.toolInfo.map((tool: any) => 
                        tool.name === toolResult.name 
                          ? { ...tool, result: toolResult.content, error: toolResult.error }
                          : tool
                      );
                      return { ...msg, toolInfo: updatedToolInfo };
                    }
                    return msg;
                  })
                );
                // Reset current assistant message so next content creates new message
                currentAssistantMessage = null;
              } else if (delta?.content) {
                // Handle regular content streaming - create new assistant message if needed
                if (!currentAssistantMessage) {
                  currentAssistantMessage = {
                    id: Date.now().toString() + Math.random(),
                    role: "assistant",
                    content: "",
                    parts: [{ type: "text", text: "" }]
                  };
                  setMessages(prev => [...prev, currentAssistantMessage!]);
                  accumulatedContent = "";
                }
                
                accumulatedContent += delta.content;
                const messageId = currentAssistantMessage.id;
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === messageId 
                      ? { 
                          ...msg, 
                          content: accumulatedContent, 
                          parts: [{ type: "text", text: accumulatedContent }]
                        }
                      : msg
                  )
                );
              }
            } catch (e) {
              // Failed to parse streaming chunk
            }
          }
        }
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred while chatting');
    } finally {
      setStreaming(false);
    }
  }, [groqConfig]);

  const onClickQuestion = (value: string) => {
    setInput(value);
    setTimeout(() => {
      formRef.current?.dispatchEvent(
        new Event("submit", {
          cancelable: true,
          bubbles: true,
        }),
      );
    }, 1);
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView();
    }
  }, [messages]);

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!groqConfig.apiKey) {
        setIsSettingsOpen(true);
        return;
      }
      if (input.trim()) {
        sendMessage(input);
        setInput("");
      }
    },
    [sendMessage, input, groqConfig],
  );

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setInput("");
    setError("");
  }, []);

  return (
    <div className="min-h-screen bg-stone-100">
      <Header 
        onNewChat={handleNewChat}
      />
      <main className="relative max-w-3xl p-4 md:p-6 mx-auto flex min-h-[calc(100vh-4rem)] !pb-32 md:!pb-40 overflow-y-auto">
        <div className="w-full">
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="mb-4 flex items-start gap-4 p-4 md:p-5 rounded-2xl w-full max-w-full overflow-hidden bg-blue-50 border border-blue-600">
            <div className="flex items-center justify-center shrink-0 rounded-full size-8">
              <CodeWizardLogo height={32} />
            </div>
            <div className="py-1.5 md:py-1 space-y-4 flex-1 min-w-0">
              <h1 className="text-xl font-medium text-slate-800 mb-[-16px]">Welcome to CodeWizard</h1>
              <p className="text-base text-slate-700">Your AI coding assistant ready to help with programming questions and tasks.</p>
            </div>
          </div>
        )}
        
        {messages.map((message: MessageProps) => {
          return <Message key={message.id} {...message} />;
        })}

        {/* loading */}
        {streaming && <MessageLoading />}

        {/* error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <button
                  onClick={() => setError("")}
                  className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

       {/* description section */}
       {messages.length === 0 && (
          <div className="mt-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 text-base text-slate-600">
              <p>
                Meet <span className="font-semibold text-blue-800">CodeWizard</span>, a lightning fast AI coding assistant with up-to-date knowledge of every major coding library and framework - about 30,000 of them!
              </p>
              
              <p>
                Using <span className="font-semibold text-blue-800">Kimi K2</span> on <a href="https://groq.com" target="_blank" className="text-blue-600 hover:text-blue-800 font-medium">Groq</a> but easy to switch out to ANY OpenAI compatible model endpoint!, <span className="font-semibold text-blue-800">MCP</span> connection to Context7 by <a href="https://upstash.com" target="_blank" className="text-blue-600 hover:text-blue-800 font-medium">Upstash</a>, and Next.js on <a href="https://vercel.com" target="_blank" className="text-blue-600 hover:text-blue-800 font-medium">Vercel</a>!
              </p>
              
              <p>
                Open source, <span className="font-semibold text-blue-800">MIT licensed</span>, and hosted for you to try for free. <a href="https://github.com/bklieger/CodeWizard" target="_blank" className="text-blue-600 hover:text-blue-800 font-medium underline">GitHub link</a>
              </p>
            </div>
          </div>
        )}

        {/* initial question */}
        {messages.length === 0 && (
          <div className="mt-4 md:mt-6 grid md:grid-cols-2 gap-2 md:gap-4">
            {shuffledQuestions.map((message, index) => {
              // Responsive visibility: sm=3, md=4, lg=6
              let visibilityClass = "";
              if (index >= 3 && index < 4) {
                visibilityClass = "hidden md:block"; // Show only on md+ (4th question)
              } else if (index >= 4 && index < 6) {
                visibilityClass = "hidden lg:block"; // Show only on lg+ (5th and 6th questions)
              } else if (index >= 6) {
                visibilityClass = "hidden"; // Hide questions 7 and 8 completely
              }
              
              return (
                <button
                  key={message.content}
                  type="button"
                  className={`cursor-pointer select-none text-left bg-white font-normal
                  border border-gray-200 rounded-xl p-3 md:px-4 md:py-3 text-base
                  hover:bg-stone-200 hover:border-stone-300 ${visibilityClass}`}
                  onClick={() => onClickQuestion(message.content)}
                >
                  {message.content}
                </button>
              );
            })}
          </div>
        )}

 

        {/* bottom ref */}
        <div ref={messagesEndRef} />
      </div>

      <div
        className={cx(
          "fixed z-10 bottom-0 inset-x-0",
          "flex justify-center items-center",
          "bg-stone-100",
        )}
      >
        <span
          className="absolute bottom-full h-10 inset-x-0 from-stone-100/0
         bg-gradient-to-b to-stone-100 pointer-events-none"
        />

        <div className="w-full max-w-3xl rounded-xl px-4 md:px-5 py-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1">
              <Form
                ref={formRef}
                onSubmit={onSubmit}
                inputProps={{
                  disabled: streaming,
                  value: input,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value),
                  placeholder: groqConfig.apiKey ? "Your question..." : "Configure Groq settings first...",
                }}
                buttonProps={{
                  disabled: streaming || !groqConfig.apiKey,
                }}
              />
            </div>
            <SettingsButton onClick={() => setIsSettingsOpen(true)} />
          </div>

          <p className="mt-4 text-xs md:text-sm text-gray-600 text-center">
            Verify results before making decisions.
          </p>
        </div>
      </div>
      
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleConfigSave}
        currentConfig={groqConfig}
      />
      </main>
    </div>
  );
}
