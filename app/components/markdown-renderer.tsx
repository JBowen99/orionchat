import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "~/lib/utils";
import { Copy, Download, WrapText, Check } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { toast } from "sonner";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

interface CodeBlockProps {
  language: string;
  children: React.ReactNode;
  code: string;
}

function CodeBlock({ language, children, code }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);
  const [wrapped, setWrapped] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Code copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy code:", err);
      toast.error("Failed to copy code");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code.${language || "txt"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleWrap = () => {
    setWrapped(!wrapped);
  };

  return (
    <div className="relative group my-6 border border-border rounded-lg bg-card shadow-sm w-full max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between bg-muted/50 border-b border-border px-4 py-2.5 text-sm">
        <span className="text-muted-foreground font-mono font-medium">
          {language || "text"}
        </span>
        <div className="flex items-center space-x-1 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-muted-foreground/10"
                onClick={toggleWrap}
              >
                <WrapText className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={4}>
              {wrapped ? "Disable text wrapping" : "Enable text wrapping"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-muted-foreground/10"
                onClick={handleDownload}
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={4}>Download code</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-muted-foreground/10"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={4}>
              {copied ? "Copied!" : "Copy to clipboard"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Code content */}
      <div className="relative overflow-x-auto">
        <pre
          className={cn(
            "bg-muted/30 p-4 text-sm font-mono leading-relaxed max-w-full w-full",
            wrapped ? "whitespace-pre-wrap break-words" : "overflow-x-auto"
          )}
        >
          {children}
        </pre>
      </div>
    </div>
  );
}

export function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  // Memoize the markdown processing to avoid re-parsing on every render during streaming
  const processedContent = React.useMemo(() => {
    if (!content) return "";

    // For streaming content, we might have incomplete markdown structures
    // Add some basic cleanup to prevent parsing errors
    let cleanContent = content;

    // Handle incomplete code blocks
    const codeBlockMatches = (cleanContent.match(/```/g) || []).length;
    if (codeBlockMatches % 2 === 1) {
      // Odd number of ``` means we have an unclosed code block
      cleanContent += "\n```";
    }

    // Handle incomplete tables (if last line looks like it's starting a table row)
    const lines = cleanContent.split("\n");
    const lastLine = lines[lines.length - 1];
    if (lastLine && lastLine.startsWith("|") && !lastLine.endsWith("|")) {
      // Incomplete table row, add closing pipe
      cleanContent += "|";
    }

    // Handle incomplete bold/italic (if we have odd number of ** or *)
    const boldMatches = (cleanContent.match(/\*\*/g) || []).length;
    if (boldMatches % 2 === 1) {
      cleanContent += "**";
    }

    const italicMatches = (cleanContent.match(/(?<!\*)\*(?!\*)/g) || []).length;
    if (italicMatches % 2 === 1) {
      cleanContent += "*";
    }

    return cleanContent;
  }, [content]);

  return (
    <div className={cn("prose prose-sm w-full dark:prose-invert", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Enhanced code blocks with header and actions
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";

            // Extract the actual text content from children
            const getTextContent = (node: any): string => {
              if (typeof node === "string") {
                return node;
              }
              if (Array.isArray(node)) {
                return node.map(getTextContent).join("");
              }
              if (
                node &&
                typeof node === "object" &&
                node.props &&
                node.props.children
              ) {
                return getTextContent(node.props.children);
              }
              return "";
            };

            const code = getTextContent(children).replace(/\n$/, "");

            return !inline && match ? (
              <CodeBlock language={language} code={code}>
                <code className={className} {...props}>
                  {children}
                </code>
              </CodeBlock>
            ) : (
              <code
                className="bg-muted/60 px-1.5 py-0.5 rounded text-sm font-mono border"
                {...props}
              >
                {children}
              </code>
            );
          },
          // Custom styling for blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-muted-foreground/20 pl-4 italic text-muted-foreground bg-muted/20 py-2 rounded-r-md my-4">
              {children}
            </blockquote>
          ),
          // Custom styling for tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-6 border border-border rounded-lg">
              <table className="min-w-full border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-border bg-muted/50 px-4 py-3 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border px-4 py-3">{children}</td>
          ),
          // Custom styling for links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2"
            >
              {children}
            </a>
          ),
          // Custom styling for headings
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 mt-8 first:mt-0 pb-2 border-b border-border">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mb-3 mt-6 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-bold mb-2 mt-5 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-bold mb-2 mt-4 first:mt-0">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-sm font-bold mb-1 mt-3 first:mt-0">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-xs font-bold mb-1 mt-2 first:mt-0">
              {children}
            </h6>
          ),
          // Custom styling for lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-2 mb-4 pl-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-2 mb-4 pl-2">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          // Custom styling for paragraphs
          p: ({ children }) => (
            <p className="mb-4 leading-relaxed last:mb-0">{children}</p>
          ),
          // Custom styling for horizontal rules
          hr: () => <hr className="my-8 border-border" />,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
