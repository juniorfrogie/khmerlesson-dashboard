import { useState, useEffect, useRef } from "react";
// import { Textarea } from "@/components/ui/textarea";
// import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Type, BookOpen } from "lucide-react";
import VocabularyEditor from "./vocabulary-editor";
import Editor from './quill-editor';
import { Delta } from "quill";
import { Lesson } from "@shared/schema";

interface RichTextEditorProps {
  value: string;
  ops: any;
  onChange: (value: string) => void;
  onHtml: (value: string | null) => void;
  onOps: (value: any) => void;
  placeholder?: string;
  className?: string;
  sectionTitle?: string;
}

export default function RichTextEditor({ 
  value,
  ops, 
  onChange,
  onHtml,
  onOps, 
  placeholder = "Enter content...",
  className = "",
  sectionTitle = ""
}: RichTextEditorProps) {
  // const [isFocused, setIsFocused] = useState(false);
  const [editorMode, setEditorMode] = useState<'vocabulary' | 'freetext'>('vocabulary');

  // const [editorContent, setEditorContent] = useState('');
  // const handleEditorChange = (content: string) => {
  //   setEditorContent(content);
  // };

  const [_, setLastChange] = useState();
  const quillRef = useRef(null)

  // Auto-detect content type based on section title
  useEffect(() => {
    const title = sectionTitle.toLowerCase();
    if (title.includes('vocabulary') || title.includes('word') || title.includes('key')) {
      setEditorMode('vocabulary');
    } else {
      setEditorMode('freetext');
    }
  }, [sectionTitle]);

  // const formatText = (format: string) => {
  //   // Simple text formatting - in a real implementation you'd use a proper rich text editor
  //   const textarea = document.querySelector('textarea[data-rich-editor="true"]') as HTMLTextAreaElement;
  //   if (!textarea) return;

  //   const start = textarea.selectionStart;
  //   const end = textarea.selectionEnd;
  //   const selectedText = value.substring(start, end);
    
  //   if (selectedText) {
  //     let formattedText = selectedText;
      
  //     switch (format) {
  //       case 'bold':
  //         formattedText = `**${selectedText}**`;
  //         break;
  //       case 'italic':
  //         formattedText = `*${selectedText}*`;
  //         break;
  //       case 'underline':
  //         formattedText = `__${selectedText}__`;
  //         break;
  //     }
      
  //     const newValue = value.substring(0, start) + formattedText + value.substring(end);
  //     onChange(newValue);
  //   }
  // };

  // const insertList = (ordered = false) => {
  //   const bullet = ordered ? "1. " : "- ";
  //   const currentValue = value;
  //   const lines = currentValue.split('\n');
  //   const newValue = lines.length > 0 && lines[lines.length - 1] === "" 
  //     ? currentValue + bullet
  //     : currentValue + '\n' + bullet;
  //   onChange(newValue);
  // };

  return (
    <div className={`border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-fluent-blue focus-within:border-transparent ${className}`}>
      <Tabs value={editorMode} onValueChange={(value) => setEditorMode(value as any)} className="w-full">
        {/* Toolbar with Mode Tabs */}
        <div className="border-b border-gray-200 p-2">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-fit grid-cols-2">
              <TabsTrigger value="vocabulary" className="text-xs">
                <BookOpen className="h-3 w-3 mr-1" />
                Vocabulary
              </TabsTrigger>
              <TabsTrigger value="freetext" className="text-xs">
                <Type className="h-3 w-3 mr-1" />
                Free Text
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center text-xs neutral-medium">
              <Type className="h-3 w-3 mr-1" />
              Khmer supported
            </div>
          </div>
        </div>
        
        {/* Content Areas */}
        <TabsContent value="vocabulary" className="mt-0 p-4">
          <VocabularyEditor
            value={value}
            onChange={onChange}
            placeholder="Add vocabulary entries..."
          />
        </TabsContent>
        
        <TabsContent value="freetext" className="mt-0">
          {/* <div className="p-2 border-b border-gray-200">
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
          </div> */}
          {/* <Textarea
            data-rich-editor="true"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="min-h-[120px] border-0 focus-visible:ring-0 resize-none khmer-text"
          /> */}
          <Editor
            ref={quillRef}
            defaultValue={ops && ops.length > 0 ? new Delta(ops) : new Delta().insert(value)}
            onChange={(e) => onChange(e)}
            onHtml={(e) => onHtml(e)}
            onOps={(e) => onOps(e)}
            onTextChange={setLastChange}
            onSelectionChange={() => {}}
            readOnly={false}
            placeholder={placeholder}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
