
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export const BackendConnectionTest = () => {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'failed'>('checking');
  const [backendData, setBackendData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setConnectionStatus('checking');
    setError(null);
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://13.235.100.18:3001';
      const baseURL = API_BASE_URL.replace(/\/$/, '');
      
      console.log('Testing connection to:', baseURL);
      
      const response = await fetch(`${baseURL}/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('Connection test response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Backend response data:', data);
      
      setBackendData(data);
      setConnectionStatus('connected');
    } catch (err) {
      console.error('Connection test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setConnectionStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <RefreshCw className="h-5 w-5 text-yellow-500 animate-spin" />;
    }
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500">Connected</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Checking...</Badge>;
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          {getStatusIcon()}
          <span>Backend Connection Test</span>
        </CardTitle>
        {getStatusBadge()}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">API Base URL:</span>
          <code className="text-sm bg-muted px-2 py-1 rounded">
            {import.meta.env.VITE_API_BASE_URL || 'http://13.235.100.18:3001'}
          </code>
        </div>

        <Button 
          onClick={testConnection} 
          disabled={loading}
          variant="outline"
          className="w-full"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Testing Connection...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Test Connection
            </>
          )}
        </Button>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600 font-medium">Connection Error:</p>
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {backendData && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-600 font-medium mb-2">Backend Response:</p>
            <pre className="text-xs text-green-700 overflow-x-auto">
              {JSON.stringify(backendData, null, 2)}
            </pre>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>This component tests the connection between frontend and backend.</p>
          <p>Check the browser console for detailed logs.</p>
        </div>
      </CardContent>
    </Card>
  );
};
