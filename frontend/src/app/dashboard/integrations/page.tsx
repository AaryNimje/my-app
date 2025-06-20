// frontend/src/app/dashboard/integrations/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { integrationsApi } from '@/lib/api';

interface Integration {
  id: string;
  name: string;
  type: string;
  email?: string;
  connected_at: string;
  status: 'active' | 'inactive';
}

interface EmailCredentials {
  email: string;
  password: string;
  name: string;
}

// API response interfaces
interface ApiResponse {
  success: boolean;
  error?: string;
}

interface IntegrationsListResponse extends ApiResponse {
  integrations?: Integration[];
}

interface GoogleAuthResponse extends ApiResponse {
  authUrl?: string;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailCredentials, setEmailCredentials] = useState<EmailCredentials>({
    email: '',
    password: '',
    name: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const response = await integrationsApi.list() as IntegrationsListResponse;
      if (response?.success && response?.integrations) {
        setIntegrations(response.integrations);
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async (integrationType: string) => {
    try {
      const response = await integrationsApi.google.auth(integrationType) as GoogleAuthResponse;
      if (response?.success && response?.authUrl) {
        window.location.href = response.authUrl;
      }
    } catch (error) {
      console.error('Failed to initiate Google auth:', error);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await integrationsApi.email.add(emailCredentials) as ApiResponse;
      if (response?.success) {
        setShowEmailForm(false);
        setEmailCredentials({ email: '', password: '', name: '' });
        await loadIntegrations();
      }
    } catch (error) {
      console.error('Failed to add email integration:', error);
      alert('Failed to add email integration. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this integration?')) return;

    try {
      const response = await integrationsApi.delete(id) as ApiResponse;
      if (response?.success) {
        await loadIntegrations();
      }
    } catch (error) {
      console.error('Failed to delete integration:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Integrations</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Connect your external services to enable AI agents to access your data
        </p>
      </div>

      {/* Available Integrations */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Available Integrations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="text-2xl mr-2">📧</span>
                Email (IMAP/SMTP)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Connect your email account to read and send emails
              </p>
              <Button 
                onClick={() => setShowEmailForm(true)}
                className="w-full"
              >
                Connect Email
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="text-2xl mr-2">📁</span>
                Google Drive
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Access and manage your Google Drive files
              </p>
              <Button 
                onClick={() => handleGoogleAuth('google_drive')}
                className="w-full"
              >
                Connect Google Drive
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="text-2xl mr-2">📅</span>
                Google Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Manage your calendar events and schedules
              </p>
              <Button 
                onClick={() => handleGoogleAuth('google_calendar')}
                className="w-full"
              >
                Connect Calendar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Connected Integrations */}
      {integrations.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Connected Integrations
          </h2>
          <div className="space-y-4">
            {integrations.map(integration => (
              <Card key={integration.id} className="bg-white dark:bg-gray-800">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">
                      {integration.type === 'email' ? '📧' : 
                       integration.type === 'google_drive' ? '📁' : 
                       integration.type === 'google_calendar' ? '📅' : '🔌'}
                    </span>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {integration.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {integration.email || integration.type}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Connected {new Date(integration.connected_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      integration.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {integration.status}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(integration.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Email Form Modal */}
      {showEmailForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle>Connect Email Account</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Display Name
                  </label>
                  <Input
                    type="text"
                    value={emailCredentials.name}
                    onChange={(e) => setEmailCredentials({
                      ...emailCredentials,
                      name: e.target.value
                    })}
                    placeholder="My Gmail"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={emailCredentials.email}
                    onChange={(e) => setEmailCredentials({
                      ...emailCredentials,
                      email: e.target.value
                    })}
                    placeholder="your-email@gmail.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    App Password
                  </label>
                  <Input
                    type="password"
                    value={emailCredentials.password}
                    onChange={(e) => setEmailCredentials({
                      ...emailCredentials,
                      password: e.target.value
                    })}
                    placeholder="Your app password"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    For Gmail, use an App Password. Enable 2FA and generate one from Google Account settings.
                  </p>
                </div>

                <div className="flex space-x-2">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? 'Connecting...' : 'Connect'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEmailForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}