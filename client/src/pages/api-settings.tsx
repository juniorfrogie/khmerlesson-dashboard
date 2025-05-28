import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Eye, EyeOff, RefreshCw, ExternalLink, Code, Smartphone, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function APISettings() {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load existing API key from localStorage
    const existingKey = localStorage.getItem('api-key');
    if (existingKey) {
      setApiKey(existingKey);
    }
  }, []);

  const generateApiKey = () => {
    setIsGenerating(true);
    // Generate a new API key (simple UUID-like format)
    const newKey = 'khmer_' + Math.random().toString(36).substring(2, 15) + '_' + 
                   Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
    
    setTimeout(() => {
      setApiKey(newKey);
      localStorage.setItem('api-key', newKey);
      setIsGenerating(false);
      toast({
        title: "API Key Generated",
        description: "Your new API key has been created and saved."
      });
    }, 1000);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`
    });
  };

  const apiExamples = [
    {
      title: "Get All Lessons",
      method: "GET",
      endpoint: "/api/v1/lessons",
      description: "Retrieve all published lessons"
    },
    {
      title: "Get Lesson Content", 
      method: "GET",
      endpoint: "/api/v1/lessons/:id",
      description: "Get detailed lesson with sections"
    },
    {
      title: "Submit Quiz",
      method: "POST", 
      endpoint: "/api/v1/quizzes/:id/submit",
      description: "Submit answers and get score"
    },
    {
      title: "Search Content",
      method: "GET",
      endpoint: "/api/v1/search?q=alphabet",
      description: "Search lessons and quizzes"
    }
  ];

  const baseUrl = window.location.origin;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold neutral-dark">API Settings</h1>
        <p className="neutral-medium mt-2">
          Connect external applications to your Khmer learning content
        </p>
      </div>

      {/* API Key Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Code className="mr-2 h-5 w-5" />
            API Key Management
          </CardTitle>
          <CardDescription>
            Generate and manage your API key for external app access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">Your API Key</Label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Input
                  id="api-key"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  readOnly
                  placeholder={apiKey ? "" : "No API key generated yet"}
                  className="pr-10"
                />
                {apiKey && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                )}
              </div>
              {apiKey && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(apiKey, "API Key")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={generateApiKey}
              disabled={isGenerating}
              className="flex items-center"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
              {apiKey ? 'Regenerate' : 'Generate'} API Key
            </Button>
          </div>

          {apiKey && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Store your API key securely. If you regenerate it, 
                you'll need to update all applications using the old key.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>API Endpoints</CardTitle>
          <CardDescription>
            Available endpoints for your external applications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Base URL</Label>
            <div className="flex space-x-2">
              <Input
                value={`${baseUrl}/api/v1`}
                readOnly
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(`${baseUrl}/api/v1`, "Base URL")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium neutral-dark">Popular Endpoints</h4>
            {apiExamples.map((example, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant={example.method === 'GET' ? 'default' : 'secondary'}>
                      {example.method}
                    </Badge>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {example.endpoint}
                    </code>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(`${baseUrl}${example.endpoint}`, example.title)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm neutral-medium">{example.description}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm neutral-medium">
              Need the complete API documentation?
            </span>
            <Button variant="outline" size="sm" asChild>
              <a href="/API.md" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Full Documentation
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Examples</CardTitle>
          <CardDescription>
            Code snippets to get you started with different platforms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center space-x-2">
                <Globe className="h-5 w-5 text-blue-500" />
                <h4 className="font-medium">Web App</h4>
              </div>
              <p className="text-sm neutral-medium">
                JavaScript/React integration for web applications
              </p>
              <code className="block text-xs bg-gray-100 p-2 rounded mt-2">
                fetch('/api/v1/lessons', {'{'}
                <br />
                &nbsp;&nbsp;headers: {'{'}
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;'X-API-Key': 'your_key'
                <br />
                &nbsp;&nbsp;{'}'}
                <br />
                {'}'})
              </code>
            </div>

            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center space-x-2">
                <Smartphone className="h-5 w-5 text-green-500" />
                <h4 className="font-medium">Mobile App</h4>
              </div>
              <p className="text-sm neutral-medium">
                Flutter/React Native for mobile applications
              </p>
              <code className="block text-xs bg-gray-100 p-2 rounded mt-2">
                http.get(
                <br />
                &nbsp;&nbsp;'${baseUrl}/api/v1/lessons',
                <br />
                &nbsp;&nbsp;headers: {'{'}
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;'X-API-Key': apiKey
                <br />
                &nbsp;&nbsp;{'}'}
                <br />
                )
              </code>
            </div>

            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center space-x-2">
                <Code className="h-5 w-5 text-purple-500" />
                <h4 className="font-medium">Backend</h4>
              </div>
              <p className="text-sm neutral-medium">
                Python/Node.js server integration
              </p>
              <code className="block text-xs bg-gray-100 p-2 rounded mt-2">
                requests.get(
                <br />
                &nbsp;&nbsp;'${baseUrl}/api/v1/lessons',
                <br />
                &nbsp;&nbsp;headers={'{'}'X-API-Key': key{'}'}
                <br />
                )
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Notes */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-800">Security & Best Practices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ul className="text-sm text-orange-700 space-y-1">
            <li>• Keep your API key secret and never expose it in client-side code</li>
            <li>• Use environment variables to store API keys in your applications</li>
            <li>• Regenerate your API key if it becomes compromised</li>
            <li>• Only published lessons and active quizzes are accessible via API</li>
            <li>• Monitor your API usage through server logs</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}