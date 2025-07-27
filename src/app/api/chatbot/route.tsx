import { NextRequest, NextResponse } from "next/server";
import { getMCPTools } from "@/utils/mcp-client";

export const runtime = "edge";

interface GroqMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
}

interface GroqRequest {
  model: string;
  messages: GroqMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: any[];
  tool_choice?: "auto" | "none" | "required";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const { groqApiKey, groqModel = 'moonshotai/kimi-k2-instruct', messages } = body;
    
    if (!groqApiKey) {
      return NextResponse.json({ 
        error: "Groq API key is required. Please configure your API key in the settings."
      }, { status: 400 });
    }
    
    const filteredMessages = (messages ?? []).filter(
      (message: any) => message.role === "user" || message.role === "assistant"
    );
    
    const tools = await getMCPTools(groqApiKey);

    const groqMessages: GroqMessage[] = [
      {
        role: "system",
        content: `You are CodeWizard, an AI assistant specialized in helping developers with coding questions, debugging, and software development tasks.

When asked to find documentation, and you do not already know the library ID, follow this two-step process:
1.  First, use the 'mcp__context7__resolve-library-id' tool to find the exact Context7-compatible library ID for the requested library.
2.  Once you have the ID, use the 'mcp__context7__get-library-docs' tool with that ID to retrieve the documentation.

HOWEVER, if you are asked about any of the following libraries, use this library ID already, do not search for it:
- Groq: /context7/groq-console-docs
- OpenAI: /openai/openai-cookbook
- Anthropic: /llmstxt/anthropic-llms-full.txt
- Perplexity: /context7/perplexity_ai
- Vercel: /llmstxt/vercel_com-docs-llms.txt
- Next.js: /vercel/next.js
- React: /reactjs/react.dev
- Supabase: /llmstxt/supabase-llms.txt
- Prisma: /prisma/docs
- Clerk: /context7/clerk
- Stripe: /llmstxt/stripe-llms.txt
- Firebase: /llmstxt/firebase_google-llms.txt
- Tailwind CSS: /context7/tailwindcss
- MongoDB: /mongodb/docs
- Express: /expressjs/express

Go directly to step 2.

Always be helpful, concise, and provide practical solutions. When you use tools to gather information, always follow up with a helpful explanation or summary of what you found. Be informative and practical in your responses.`
      },
      ...filteredMessages.map((msg: any) => ({
        role: msg.role as "user" | "assistant",
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      }))
    ];

    const formattedTools = Object.entries(tools).map(([name, tool]: [string, any]) => ({
      type: 'function' as const,
      function: {
        name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    const groqRequest: GroqRequest = {
      model: groqModel,
      messages: groqMessages,
      max_tokens: 8000,
      temperature: 0.2,
      stream: true,
    };

    if (formattedTools.length > 0) {
      groqRequest.tools = formattedTools;
      groqRequest.tool_choice = "auto";
    }

    let currentMessages = groqMessages;
    const MAX_ITERATIONS = 5;

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        let toolExecutionSent = false;
        
        const processIteration = async (iteration: number) => {
          try {
            const requestBody = { ...groqRequest, messages: currentMessages, stream: false };
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${groqApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
              const errorText = await response.text();
              
              let errorMessage = `Groq API error: ${response.status}`;
              try {
                const errorData = JSON.parse(errorText);
                if (errorData.error?.message) {
                  errorMessage = errorData.error.message;
                }
              } catch (e) {
                if (errorText) errorMessage = errorText;
              }
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
              controller.close();
              return;
            }

            const responseBody = await response.json();
            const choice = responseBody.choices[0];
            const message = choice.message;
            currentMessages.push(message);

            if (message.content && message.content.trim()) {
              const words = message.content.split(' ');
              for (let i = 0; i < words.length; i++) {
                const chunk = `data: ${JSON.stringify({ 
                  choices: [{ 
                    delta: { content: i === 0 ? words[i] : ' ' + words[i] } 
                  }] 
                })}\n\n`;
                controller.enqueue(encoder.encode(chunk));
              }
            }

            if (choice.finish_reason === 'tool_calls' && message.tool_calls) {
              if (!toolExecutionSent) {
                const toolInfo = message.tool_calls.map((tc: any) => {
                  const args = JSON.parse(tc.function.arguments);
                  const cleanToolName = tc.function.name.replace('mcp__context7__', '');
                  return { name: cleanToolName, args };
                });
                
                const toolChunk = `data: ${JSON.stringify({ 
                  choices: [{ 
                    delta: { 
                      tool_execution: toolInfo 
                    } 
                  }] 
                })}\n\n`;
                controller.enqueue(encoder.encode(toolChunk));
                toolExecutionSent = true;
              }
              
              const toolResults = [];
              for (const toolCall of message.tool_calls) {
                const toolName = toolCall.function.name;
                const toolArgs = JSON.parse(toolCall.function.arguments);

                if (tools[toolName]) {
                  try {
                    const toolResult = await tools[toolName].execute(toolArgs);
                    const cleanToolName = toolName.replace('mcp__context7__', '');
                    const resultContent = toolResult?.documentation || JSON.stringify(toolResult, null, 2);
                    
                    const toolResultChunk = `data: ${JSON.stringify({ 
                      choices: [{ 
                        delta: { 
                          tool_result: {
                            name: cleanToolName,
                            content: resultContent
                          }
                        } 
                      }] 
                    })}\n\n`;
                    controller.enqueue(encoder.encode(toolResultChunk));
                    
                    toolResults.push({
                      tool_call_id: toolCall.id,
                      role: 'tool',
                      name: toolName,
                      content: JSON.stringify(toolResult),
                    });
                  } catch (error: any) {
                    // Stream the tool error
                    const cleanToolName = toolName.replace('mcp__context7__', '');
                    const toolErrorChunk = `data: ${JSON.stringify({ 
                      choices: [{ 
                        delta: { 
                          tool_result: {
                            name: cleanToolName,
                            content: `Error: ${error.message}`,
                            error: true
                          }
                        } 
                      }] 
                    })}\n\n`;
                    controller.enqueue(encoder.encode(toolErrorChunk));
                    
                    toolResults.push({
                      tool_call_id: toolCall.id,
                      role: 'tool',
                      name: toolName,
                      content: JSON.stringify({ error: error.message }),
                    });
                  }
                }
              }
              currentMessages.push(...toolResults as GroqMessage[]);

              // Continue to next iteration
              if (iteration < MAX_ITERATIONS - 1) {
                await processIteration(iteration + 1);
              } else {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Max tool call iterations reached" })}\n\n`));
                controller.close();
              }
            } else {
              // Response complete - content already streamed above
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              return;
            }
          } catch (error: any) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
            controller.close();
          }
        };

        processIteration(0);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (e: any) {
    return NextResponse.json({ 
      error: e.message
    }, { status: 500 });
  }
}