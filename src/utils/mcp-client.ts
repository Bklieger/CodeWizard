interface MCPTool {
  name: string;
  description?: string;
  inputSchema: any;
}

interface MCPClient {
  listTools(): Promise<{ tools: MCPTool[] }>;
  callTool(params: { name: string; arguments?: any }): Promise<{ content: any }>;
}

// Context7-like functionality using Context7 MCP API
async function findLibraryId(libraryName: string): Promise<any> {
  try {
    const requestBody = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "resolve-library-id", // Keep original name for MCP server
        arguments: {
          libraryName
        }
      }
    };

    const bodyString = JSON.stringify(requestBody);


    const response = await fetch('https://mcp.context7.com/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: bodyString,
    });

    if (!response.ok) {
      throw new Error(`Context7 API error: ${response.status} ${response.statusText}`);
    }

    // Parse SSE response
    const responseText = await response.text();
    const lines = responseText.split('\n');
    let jsonData = '';
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        jsonData = line.substring(6);
        break;
      }
    }

    if (!jsonData) {
      throw new Error('No data found in SSE response');
    }

    const result = JSON.parse(jsonData);
    
    if (result.error) {
      throw new Error(`Context7 API error: ${result.error.message}`);
    }

    const libraryData = result.result?.content || {};
    return libraryData;
  } catch (error) {
    throw error;
  }
}

async function fetchDocumentation(context7CompatibleLibraryID: string, options: { topic?: string } = {}): Promise<any> {
  try {
    const { topic } = options;
    
    // Use the Context7 MCP HTTP endpoint
    const requestBody = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "get-library-docs", // Keep original name for MCP server
        arguments: {
          context7CompatibleLibraryID,
          ...(topic && { topic }),
          tokens: 10000
        }
      }
    };

    const bodyString = JSON.stringify(requestBody);

    const response = await fetch('https://mcp.context7.com/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: bodyString,
    });

    if (!response.ok) {
      throw new Error(`Context7 API error: ${response.status} ${response.statusText}`);
    }

    // Parse SSE response
    const responseText = await response.text();
    const lines = responseText.split('\n');
    let jsonData = '';
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        jsonData = line.substring(6);
        break;
      }
    }

    if (!jsonData) {
      throw new Error('No data found in SSE response');
    }

    const result = JSON.parse(jsonData);
    
    if (result.error) {
      throw new Error(`Context7 API error: ${result.error.message}`);
    }

    // Handle different response formats - could be string or array of content objects
    let documentation = '';
    const resultContent = result.result?.content;
    
    if (typeof resultContent === 'string') {
      documentation = resultContent;
    } else if (Array.isArray(resultContent)) {
      // Extract text from content array (Context7 format)
      documentation = resultContent
        .map(item => item.text || item.content || '')
        .join('\n');
    } else if (resultContent && typeof resultContent === 'object') {
      documentation = JSON.stringify(resultContent);
    } else {
      documentation = String(resultContent || '');
    }
    
    // truncate documentation to 5000 characters, put (truncated) at the end
    const truncatedDocumentation = documentation.length > 10000 
      ? documentation.substring(0, 10000) + ' (truncated)'
      : documentation;
    
    const finalResult = {
      libraryId: context7CompatibleLibraryID,
      documentation: truncatedDocumentation,
      codeSnippets: typeof truncatedDocumentation === 'string' ? truncatedDocumentation.split('```').length - 1 : 0,
      topic: topic || 'general'
    };
    
    return finalResult;
  } catch (error) {
    throw error;
  }
}

// Simple MCP client implementation using Context7 API
export async function createMCPClient(groqApiKey?: string): Promise<MCPClient | null> {
  try {
    if (!groqApiKey) {
      return null;
    }

    // Hard coded tools for Context7, to be changed later as Vercel AI SDK supports MCP
    const mcpClient: MCPClient = {
      async listTools(): Promise<{ tools: MCPTool[] }> {
        return {
          tools: [
            {
              name: 'mcp__context7__find-library-id',
              description: 'Step 1: Finds a Context7-compatible library ID for a given library name. Use this to find the ID before fetching docs.',
              inputSchema: {
                type: 'object',
                properties: {
                  libraryName: {
                    type: 'string',
                    description: 'Library name to search for and retrieve a Context7-compatible library ID.'
                  }
                },
                required: ['libraryName']
              }
            },
            {
              name: 'mcp__context7__fetch-documentation',
              description: 'Step 2: Fetches up-to-date documentation for a library given its Context7-compatible ID. IMPORTANT: You must use `mcp__context7__find-library-id` first to get the `context7CompatibleLibraryID`.',
              inputSchema: {
                type: 'object',
                properties: {
                  context7CompatibleLibraryID: {
                    type: 'string',
                    description: 'Exact Context7-compatible library ID (e.g., \'/mongodb/docs\', \'/vercel/next.js\')'
                  },
                  tokens: {
                    type: 'number',
                    description: 'Maximum number of tokens of documentation to retrieve (default: 10000)'
                  },
                  topic: {
                    type: 'string',
                    description: 'Topic to focus documentation on (e.g., \'hooks\', \'routing\')'
                  }
                },
                required: ['context7CompatibleLibraryID']
              }
            }
          ]
        };
      },

      async callTool(params: { name: string; arguments?: any }): Promise<{ content: any }> {
        const { name, arguments: args } = params;
        
        switch (name) {
          case 'mcp__context7__find-library-id':
            const resolveResult = await findLibraryId(args.libraryName);
            return { content: resolveResult };
            
          case 'mcp__context7__fetch-documentation':
            const docsResult = await fetchDocumentation(
              args.context7CompatibleLibraryID,
              { topic: args.topic }
            );
            return { content: docsResult };
            
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      },
    };

    return mcpClient;
  } catch (error) {
    return null;
  }
}

export async function getMCPTools(groqApiKey?: string): Promise<Record<string, any>> {
  try {
    const client = await createMCPClient(groqApiKey);
    
    if (!client) {
      return {};
    }
    
    // List available tools from MCP server
    const toolsResult = await client.listTools();
    
    // Convert MCP tools to the format expected by our chat API
    const tools: Record<string, any> = {};
    
    for (const tool of toolsResult.tools) {
      tools[tool.name] = {
        description: tool.description || '',
        parameters: tool.inputSchema,
        execute: async (args: any) => {
          const result = await client.callTool({
            name: tool.name,
            arguments: args
          });
          return result.content;
        }
      };
    }
    
    return tools;
  } catch (error) {
    return {};
  }
}