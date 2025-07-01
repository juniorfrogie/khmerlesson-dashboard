import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";

interface VocabularyEntry {
  id: string;
  english: string;
  phonemic: string;
  khmer: string;
}

interface VocabularyEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function VocabularyEditor({ value, onChange, placeholder }: VocabularyEditorProps) {
  const [entries, setEntries] = useState<VocabularyEntry[]>(() => {
    try {
      // Parse existing content to extract vocabulary entries
      const lines = value.split('\n').filter(line => line.trim());
      const parsedEntries: VocabularyEntry[] = [];
      
      for (const line of lines) {
        // Match patterns like: "word [pronunciation] : translation"
        const match = line.match(/^(.+?)\s*\[(.+?)\]\s*:\s*(.+)$/);
        if (match) {
          parsedEntries.push({
            id: Math.random().toString(36).substring(2, 9),
            english: match[1].trim(),
            phonemic: match[2].trim(),
            khmer: match[3].trim(),
          });
        }
      }
      
      return parsedEntries.length > 0 ? parsedEntries : [{
        id: Math.random().toString(36).substring(2, 9),
        english: "",
        phonemic: "",
        khmer: "",
      }];
    } catch {
      return [{
        id: Math.random().toString(36).substring(2, 9),
        english: "",
        phonemic: "",
        khmer: "",
      }];
    }
  });

  const updateEntries = (newEntries: VocabularyEntry[]) => {
    setEntries(newEntries);
    
    // Convert entries back to text format
    const formattedText = newEntries
      .filter(entry => entry.english || entry.phonemic || entry.khmer)
      .map(entry => {
        if (entry.english && entry.phonemic && entry.khmer) {
          return `${entry.english} [${entry.phonemic}] : ${entry.khmer}`;
        } else if (entry.english && entry.khmer) {
          return `${entry.english} : ${entry.khmer}`;
        } else {
          return entry.english || entry.phonemic || entry.khmer;
        }
      })
      .join('\n');
    
    onChange(formattedText);
  };

  const addEntry = () => {
    const newEntries = [...entries, {
      id: Math.random().toString(36).substring(2, 9),
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

  const updateEntry = (id: string, field: keyof VocabularyEntry, value: string) => {
    const newEntries = entries.map(entry =>
      entry.id === id ? { ...entry, [field]: value } : entry
    );
    updateEntries(newEntries);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">Vocabulary Entries</div>
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

      <div className="space-y-3">
        {entries.map((entry, index) => (
          <Card key={entry.id} className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex items-center mt-2">
                  <GripVertical className="h-4 w-4 text-gray-400" />
                </div>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      English Word
                    </label>
                    <Input
                      placeholder="Enter English word"
                      value={entry.english}
                      onChange={(e) => updateEntry(entry.id, 'english', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Pronunciation
                    </label>
                    <Input
                      placeholder="Enter phonemic"
                      value={entry.phonemic}
                      onChange={(e) => updateEntry(entry.id, 'phonemic', e.target.value)}
                      className="text-sm font-mono"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Khmer Translation
                    </label>
                    <Input
                      placeholder="Enter Khmer"
                      value={entry.khmer}
                      onChange={(e) => updateEntry(entry.id, 'khmer', e.target.value)}
                      className="text-sm khmer-text"
                    />
                  </div>
                </div>

                {entries.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEntry(entry.id)}
                    className="text-red-500 hover:bg-red-50 mt-6"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {entry.english && entry.phonemic && entry.khmer && (
                <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                  <span className="font-medium">{entry.english}</span>
                  <span className="text-gray-600 mx-2">[{entry.phonemic}]</span>
                  <span className="khmer-text">{entry.khmer}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
        <div className="font-medium mb-1">Format Guide:</div>
        <div>• English word [phonemic] : Khmer translation</div>
        <div>• Example: Where? [nouw-naa?] : នៅណា?</div>
      </div>
    </div>
  );
}