// frontend/src/app/dashboard/teacher/qa-generator/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, Link, FileText, Users } from 'lucide-react';
import { qaApi } from '@/lib/api';

interface Document {
  id: string;
  file_name: string;
  status: string;
  created_at: string;
}

interface StudyLink {
  id: string;
  title: string;
  link_code: string;
  fullLink: string;
  response_count: number;
  created_at: string;
}

export default function QAGeneratorPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [studyLinks, setStudyLinks] = useState<StudyLink[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [linkForm, setLinkForm] = useState({
    title: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchDocuments();
    fetchStudyLinks();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await qaApi.getDocuments();
      setDocuments(response.documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchStudyLinks = async () => {
    try {
      const response = await qaApi.getStudyLinks();
      setStudyLinks(response.studyLinks);
    } catch (error) {
      console.error('Error fetching study links:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('pdf', uploadFile);

      const response = await qaApi.uploadDocument(formData);
      setMessage({
        type: 'success',
        text: 'Document uploaded successfully. Processing will begin shortly.'
      });
      
      setUploadFile(null);
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      fetchDocuments();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to upload document'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!selectedDocument || !linkForm.title) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await qaApi.generateLink({
        documentId: selectedDocument,
        title: linkForm.title,
        description: linkForm.description
      });

      setMessage({
        type: 'success',
        text: 'Study link generated successfully!'
      });

      // Copy link to clipboard
      navigator.clipboard.writeText(response.studyLink.link);
      
      setLinkForm({ title: '', description: '' });
      setSelectedDocument('');
      fetchStudyLinks();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to generate link'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setMessage({
      type: 'success',
      text: 'Link copied to clipboard!'
    });
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Q&A Generator</h1>

      {message.text && (
        <Alert className={message.type === 'success' ? 'bg-green-50' : 'bg-red-50'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Q&A Document
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
              />
              <p className="text-sm text-gray-500 mt-1">
                Upload a PDF containing questions and answers
              </p>
            </div>
            <Button 
              onClick={handleFileUpload}
              disabled={!uploadFile || loading}
            >
              {loading ? 'Uploading...' : 'Upload PDF'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generate Link Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Generate Study Link
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Document</label>
              <select
                className="w-full p-2 border rounded"
                value={selectedDocument}
                onChange={(e) => setSelectedDocument(e.target.value)}
              >
                <option value="">Select a processed document</option>
                {documents
                  .filter(doc => doc.status === 'processed')
                  .map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.file_name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Link Title</label>
              <Input
                value={linkForm.title}
                onChange={(e) => setLinkForm({...linkForm, title: e.target.value})}
                placeholder="e.g., Chapter 5 Quiz"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description (Optional)</label>
              <Textarea
                value={linkForm.description}
                onChange={(e) => setLinkForm({...linkForm, description: e.target.value})}
                placeholder="Add instructions or notes for students"
                rows={3}
              />
            </div>

            <Button 
              onClick={handleGenerateLink}
              disabled={!selectedDocument || !linkForm.title || loading}
            >
              {loading ? 'Generating...' : 'Generate Link'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Study Links List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Your Study Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {studyLinks.length === 0 ? (
              <p className="text-gray-500">No study links created yet</p>
            ) : (
              studyLinks.map(link => (
                <div key={link.id} className="border rounded p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{link.title}</h3>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(link.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {link.response_count} responses
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Input
                      value={link.fullLink}
                      readOnly
                      className="text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={() => copyLink(link.fullLink)}
                    >
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/dashboard/teacher/responses/${link.id}`, '_blank')}
                    >
                      View Responses
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}