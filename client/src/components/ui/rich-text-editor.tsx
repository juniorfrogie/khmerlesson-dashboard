import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Underline, List, ListOrdered, Type } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Enter content...",
  className = "" 
}: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false);

  const formatText = (format: string) => {
    // Simple text formatting - in a real implementation you'd use a proper rich text editor
    const textarea = document.querySelector('textarea[data-rich-editor="true"]') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    if (selectedText) {
      let formattedText = selectedText;
      
      switch (format) {
        case 'bold':
          formattedText = `**${selectedText}**`;
          break;
        case 'italic':
          formattedText = `*${selectedText}*`;
          break;
        case 'underline':
          formattedText = `__${selectedText}__`;
          break;
      }
      
      const newValue = value.substring(0, start) + formattedText + value.substring(end);
      onChange(newValue);
    }
  };

  const insertList = (ordered = false) => {
    const bullet = ordered ? "1. " : "- ";
    const currentValue = value;
    const lines = currentValue.split('\n');
    const newValue = lines.length > 0 && lines[lines.length - 1] === "" 
      ? currentValue + bullet
      : currentValue + '\n' + bullet;
    onChange(newValue);
  };

  return (
    <div className={`border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-fluent-blue focus-within:border-transparent ${className}`}>
      {/* Toolbar */}
      <div className={`border-b border-gray-200 p-2 flex items-center space-x-1 ${!isFocused ? 'opacity-50' : ''}`}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText('bold')}
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText('italic')}
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText('underline')}
          className="h-8 w-8 p-0"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <div className="h-4 w-px bg-gray-300 mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertList(false)}
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertList(true)}
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <div className="h-4 w-px bg-gray-300 mx-1" />
        <div className="flex items-center text-xs neutral-medium ml-2">
          <Type className="h-3 w-3 mr-1" />
          Khmer supported
        </div>
      </div>
      
      {/* Text Area */}
      <Textarea
        data-rich-editor="true"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="min-h-[120px] border-0 focus-visible:ring-0 resize-none khmer-text"
      />
    </div>
  );
}
