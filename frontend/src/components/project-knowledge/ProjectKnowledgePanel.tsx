// src/components/project-knowledge/ProjectKnowledgePanel.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Download,
  Eye,
  Filter,
  Clock,
  FileImage,
  FileSpreadsheet,
  Calendar,
  Users,
  FolderOpen
} from 'lucide-react';

interface KnowledgeFile {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'xlsx' | 'csv' | 'txt' | 'md' | 'png' | 'jpg' | 'jpeg';
  size: number; // in bytes
  lastModified: Date;
  path?: string;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    sheets?: string[];
    columns?: string[];
    author?: string;
    extractedText?: string; // First 500 chars for preview
  };
  uploadedBy?: string;
  tags?: string[];
  status?: 'processing' | 'ready' | 'error';
}

interface KnowledgeFolder {
  id: string;
  name: string;
  files: KnowledgeFile[];
  subFolders: KnowledgeFolder[];
  expanded?: boolean;
  createdAt?: Date;
  description?: string;
}

interface ProjectKnowledgePanelProps {
  onSelect?: (files: KnowledgeFile[]) => void;
  onClose?: () => void;
  selectedFiles?: string[];
  mode?: 'select' | 'browse';
  allowMultiple?: boolean;
}

export function ProjectKnowledgePanel({ 
  onSelect, 
  onClose,
  selectedFiles = [],
  mode = 'browse',
  allowMultiple = true
}: ProjectKnowledgePanelProps) {
  // State management
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeFolder[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>(selectedFiles);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<KnowledgeFile | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('date');
  const [filterType, setFilterType] = useState<string>('all');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock enhanced project knowledge structure
  useEffect(() => {
    loadKnowledgeBase();
  }, []);

  const loadKnowledgeBase = async () => {
    // Mock data with enhanced metadata
    const mockData: KnowledgeFolder[] = [
      {
        id: 'folder-1',
        name: 'Course Materials',
        description: 'Main course documents and resources',
        expanded: true,
        createdAt: new Date('2023-09-01'),
        files: [
          { 
            id: 'file-1', 
            name: 'Introduction to AI.pdf', 
            type: 'pdf', 
            size: 1245000, 
            lastModified: new Date('2023-09-15'),
            metadata: {
              pageCount: 45,
              wordCount: 12500,
              author: 'Dr. Smith',
              extractedText: 'Artificial Intelligence is a branch of computer science that aims to create intelligent machines...'
            },
            uploadedBy: 'professor@university.edu',
            tags: ['ai', 'introduction', 'theory'],
            status: 'ready'
          },
          { 
            id: 'file-2', 
            name: 'Machine Learning Syllabus.docx', 
            type: 'docx', 
            size: 350000, 
            lastModified: new Date('2023-09-10'),
            metadata: {
              pageCount: 8,
              wordCount: 2800,
              author: 'Dr. Johnson',
              extractedText: 'This course provides a comprehensive introduction to machine learning algorithms...'
            },
            uploadedBy: 'professor@university.edu',
            tags: ['syllabus', 'ml', 'course-plan'],
            status: 'ready'
          },
          { 
            id: 'file-3', 
            name: 'Student Grades.xlsx', 
            type: 'xlsx', 
            size: 89000, 
            lastModified: new Date('2023-10-01'),
            metadata: {
              sheets: ['Midterm', 'Final', 'Assignments'],
              columns: ['Student ID', 'Name', 'Grade', 'Comments'],
              extractedText: 'Spreadsheet containing student performance data across multiple assessments...'
            },
            uploadedBy: 'ta@university.edu',
            tags: ['grades', 'assessment', 'data'],
            status: 'ready'
          }
        ],
        subFolders: [
          {
            id: 'folder-2',
            name: 'Lectures',
            description: 'Weekly lecture materials',
            createdAt: new Date('2023-09-05'),
            files: [
              { 
                id: 'file-4', 
                name: 'Week 1 - Introduction.pdf', 
                type: 'pdf', 
                size: 2500000, 
                lastModified: new Date('2023-09-18'),
                metadata: {
                  pageCount: 32,
                  wordCount: 8900,
                  extractedText: 'Welcome to the first week of our AI course. Today we will cover fundamental concepts...'
                },
                uploadedBy: 'professor@university.edu',
                tags: ['lecture', 'week1', 'introduction'],
                status: 'ready'
              },
              { 
                id: 'file-5', 
                name: 'Week 2 - Neural Networks.pdf', 
                type: 'pdf', 
                size: 3100000, 
                lastModified: new Date('2023-09-25'),
                metadata: {
                  pageCount: 28,
                  wordCount: 7600,
                  extractedText: 'Neural networks are computational models inspired by biological neural networks...'
                },
                uploadedBy: 'professor@university.edu',
                tags: ['lecture', 'week2', 'neural-networks'],
                status: 'ready'
              }
            ],
            subFolders: []
          },
          {
            id: 'folder-3',
            name: 'Assignments',
            description: 'Student assignments and submissions',
            createdAt: new Date('2023-09-10'),
            files: [
              { 
                id: 'file-6', 
                name: 'Assignment 1 - Linear Regression.pdf', 
                type: 'pdf', 
                size: 450000, 
                lastModified: new Date('2023-09-20'),
                metadata: {
                  pageCount: 5,
                  wordCount: 1200,
                  extractedText: 'Implement a linear regression model from scratch using Python...'
                },
                uploadedBy: 'professor@university.edu',
                tags: ['assignment', 'linear-regression', 'python'],
                status: 'ready'
              }
            ],
            subFolders: []
          }
        ]
      },
      {
        id: 'folder-4',
        name: 'Research Papers',
        description: 'Academic papers and references',
        createdAt: new Date('2023-08-15'),
        files: [
          { 
            id: 'file-7', 
            name: 'Deep Learning Survey.pdf', 
            type: 'pdf', 
            size: 3500000, 
            lastModified: new Date('2023-08-20'),
            metadata: {
              pageCount: 67,
              wordCount: 24500,
              author: 'Various Authors',
              extractedText: 'This comprehensive survey covers the recent advances in deep learning methodologies...'
            },
            uploadedBy: 'researcher@university.edu',
            tags: ['research', 'deep-learning', 'survey'],
            status: 'ready'
          }
        ],
        subFolders: []
      }
    ];
    setKnowledgeBase(mockData);
  };

  // File selection handlers
  const toggleFileSelection = (fileId: string) => {
    if (mode === 'select') {
      if (allowMultiple) {
        setSelectedFileIds(prev => 
          prev.includes(fileId) 
            ? prev.filter(id => id !== fileId)
            : [...prev, fileId]
        );
      } else {
        setSelectedFileIds([fileId]);
      }
    }
  };

  const toggleFolderExpansion = (folderId: string) => {
    const updateFolders = (folders: KnowledgeFolder[]): KnowledgeFolder[] => {
      return folders.map(folder => {
        if (folder.id === folderId) {
          return { ...folder, expanded: !folder.expanded };
        }
        if (folder.subFolders.length > 0) {
          return { ...folder, subFolders: updateFolders(folder.subFolders) };
        }
        return folder;
      });
    };
    setKnowledgeBase(updateFolders);
  };

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setUploading(true);

    // Mock file processing with metadata extraction
    setTimeout(() => {
      const newFiles: KnowledgeFile[] = Array.from(files).map(file => ({
        id: `file-${Date.now()}-${Math.random()}`,
        name: file.name,
        type: file.name.split('.').pop()?.toLowerCase() as any,
        size: file.size,
        lastModified: new Date(),
        uploadedBy: 'current@user.edu',
        tags: [],
        status: 'processing' // Would be 'ready' after actual processing
      }));
      
      // Add to the selected folder or root
      setKnowledgeBase(prev => {
        const updatedFolders = [...prev];
        if (selectedFolder) {
          // Add to specific folder (simplified for demo)
          updatedFolders[0] = {
            ...updatedFolders[0],
            files: [...updatedFolders[0].files, ...newFiles]
          };
        } else {
          updatedFolders[0] = {
            ...updatedFolders[0],
            files: [...updatedFolders[0].files, ...newFiles]
          };
        }
        return updatedFolders;
      });
      
      setUploading(false);
    }, 2000);
  };

  // Filter and search logic
  const filterFiles = (files: KnowledgeFile[]): KnowledgeFile[] => {
    let filtered = files;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(file => 
        file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        file.metadata?.extractedText?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(file => file.type === filterType);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return b.lastModified.getTime() - a.lastModified.getTime();
        case 'size':
          return b.size - a.size;
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

    return filtered;
  };

  // File icon helper
  const getFileIcon = (file: KnowledgeFile) => {
    const iconProps = { size: 16, className: "flex-shrink-0" };
    
    switch (file.type) {
      case 'pdf':
        return <FileText {...iconProps} className="text-red-500 dark:text-red-400" />;
      case 'docx':
        return <FileText {...iconProps} className="text-blue-500 dark:text-blue-400" />;
      case 'xlsx':
      case 'csv':
        return <FileSpreadsheet {...iconProps} className="text-green-500 dark:text-green-400" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
        return <FileImage {...iconProps} className="text-purple-500 dark:text-purple-400" />;
      default:
        return <File {...iconProps} className="text-gray-500 dark:text-gray-400" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Handle applying selection
  const handleApplySelection = () => {
    if (!onSelect) return;
    
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
    if (onClose) onClose();
  };

  // Render file item
  const renderFile = (file: KnowledgeFile) => {
    const isSelected = selectedFileIds.includes(file.id);
    
    return (
      <div 
        key={file.id}
        className={`group relative p-3 rounded-lg border transition-all duration-200 ${
          isSelected 
            ? 'border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20' 
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
        } ${mode === 'select' ? 'cursor-pointer' : ''}`}
        onClick={() => mode === 'select' && toggleFileSelection(file.id)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {/* File icon and selection */}
            <div className="flex items-center space-x-2">
              {mode === 'select' && (
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                  isSelected 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {isSelected && <Check size={12} />}
                </div>
              )}
              {getFileIcon(file)}
            </div>

            {/* File details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {file.name}
                </h4>
                {file.status === 'processing' && (
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                )}
              </div>
              
              <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                <span>{formatFileSize(file.size)}</span>
                <span>{file.lastModified.toLocaleDateString()}</span>
                {file.metadata?.pageCount && (
                  <span>{file.metadata.pageCount} pages</span>
                )}
                {file.metadata?.wordCount && (
                  <span>{file.metadata.wordCount.toLocaleString()} words</span>
                )}
              </div>

              {file.metadata?.extractedText && (
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                  {file.metadata.extractedText}
                </p>
              )}

              {file.tags && file.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {file.tags.slice(0, 3).map(tag => (
                    <span 
                      key={tag}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                  {file.tags.length > 3 && (
                    <span className="text-xs text-gray-500">+{file.tags.length - 3} more</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreviewFile(file);
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Preview"
            >
              <Eye size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Handle download
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Download"
            >
              <Download size={14} />
            </button>
            <button className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render folder
  const renderFolder = (folder: KnowledgeFolder, depth = 0) => {
    const filteredFiles = filterFiles(folder.files);
    
    return (
      <div key={folder.id} className="space-y-2">
        {/* Folder header */}
        <div 
          className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer"
          onClick={() => toggleFolderExpansion(folder.id)}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {folder.expanded ? (
            <ChevronDown size={16} className="text-gray-500" />
          ) : (
            <ChevronRight size={16} className="text-gray-500" />
          )}
          <FolderOpen size={16} className="text-blue-500 dark:text-blue-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {folder.name}
          </span>
          <span className="text-xs text-gray-500">
            ({folder.files.length} files)
          </span>
        </div>

        {/* Folder contents */}
        {folder.expanded && (
          <div className="space-y-2" style={{ paddingLeft: `${(depth + 1) * 16}px` }}>
            {/* Files */}
            {filteredFiles.map(renderFile)}
            
            {/* Subfolders */}
            {folder.subFolders.map(subfolder => renderFolder(subfolder, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Folder className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Project Knowledge
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          {mode === 'select' && selectedFileIds.length > 0 && (
            <button
              onClick={handleApplySelection}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Use Selected ({selectedFileIds.length})
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
        {/* Search and upload */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search files, content, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Plus size={16} />
            )}
            <span className="text-sm">Upload</span>
          </button>
        </div>

        {/* Filters and sorting */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All files</option>
              <option value="pdf">PDF</option>
              <option value="docx">Word</option>
              <option value="xlsx">Excel</option>
              <option value="csv">CSV</option>
              <option value="txt">Text</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="size">Sort by Size</option>
              <option value="type">Sort by Type</option>
            </select>
          </div>

          <div className="text-xs text-gray-500">
            {knowledgeBase.reduce((total, folder) => total + folder.files.length, 0)} total files
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {knowledgeBase.map(folder => renderFolder(folder))}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileUpload}
        className="hidden"
        accept=".pdf,.docx,.xlsx,.csv,.txt,.md,.png,.jpg,.jpeg"
      />

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {previewFile.name}
              </h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Size:</span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">{formatFileSize(previewFile.size)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Modified:</span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">{previewFile.lastModified.toLocaleDateString()}</span>
                </div>
                {previewFile.metadata?.pageCount && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Pages:</span>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">{previewFile.metadata.pageCount}</span>
                  </div>
                )}
                {previewFile.metadata?.wordCount && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Words:</span>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">{previewFile.metadata.wordCount.toLocaleString()}</span>
                  </div>
                )}
              </div>
              
              {previewFile.metadata?.extractedText && (
                <div>
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Content Preview:</h4>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-600 dark:text-gray-300">
                    {previewFile.metadata.extractedText}...
                  </div>
                </div>
              )}

              {previewFile.tags && previewFile.tags.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Tags:</h4>
                  <div className="flex flex-wrap gap-2">
                    {previewFile.tags.map(tag => (
                      <span 
                        key={tag}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}