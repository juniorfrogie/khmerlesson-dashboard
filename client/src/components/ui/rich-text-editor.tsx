import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bold, Italic, Underline, List, ListOrdered, Type, BookOpen, MessageCircle } from "lucide-react";
import VocabularyEditor from "./vocabulary-editor";
import DialogueEditor from "./dialogue-editor";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  sectionTitle?: string;
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Enter content...",
  className = "",
  sectionTitle = ""
}: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [editorMode, setEditorMode] = useState<'freetext' | 'vocabulary' | 'dialogue'>('freetext');

  // Auto-detect content type based on section title
  useEffect(() => {
    const title = sectionTitle.toLowerCase();
    if (title.includes('vocabulary') || title.includes('word')) {
      setEditorMode('vocabulary');
    } else if (title.includes('dialogue') || title.includes('conversation')) {
      setEditorMode('dialogue');
    } else {
      setEditorMode('freetext');
    }
  }, [sectionTitle]);

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
      <Tabs value={editorMode} onValueChange={(value) => setEditorMode(value as any)} className="w-full">
        {/* Toolbar with Mode Tabs */}
        <div className="border-b border-gray-200 p-2">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-fit grid-cols-3">
              <TabsTrigger value="freetext" className="text-xs">
                <Type className="h-3 w-3 mr-1" />
                Free Text
              </TabsTrigger>
              <TabsTrigger value="vocabulary" className="text-xs">
                <BookOpen className="h-3 w-3 mr-1" />
                Vocabulary
              </TabsTrigger>
              <TabsTrigger value="dialogue" className="text-xs">
                <MessageCircle className="h-3 w-3 mr-1" />
                Dialogue
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center text-xs neutral-medium">
              <Type className="h-3 w-3 mr-1" />
              Khmer supported
            </div>
          </div>
        </div>
        
        {/* Content Areas */}
        <TabsContent value="freetext" className="mt-0">
          <div className="p-2 border-b border-gray-200">
            <div className="flex items-center space-x-1">
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
            </div>
          </div>
          <Textarea
            data-rich-editor="true"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="min-h-[120px] border-0 focus-visible:ring-0 resize-none khmer-text"
          />
        </TabsContent>
        
        <TabsContent value="vocabulary" className="mt-0 p-4">
          <VocabularyEditor
            value={value}
            onChange={onChange}
            placeholder="Add vocabulary entries..."
          />
        </TabsContent>
        
        <TabsContent value="dialogue" className="mt-0 p-4">
          <DialogueEditor
            value={value}
            onChange={onChange}
            placeholder="Add dialogue entries..."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
