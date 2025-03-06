'use client';

import { useEffect, useState } from 'react';
import { useRecipeStore } from '@/store/recipe';
import { FormatRecipeButton } from './format-recipe-button';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { GenerateRecipeButton } from './generate-recipe-button';

interface RecipeContentProps {
  recipeId: string;
  title: string;
  content: string;
  onUpdate: () => void;
}

export function RecipeContent({ recipeId, title, content, onUpdate }: RecipeContentProps) {
  const { formattedRecipe, setOriginalRecipe, resetState } = useRecipeStore();
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);

  useEffect(() => {
    setOriginalRecipe(content);
  }, [content, setOriginalRecipe]);

  useEffect(() => {
    return () => {
      resetState();
      setPreviewContent(null);
      setPreviewTitle(null);
    };
  }, [recipeId, resetState]);

  const handleUpdate = ({ title: newTitle, content: newContent, isPreview }: { title?: string; content: string; isPreview?: boolean }) => {
    if (isPreview) {
      setPreviewContent(newContent);
      if (newTitle) {
        setPreviewTitle(newTitle);
      }
    } else {
      setPreviewContent(null);
      setPreviewTitle(null);
      onUpdate();
    }
  };

  const displayContent = previewContent || formattedRecipe || content;

  return (
    <div className="space-y-6">
      {previewTitle && (
        <div className="bg-muted p-4 rounded-lg">
          <h1 className="text-2xl font-bold">{previewTitle}</h1>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <FormatRecipeButton
          recipeId={parseInt(recipeId)}
          recipeContent={content}
          recipeTitle={title}
          onUpdate={handleUpdate}
        />
      </div>
      <article className={cn(
        "prose dark:prose-invert max-w-none",
        "prose-p:my-3 prose-p:leading-relaxed",
        "prose-headings:mt-6 prose-headings:mb-4 prose-headings:font-bold prose-headings:text-foreground",
        "prose-h1:text-3xl prose-h1:leading-tight",
        "prose-h2:text-2xl prose-h2:leading-snug",
        "prose-h3:text-xl prose-h3:leading-snug",
        "prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6",
        "prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6",
        "prose-li:my-2 prose-li:pl-2",
        "prose-pre:my-4 prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg",
        "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm",
        "prose-hr:my-8 prose-hr:border-border",
        "prose-blockquote:border-l-4 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:italic",
        "prose-img:rounded-lg prose-img:my-4",
        "prose-strong:font-bold prose-strong:text-foreground",
        "prose-em:italic",
        "prose-table:my-4",
        "prose-th:border prose-th:border-border prose-th:p-2 prose-th:bg-muted",
        "prose-td:border prose-td:border-border prose-td:p-2"
      )}>
        <Markdown 
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({children}) => (
              <h1 className="text-3xl font-bold mt-6 mb-4 text-foreground">{children}</h1>
            ),
            h2: ({children}) => (
              <h2 className="text-2xl font-bold mt-5 mb-3 text-foreground">{children}</h2>
            ),
            h3: ({children}) => (
              <h3 className="text-xl font-semibold mt-4 mb-2 text-foreground">{children}</h3>
            ),
            p: ({children}) => (
              <p className="my-3 leading-relaxed">{children}</p>
            ),
            ul: ({children}) => (
              <ul className="list-disc pl-6 my-4 space-y-2">{children}</ul>
            ),
            ol: ({children}) => (
              <ol className="list-decimal pl-6 my-4 space-y-2">{children}</ol>
            ),
            li: ({children}) => (
              <li className="my-2 pl-2">{children}</li>
            ),
            code: ({node, inline, className, children, ...props}: any) => {
              const match = /language-(\w+)/.exec(className || '');
              return !inline ? (
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto my-4">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              ) : (
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm" {...props}>
                  {children}
                </code>
              );
            },
            blockquote: ({children}) => (
              <blockquote className="border-l-4 border-border pl-4 italic my-4">
                {children}
              </blockquote>
            ),
            hr: () => <hr className="my-8 border-border" />,
          }}
        >
          {displayContent}
        </Markdown>
      </article>
    </div>
  );
} 