// frontend/src/app/test-connection/page.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestConnectionPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  const testEndpoint = async (name: string, url: string, options?: RequestInit) => {
    try {
      console.log(`Testing ${name}: ${url}`);
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      
      return {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        data,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error: any) {
      console.error(`Error testing ${name}:`, error);
      return {
        error: error.message,
        type: error.name,
        stack: error.stack,
      };
    }
  };

  const runTests = async () => {
    setLoading(true);
    setResults({});

    const tests = {
      // Test 1: Backend Health Check
      backendHealth: await testEndpoint(
        'Backend Health',
        'http://localhost:5000/health'
      ),
      
      // Test 2: API Base URL
      apiBase: await testEndpoint(
        'API Base',
        'http://localhost:5000/api'
      ),
      
      // Test 3: Login Endpoint (without credentials)
      loginEndpoint: await testEndpoint(
        'Login Endpoint',
        `${API_URL}/auth/login`,
        {
          method: 'POST',
          body: JSON.stringify({
            email: 'test@test.com',
            password: 'test'
          }),
        }
      ),
      
      // Test 4: CORS Test
      corsTest: await testEndpoint(
        'CORS Test',
        'http://localhost:5000/api/auth/login',
        {
          method: 'OPTIONS',
        }
      ),
      
      // Test 5: Environment Variable
      envVar: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'NOT SET',
        expectedUrl: API_URL,
      },
    };

    setResults(tests);
    setLoading(false);
  };

  return (
    <div className="min-h-screen p-8 bg-gray-100 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
          Frontend-Backend Connection Test
        </h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Connection Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>API URL:</strong> {API_URL}</p>
              <p><strong>Backend Expected:</strong> http://localhost:5000</p>
              <p><strong>Frontend Running On:</strong> http://localhost:3000</p>
            </div>
            
            <Button 
              onClick={runTests} 
              disabled={loading}
              className="mt-4"
            >
              {loading ? 'Testing...' : 'Run Connection Tests'}
            </Button>
          </CardContent>
        </Card>

        {Object.keys(results).length > 0 && (
          <div className="space-y-4">
            {Object.entries(results).map(([key, result]: [string, any]) => (
              <Card key={key} className={result.error ? 'border-red-500' : result.ok ? 'border-green-500' : 'border-yellow-500'}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{key}</span>
                    <span className={`text-sm ${result.error ? 'text-red-500' : result.ok ? 'text-green-500' : 'text-yellow-500'}`}>
                      {result.error ? '❌ Failed' : result.ok ? '✅ Success' : '⚠️ Issue'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs overflow-auto bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}