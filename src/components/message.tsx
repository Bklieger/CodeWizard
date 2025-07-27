import React, { useState } from "react";
import Markdown from "markdown-to-jsx";
import cx from "@/utils/cx";
import CodeWizardLogo from "@/components/logo";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageProps {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  parts?: Array<{ type: "text"; text: string }>;
  isToolExecution?: boolean;
  toolInfo?: any;
}

const Message: React.FC<MessageProps> = ({ role, parts, content, isToolExecution, toolInfo }) => {
  const isUser = role === "user";
  const [expandedTools, setExpandedTools] = useState<Set<number>>(new Set());

  const toggleToolExpansion = (index: number) => {
    const newExpanded = new Set(expandedTools);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedTools(newExpanded);
  };

  if (isToolExecution && toolInfo) {
    return (
      <article className="mb-4 flex items-start gap-4 p-4 md:p-5 rounded-2xl w-full max-w-full overflow-hidden">
        <div className="py-1.5 md:py-1 w-full">
          <div className="font-medium text-slate-800 mb-3">🔍 Fetching up-to-date information...</div>
          <div className="space-y-2">
            {toolInfo.map((tool: any, index: number) => {
              const isExpanded = expandedTools.has(index);
              const hasResult = tool.result && tool.result.length > 0;
              const shouldTruncate = hasResult && tool.result.length > 200;
              
              return (
                <div key={index} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-3 py-2 text-sm flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-800">{tool.name}</span>
                      {tool.args && Object.keys(tool.args).length > 0 && (
                        <span className="ml-2 text-slate-600 text-xs">
                          ({Object.entries(tool.args).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(', ')})
                        </span>
                      )}
                    </div>
                    {hasResult && shouldTruncate && (
                      <button
                        onClick={() => toggleToolExpansion(index)}
                        className="flex items-center gap-1 text-slate-600 hover:text-slate-800 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <IconChevronDown size={16} />
                            <span className="text-xs">Collapse</span>
                          </>
                        ) : (
                          <>
                            <IconChevronRight size={16} />
                            <span className="text-xs">Expand</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  {hasResult && (
                    <div className={`p-3 ${tool.error ? 'bg-red-50' : 'bg-white'}`}>
                      <div 
                        className={`text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere ${tool.error ? 'text-red-700' : 'text-slate-800'} ${
                          !isExpanded && shouldTruncate ? ' overflow-hidden' : ''
                        }`}
                        style={{
                          maxHeight: !isExpanded && shouldTruncate ? '100px' : 'none',
                          overflow: !isExpanded && shouldTruncate ? 'hidden' : 'visible'
                        }}
                      >
                        {!isExpanded && shouldTruncate 
                          ? tool.result.substring(0, 200) + '...'
                          : tool.result
                        }
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </article>
    );
  }

  const messageContent = parts
    ? parts
        .filter(part => part.type === 'text')
        .map(part => part.text)
        .join('')
    : content;

  return (
    <article
      className={cx(
        "mb-4 flex items-start gap-4 p-4 md:p-5 pr-12 md:pr-16 rounded-2xl w-full max-w-full overflow-hidden",
        isUser ? "" : "bg-blue-50 border border-blue-600",
      )}
    >
      <Avatar isUser={isUser} />
      <Markdown
                  className={cx(
            "py-1.5 md:py-1 space-y-4 streaming-content break-words overflow-wrap-anywhere flex-1 min-w-0",
            isUser ? "text-2xl text-slate-800 text-center" : "text-base",
          )}
        options={{
          overrides: {
            ol: ({ children }) => <ol className="list-decimal ml-6 space-y-1">{children}</ol>,
            ul: ({ children }) => <ul className="list-disc ml-6 space-y-1">{children}</ul>,
            code: ({ children, className }) => {
              // Simple text extraction
              const getText = (node: any): string => {
                if (typeof node === 'string') return node;
                if (Array.isArray(node)) return node.map(getText).join('');
                if (node && typeof node === 'object' && node.props) return getText(node.props.children);
                return String(node || '');
              };

              // Inline code
              if (!className) {
                return <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>;
              }

              // Block code
              return (
                <div className="my-4 -mx-2">
                  <SyntaxHighlighter
                    language={className.replace('language-', '') || 'text'}
                    style={prism}
                    customStyle={{ 
                      margin: 0, 
                      borderRadius: '0.5rem', 
                      fontSize: '0.875rem',
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #e9ecef',
                      padding: '1rem'
                    }}
                    wrapLongLines={true}
                    showLineNumbers={false}
                  >
                    {getText(children)}
                  </SyntaxHighlighter>
                </div>
              );
            },
            pre: ({ children }) => {
              const getText = (node: any): string => {
                if (typeof node === 'string') return node;
                if (Array.isArray(node)) return node.map(getText).join('');
                if (node && typeof node === 'object' && node.props) return getText(node.props.children);
                return String(node || '');
              };

              return (
                <div className="my-4 -mx-2">
                  <SyntaxHighlighter
                    language="text"
                    style={prism}
                    customStyle={{ 
                      margin: 0, 
                      borderRadius: '0.5rem', 
                      fontSize: '0.875rem',
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #e9ecef',
                      padding: '1rem'
                    }}
                    wrapLongLines={true}
                    showLineNumbers={false}
                  >
                    {getText(children)}
                  </SyntaxHighlighter>
                </div>
              );
            },
          },
        }}
      >
        {messageContent}
      </Markdown>
      
      <style jsx>{`
        .streaming-content {
          animation: fadeInUp 0.3s ease-out;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .streaming-content::after {
          content: '';
          display: inline-block;
          width: 2px;
          height: 1.2em;
          background: #3b82f6;
          margin-left: 2px;
          animation: blink 1s infinite;
        }
        
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </article>
  );
};

const Avatar: React.FC<{ isUser?: boolean; className?: string }> = ({
  isUser = false,
  className,
}) => {
  return (
    <div
      className={cx(
        "flex items-center justify-center shrink-0 rounded-full",
        isUser ? "" : "size-8",
        className,
      )}
    >
      {isUser ? <></> : <CodeWizardLogo height={32} />}
    </div>
  );
};

export default Message;
export { Avatar };
