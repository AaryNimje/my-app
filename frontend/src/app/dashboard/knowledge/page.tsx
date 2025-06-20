// frontend/src/app/dashboard/knowledge/page.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText, Folder, Search, Trash2, Download } from 'lucide-react';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
  folder?: string;
}

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Mock folders
  const folders = [
    { id: '1', name: 'Course Materials', count: 12 },
    { id: '2', name: 'Research Papers', count: 8 },
    { id: '3', name: 'Templates', count: 5 },
    { id: '4', name: 'Student Resources', count: 15 }
  ];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setUploading(true);
    
    // Simulate file upload
    setTimeout(() => {
      const newDocs: Document[] = Array.from(files).map((file, index) => ({
        id: `doc-${Date.now()}-${index}`,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        uploadedAt: new Date(),
        folder: selectedFolder || undefined
      }));
      
      setDocuments(prev => [...prev, ...newDocs]);
      setUploading(false);
    }, 1500);
  };

  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (!selectedFolder || doc.folder === selectedFolder)
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('doc')) return '📝';
    if (type.includes('sheet') || type.includes('excel')) return '📊';
    if (type.includes('image')) return '🖼️';
    return '📎';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Knowledge Base</h1>
          <p className="text-gray-600">Upload and manage documents for your AI agents</p>
        </div>
        <label htmlFor="file-upload">
          <input
            id="file-upload"
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.json,.md"
          />
          <Button asChild>
            <span className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Documents'}
            </span>
          </Button>
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Folders Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Folders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedFolder(null)}
                  className={`w-full text-left p-2 rounded flex items-center justify-between ${
                    !selectedFolder ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Folder className="w-4 h-4" />
                    All Documents
                  </span>
                  <span className="text-sm text-gray-500">{documents.length}</span>
                </button>
                
                {folders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolder(folder.id)}
                    className={`w-full text-left p-2 rounded flex items-center justify-between ${
                      selectedFolder === folder.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Folder className="w-4 h-4" />
                      {folder.name}
                    </span>
                    <span className="text-sm text-gray-500">{folder.count}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents List */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Search className="w-4 h-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    {searchQuery ? 'No documents found' : 'No documents uploaded yet'}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Upload documents to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{getFileIcon(doc.type)}</span>
                          <div>
                            <h3 className="font-medium">{doc.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {formatFileSize(doc.size)} • Uploaded {doc.uploadedAt.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => setDocuments(prev => prev.filter(d => d.id !== doc.id))}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}