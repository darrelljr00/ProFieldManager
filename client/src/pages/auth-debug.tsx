import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, WifiOff, RefreshCw } from "lucide-react";
import { getApiConfigDebug, isCustomDomain } from "@/lib/api-config";
import { Link } from "wouter";

interface AuthDebugInfo {
  hostname: string;
  isCustomDomain: boolean;
  apiBaseUrl: string;
  hasAuthToken: boolean;
  authTokenPreview?: string;
  timestamp: string;
  serverReachable?: boolean;
  serverError?: string;
}

export default function AuthDebugPage() {
  const [debugInfo, setDebugInfo] = useState<AuthDebugInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);

  const loadDebugInfo = async () => {
    setIsLoading(true);
    try {
      const config = getApiConfigDebug();
      const token = localStorage.getItem('auth_token');
      
      // Test server connection
      let serverReachable = false;
      let serverError = '';
      
      try {
        const response = await fetch(config.apiBaseUrl + '/api/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        serverReachable = response.ok;
        if (!response.ok) {
          serverError = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (error) {
        serverReachable = false;
        serverError = error instanceof Error ? error.message : 'Connection failed';
      }

      setDebugInfo({
        ...config,
        authTokenPreview: token ? `${token.substring(0, 8)}...${token.substring(-8)}` : undefined,
        serverReachable,
        serverError: serverReachable ? undefined : serverError
      });
    } catch (error) {
      console.error('Failed to load debug info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testAuthentication = async () => {
    setTestingConnection(true);
    try {
      const config = getApiConfigDebug();
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(config.apiBaseUrl + '/api/auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      });

      const result = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      };

      console.log('Auth test result:', result);
      await loadDebugInfo(); // Refresh debug info
    } catch (error) {
      console.error('Auth test failed:', error);
    } finally {
      setTestingConnection(false);
    }
  };

  const clearAuthAndRetry = () => {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  };

  useEffect(() => {
    loadDebugInfo();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Authentication Debug</h1>
          <p className="text-gray-600">Diagnose authentication issues for profieldmanager.com</p>
        </div>

        <div className="grid gap-6">
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {debugInfo?.serverReachable ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-600" />
                )}
                Server Connection
              </CardTitle>
              <CardDescription>
                Status of connection to backend API server
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">API Server:</span>
                <Badge variant={debugInfo?.serverReachable ? "default" : "destructive"}>
                  {debugInfo?.serverReachable ? "Connected" : "Disconnected"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Base URL:</span>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {debugInfo?.apiBaseUrl || 'N/A'}
                </code>
              </div>
              {debugInfo?.serverError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-800">Connection Error</p>
                    <p className="text-sm text-red-700">{debugInfo.serverError}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Domain Information */}
          <Card>
            <CardHeader>
              <CardTitle>Domain Configuration</CardTitle>
              <CardDescription>
                Current domain settings and routing information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Hostname:</span>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {debugInfo?.hostname}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Custom Domain:</span>
                <Badge variant={debugInfo?.isCustomDomain ? "default" : "secondary"}>
                  {debugInfo?.isCustomDomain ? "Yes (profieldmanager.com)" : "No (Replit domain)"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Authentication Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {debugInfo?.hasAuthToken ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                )}
                Authentication Token
              </CardTitle>
              <CardDescription>
                Local authentication token status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Token Present:</span>
                <Badge variant={debugInfo?.hasAuthToken ? "default" : "secondary"}>
                  {debugInfo?.hasAuthToken ? "Yes" : "No"}
                </Badge>
              </div>
              {debugInfo?.hasAuthToken && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Token Preview:</span>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {debugInfo.authTokenPreview}
                  </code>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting Actions</CardTitle>
              <CardDescription>
                Actions to resolve authentication issues
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <Button onClick={testAuthentication} disabled={testingConnection}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${testingConnection ? 'animate-spin' : ''}`} />
                  Test Authentication
                </Button>
                
                <Button onClick={loadDebugInfo} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Debug Info
                </Button>

                {!debugInfo?.hasAuthToken && (
                  <Link href="/login">
                    <Button className="w-full">
                      Go to Login Page
                    </Button>
                  </Link>
                )}

                {debugInfo?.hasAuthToken && (
                  <Button onClick={clearAuthAndRetry} variant="destructive">
                    Clear Token & Re-login
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          {debugInfo?.isCustomDomain && (
            <Card>
              <CardHeader>
                <CardTitle>Custom Domain Instructions</CardTitle>
                <CardDescription>
                  How to authenticate on profieldmanager.com
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  <p>
                    You're accessing Pro Field Manager via the custom domain (profieldmanager.com). 
                    To authenticate properly:
                  </p>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Click "Go to Login Page" or navigate to <code>/login</code></li>
                    <li>Enter your credentials (e.g., sales@texaspowerwash.net)</li>
                    <li>After successful login, you'll be redirected to the dashboard</li>
                    <li>The authentication token will be stored for future requests</li>
                  </ol>
                  <p className="text-amber-700 bg-amber-50 p-3 rounded border">
                    <strong>Note:</strong> Authentication tokens are domain-specific. 
                    You need to log in on profieldmanager.com to access the system via this domain.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Last updated: {debugInfo?.timestamp}
          </p>
        </div>
      </div>
    </div>
  );
}