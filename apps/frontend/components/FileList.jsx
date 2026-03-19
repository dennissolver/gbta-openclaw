import React, { useState, useEffect, useCallback } from 'react';
import { getFileIcon, formatSize } from './FileUploader';

export default function FileList({ projectId, getAuthHeaders, refreshTrigger, compact }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchFiles = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      const resp = await fetch(`/api/files/list?projectId=${projectId}`, { headers });
      if (resp.ok) {
        const data = await resp.json();
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error('Failed to fetch files:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, getAuthHeaders]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles, refreshTrigger]);

  const handleDelete = async (fileId) => {
    setDeleting(fileId);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(getAuthHeaders ? await getAuthHeaders() : {}),
      };
      const resp = await fetch('/api/files/delete', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ fileId }),
      });
      if (resp.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        if (expandedId === fileId) setExpandedId(null);
      }
    } catch (err) {
      console.error('Failed to delete file:', err);
    } finally {
      setDeleting(null);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (loading && files.length === 0) {
    return (
      <div className="text-xs text-dark-500 py-2 text-center">Loading files...</div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-xs text-dark-500 py-2 text-center">No files yet</div>
    );
  }

  return (
    <div className="space-y-1">
      {/* File count badge */}
      {!compact && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-dark-400 uppercase tracking-wide">Project Files</span>
          <span className="text-xs bg-dark-700 text-dark-300 px-2 py-0.5 rounded-full">
            {files.length}
          </span>
        </div>
      )}

      {files.map((file) => {
        const { icon, color } = getFileIcon(file.file_type);
        const isExpanded = expandedId === file.id;
        const sourceIcon = file.source_type === 'url' ? '🔗' : file.source_type === 'text' ? '📝' : '';

        return (
          <div
            key={file.id}
            className="bg-dark-800 border border-dark-700 rounded-lg overflow-hidden"
          >
            <div
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-dark-750 transition-colors"
              onClick={() => toggleExpand(file.id)}
            >
              <span className={`text-sm flex-shrink-0 ${color}`}>{icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-dark-200 truncate">
                  {sourceIcon && <span className="mr-1">{sourceIcon}</span>}
                  {file.filename}
                </div>
                <div className="text-xs text-dark-500 flex items-center gap-2">
                  <span>{formatSize(file.file_size)}</span>
                  {file.has_extracted_text && (
                    <span className="text-brand-400" title="Text extracted">
                      &#x2713; text
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(file.id);
                }}
                disabled={deleting === file.id}
                className="text-dark-500 hover:text-red-400 text-xs px-1 flex-shrink-0 transition-colors"
                title="Delete file"
              >
                {deleting === file.id ? '...' : 'x'}
              </button>
            </div>

            {/* Expanded text preview */}
            {isExpanded && file.extracted_text_preview && (
              <div className="px-3 pb-3 border-t border-dark-700">
                <div className="mt-2 text-xs text-dark-400 bg-dark-900 rounded p-2 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono">
                  {file.extracted_text_preview}
                </div>
                {file.source_url && (
                  <a
                    href={file.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-400 hover:text-brand-300 mt-1 inline-block"
                  >
                    Open source URL
                  </a>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
