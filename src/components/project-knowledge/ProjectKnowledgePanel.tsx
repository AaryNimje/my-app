// src/components/project-knowledge/ProjectKnowledgePanel.tsx
'use client';

import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Folder, 
  File, 
  X, 
  Search, 
  Plus, 
  Check,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Trash,
  Edit,
  Download
} from 'lucide-react';

interface KnowledgeFile {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'xlsx' | 'csv' | 'txt' | 'md';
  size: number; // in bytes
  lastModified: Date;
  path?: string;
}

interface KnowledgeFolder {
  id: string;
  name: string;
  files: KnowledgeFile[];
  subFolders: KnowledgeFolder[];
  expanded?: boolean;
}

interface ProjectKnowledgePanelProps {
  onSelect?: (files: KnowledgeFile[]) => void;
  onClose?: () => void;
  selectedFiles?: string[];
}

export function ProjectKnowledgePanel({ 
  onSelect, 
  onClose,
  selectedFiles = []
}: ProjectKnowledgePanelProps) {
  // Mock project knowledge structure
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeFolder[]>([
    {
      id: 'folder-1',
      name: 'Course Materials',
      expanded: true,
      files: [
        { id: 'file-1', name: 'Introduction to AI.pdf', type: 'pdf', size: 1245000, lastModified: new Date('2023-09-15') },
        { id: 'file-2', name: 'Machine Learning Syllabus.docx', type: 'docx', size: 350000, lastModified: new Date('2023-09-10') },
        { id: 'file-3', name: 'Reading List.pdf', type: 'pdf', size: 550000, lastModified: new Date('2023-09-12') }
      ],
      subFolders: [
        {
          id: 'folder-2',
          name: 'Lectures',
          files: [
            { id: 'file-4', name: 'Week 1 - Introduction.pdf', type: 'pdf', size: 2500000, lastModified: new Date('2023-09-18') },
            { id: 'file-5', name: 'Week 2 - Neural Networks.pdf', type: 'pdf', size: 3100000, lastModified: new Date('2023-09-25') }
          ],
          subFolders: []
        }
      ]
    },
    {
      id: 'folder-3',
      name: 'Research Papers',
      files: [
        { id: 'file-6', name: 'Attention Mechanisms.pdf', type: 'pdf', size: 1800000, lastModified: new Date('2023-08-20') },
        { id: 'file-7', name: 'Large Language Models.pdf', type: 'pdf', size: 2200000, lastModified: new Date('2023-07-15') }
      ],
      subFolders: []
    },
    {
      id: 'folder-4',
      name: 'Student Data',
      files: [
        { id: 'file-8', name: 'Grades Q1 2023.xlsx', type: 'xlsx', size: 450000, lastModified: new Date('2023-10-01') },
        { id: 'file-9', name: 'Engagement Metrics.csv', type: 'csv', size: 250000, lastModified: new Date('2023-09-28') }
      ],
      subFolders: []
    }
  ]);
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>(selectedFiles);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    const updateFolders = (folders: KnowledgeFolder[]): KnowledgeFolder[] => {
      return folders.map(folder => {
        if (folder.id === folderId) {
          return { ...folder, expanded: !folder.expanded };
        }
        
        if (folder.subFolders.length > 0) {
          return {
            ...folder,
            subFolders: updateFolders(folder.subFolders)
          };
        }
        
        return folder;
      });
    };
    
    setKnowledgeBase(updateFolders(knowledgeBase));
  };
  
  // Toggle file selection
  const toggleFileSelection = (fileId: string) => {
    setSelectedFileIds(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });
  };
  
  // Handle file upload
  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    
    // Simulate file upload
    setTimeout(() => {
      // Create mock file entries
      const newFiles: KnowledgeFile[] = Array.from(files).map(file => ({
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: file.name,
        type: file.name.split('.').pop()! as any,
        size: file.size,
        lastModified: new Date()
      }));
      
      // Add to the root folder for this example
      setKnowledgeBase(prev => {
        const updatedFolders = [...prev];
        updatedFolders[0] = {
          ...updatedFolders[0],
          files: [...updatedFolders[0].files, ...newFiles]
        };
        return updatedFolders;
      });
      
      setUploading(false);
    }, 1500);
  };
  
  // Handle applying selection
  const handleApplySelection = () => {
    if (!onSelect) return;
    
    // Find all selected files
    const findSelectedFiles = (folders: KnowledgeFolder[]): KnowledgeFile[] => {
      let files: KnowledgeFile[] = [];
      
      for (const folder of folders) {
        files = [
          ...files,
          ...folder.files.filter(file => selectedFileIds.includes(file.id))
        ];
        
        if (folder.subFolders.length > 0) {
          files = [...files, ...findSelectedFiles(folder.subFolders)];
        }
      }
      
      return files;
    };
    
    const selectedFiles = findSelectedFiles(knowledgeBase);
    onSelect(selectedFiles);
  };
  
  // Render a file item
  const renderFile = (file: KnowledgeFile) => {
    const isSelected = selectedFileIds.includes(file.id);
    
    // Determine file icon based on type
    const getFileIcon = () => {
      switch (file.type) {
        case 'pdf':
          return <FileText size={16} className="text-red-500 dark:text-red-400" />;
        case 'docx':
          return <FileText size={16} className="text-blue-500 dark:text-blue-400" />;
        case 'xlsx':
        case 'csv':
          return <FileText size={16} className="text-green-500 dark:text-green-400" />;
        default:
          return <File size={16} className="text-gray-500 dark:text-gray-400" />;
      }
    };
    
    return (
      <div 
        key={file.id}
        className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${
          isSelected 
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        onClick={() => toggleFileSelection(file.id)}
      >
        <div className="flex items-center space-x-2">
          <div className="w-6 flex-shrink-0">
            {isSelected ? (
              <div className="w-5 h-5 rounded-sm bg-blue-500 dark:bg-blue-600 flex items-center justify-center">
                <Check size={14} className="text-white" />
              </div>
            ) : (
              getFileIcon()
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{file.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatBytes(file.size)} • {formatDate(file.lastModified)}
            </div>
          </div>
        </div>
        
        <button className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none">
          <MoreHorizontal size={14} />
        </button>
      </div>
    );
  };
  
  // Render a folder and its contents recursively
  const renderFolder = (folder: KnowledgeFolder, level = 0) => {
    // Filter files by search term if one exists
    const filteredFiles = searchTerm
      ? folder.files.filter(file => 
          file.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : folder.files;
    
    // Skip folders that don't match search when searching
    const shouldRenderFolder = !searchTerm || 
      filteredFiles.length > 0 || 
      folder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      folder.subFolders.some(subFolder => 
        subFolder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subFolder.files.some(file => file.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    
    if (!shouldRenderFolder) return null;
    
    return (
      <div key={folder.id} className="space-y-1">
        <div 
          className="flex items-center p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={() => toggleFolder(folder.id)}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          <div className="mr-1 text-gray-500 dark:text-gray-400">
            {folder.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
          <Folder 
            size={16} 
            className={folder.expanded 
              ? 'text-blue-500 dark:text-blue-400' 
              : 'text-gray-500 dark:text-gray-400'
            } 
          />
          <span className="ml-2 text-sm font-medium">{folder.name}</span>
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            ({folder.files.length + 
              folder.subFolders.reduce((sum, subFolder) => sum + countFilesRecursively(subFolder), 0)})
          </span>
        </div>
        
        {folder.expanded && (
          <div className="ml-4 space-y-1">
            {filteredFiles.map(file => renderFile(file))}
            {folder.subFolders.map(subFolder => renderFolder(subFolder, level + 1))}
          </div>
        )}
      </div>
    );
  };
  
  // Utility function to count files recursively
  const countFilesRecursively = (folder: KnowledgeFolder): number => {
    return folder.files.length + 
      folder.subFolders.reduce((sum, subFolder) => sum + countFilesRecursively(subFolder), 0);
  };
  
  // Utility function to format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };
  
  // Utility function to format date
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Project Knowledge</h2>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 rounded-full"
          >
            <X size={20} />
          </button>
        )}
      </div>
      
      {/* Search and Actions */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white"
            />
          </div>
          
          <button
            onClick={handleFileUpload}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            <Upload size={16} />
            <span>Upload</span>
          </button>
          
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 p-2 overflow-y-auto">
        {uploading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 dark:border-blue-400 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Uploading files...</p>
            </div>
          </div>
        ) : knowledgeBase.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Folder size={48} className="mx-auto text-gray-400 dark:text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No files yet</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Upload files to your project knowledge base
              </p>
              <button
                onClick={handleFileUpload}
                className="mt-3 flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md mx-auto"
              >
                <Upload size={16} />
                <span>Upload Files</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {knowledgeBase.map(folder => renderFolder(folder))}
          </div>
        )}
      </div>
      
      {/* Footer with selection info */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {selectedFileIds.length === 0 
            ? 'No files selected' 
            : `${selectedFileIds.length} file${selectedFileIds.length === 1 ? '' : 's'} selected`}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedFileIds([])}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
          >
            Clear
          </button>
          
          <button
            onClick={handleApplySelection}
            disabled={selectedFileIds.length === 0}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:pointer-events-none"
          >
            Apply Selection
          </button>
        </div>
      </div>
    </div>
  );
}