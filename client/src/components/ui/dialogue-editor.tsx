import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, MessageCircle } from "lucide-react";

interface DialogueEntry {
  id: string;
  type: 'question' | 'answer' | 'statement';
  english: string;
  phonemic: string;
  khmer: string;
}

interface DialogueEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function DialogueEditor({ value, onChange, placeholder }: DialogueEditorProps) {
  const [entries, setEntries] = useState<DialogueEntry[]>(() => {
    try {
      // Parse existing content to extract dialogue entries
      const lines = value.split('\n').filter(line => line.trim());
      const parsedEntries: DialogueEntry[] = [];
      
      for (const line of lines) {
        let type: 'question' | 'answer' | 'statement' = 'statement';
        
        if (line.includes('Q:') || line.includes('?')) {
          type = 'question';
        } else if (line.includes('A:') || line.includes('Answer:')) {
          type = 'answer';
        }
        
        // Match patterns like: "Q: text [pronunciation] khmer"
        const match = line.match(/^(?:[QA]:\s*)?(.+?)\s*\[(.+?)\]\s*(.+)$/);
        if (match) {
          parsedEntries.push({
            id: Math.random().toString(36).substr(2, 9),
            type,
            english: match[1].trim(),
            phonemic: match[2].trim(),
            khmer: match[3].trim(),
          });
        }
      }
      
      return parsedEntries.length > 0 ? parsedEntries : [{
        id: Math.random().toString(36).substr(2, 9),
        type: 'question',
        english: "",
        phonemic: "",
        khmer: "",
      }];
    } catch {
      return [{
        id: Math.random().toString(36).substr(2, 9),
        type: 'question',
        english: "",
        phonemic: "",
        khmer: "",
      }];
    }
  });

  const updateEntries = (newEntries: DialogueEntry[]) => {
    setEntries(newEntries);
    
    // Convert entries back to text format
    const formattedText = newEntries
      .filter(entry => entry.english || entry.phonemic || entry.khmer)
      .map(entry => {
        const prefix = entry.type === 'question' ? 'Q: ' : entry.type === 'answer' ? 'A: ' : '';
        if (entry.english && entry.phonemic && entry.khmer) {
          return `${prefix}${entry.english}\n[${entry.phonemic}]\n${entry.khmer}`;
        } else if (entry.english && entry.khmer) {
          return `${prefix}${entry.english}\n${entry.khmer}`;
        } else {
          return entry.english || entry.phonemic || entry.khmer;
        }
      })
      .join('\n\n');
    
    onChange(formattedText);
  };

  const addEntry = () => {
    const newEntries = [...entries, {
      id: Math.random().toString(36).substr(2, 9),
      type: 'statement' as const,
      english: "",
      phonemic: "",
      khmer: "",
    }];
    updateEntries(newEntries);
  };

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      const newEntries = entries.filter(entry => entry.id !== id);
      updateEntries(newEntries);
    }
  };

  const updateEntry = (id: string, field: keyof DialogueEntry, value: any) => {
    const newEntries = entries.map(entry =>
      entry.id === id ? { ...entry, [field]: value } : entry
    );
    updateEntries(newEntries);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'question': return 'border-blue-200 bg-blue-50';
      case 'answer': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'question': return '❓';
      case 'answer': return '💬';
      default: return '📝';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">Dialogue & Conversation</div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addEntry}
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          <Plus className="mr-1 h-3 w-3" />
          Add Entry
        </Button>
      </div>

      <div className="space-y-4">
        {entries.map((entry, index) => (
          <Card key={entry.id} className={`border ${getTypeColor(entry.type)}`}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex items-center mt-2">
                  <span className="text-lg">{getTypeIcon(entry.type)}</span>
                </div>
                
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Select
                      value={entry.type}
                      onValueChange={(value) => updateEntry(entry.id, 'type', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="question">Question</SelectItem>
                        <SelectItem value="answer">Answer</SelectItem>
                        <SelectItem value="statement">Statement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      English Text
                    </label>
                    <Textarea
                      placeholder="Enter English text"
                      value={entry.english}
                      onChange={(e) => updateEntry(entry.id, 'english', e.target.value)}
                      className="text-sm resize-none h-20"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Pronunciation Guide
                    </label>
                    <Input
                      placeholder="Enter phonemic pronunciation"
                      value={entry.phonemic}
                      onChange={(e) => updateEntry(entry.id, 'phonemic', e.target.value)}
                      className="text-sm font-mono"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Khmer Translation
                    </label>
                    <Textarea
                      placeholder="Enter Khmer translation"
                      value={entry.khmer}
                      onChange={(e) => updateEntry(entry.id, 'khmer', e.target.value)}
                      className="text-sm khmer-text resize-none h-20"
                    />
                  </div>
                </div>

                {entries.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEntry(entry.id)}
                    className="text-red-500 hover:bg-red-50 mt-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {entry.english && entry.khmer && (
                <div className="mt-4 p-3 bg-white border border-gray-200 rounded">
                  <div className="text-sm">
                    <div className="font-medium text-gray-800">{entry.english}</div>
                    {entry.phonemic && (
                      <div className="text-gray-600 font-mono text-xs mt-1">[{entry.phonemic}]</div>
                    )}
                    <div className="khmer-text text-gray-800 mt-2">{entry.khmer}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
        <div className="font-medium mb-1">Dialogue Format Guide:</div>
        <div>• Use Questions for asking something</div>
        <div>• Use Answers for responses</div>
        <div>• Use Statements for general information</div>
        <div>• Include pronunciation guides for proper learning</div>
      </div>
    </div>
  );
}