import React, { useState, useRef, useCallback } from 'react';

const FILE_ICONS = {
  'application/pdf': { icon: '📄', color: 'text-red-400' },
  'text/plain': { icon: '📝', color: 'text-blue-400' },
  'text/csv': { icon: '📊', color: 'text-green-400' },
  'text/html': { icon: '🌐', color: 'text-orange-400' },
  'text/markdown': { icon: '📝', color: 'text-purple-400' },
  'application/json': { icon: '{ }', color: 'text-yellow-400' },
  'image/': { icon: '🖼️', color: 'text-pink-400' },
  'application/msword': { icon: '📘', color: 'text-blue-500' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml': { icon: '📘', color: 'text-blue-500' },
  'application/vnd.ms-excel': { icon: '📗', color: 'text-green-500' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml': { icon: '📗', color: 'text-green-500' },
};

function getFileIcon(mimeType) {
  if (!mimeType) return { icon: '📎', color: 'text-dark-400' };
  for (const [key, val] of Object.entries(FILE_ICONS)) {
    if (mimeType.startsWith(key)) return val;
  }
  return { icon: '📎', color: 'text-dark-400' };
}

function formatSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function FileUploader({ projectId, sessionKey, getAuthHeaders, onFilesChange }) {
  const [activeTab, setActiveTab] = useState('upload');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // URL tab state
  const [url, setUrl] = useState('');
  const [fetchingUrl, setFetchingUrl] = useState(false);

  // Text tab state
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [savingText, setSavingText] = useState(false);

  // Drag state
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const clearMessages = () => { setError(''); setSuccess(''); };

  const uploadFiles = useCallback(async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    clearMessages();
    setUploading(true);

    const headers = getAuthHeaders ? await getAuthHeaders() : {};
    const results = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const fileKey = `${file.name}-${Date.now()}`;
      setUploadProgress((prev) => ({ ...prev, [fileKey]: { name: file.name, progress: 0 } }));

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectId);
        if (sessionKey) formData.append('sessionKey', sessionKey);

        const resp = await fetch('/api/files/upload', {
          method: 'POST',
          headers,
          body: formData,
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error || `Upload failed: HTTP ${resp.status}`);
        }

        const data = await resp.json();
        results.push(data);
        setUploadProgress((prev) => ({ ...prev, [fileKey]: { name: file.name, progress: 100 } }));
      } catch (err) {
        setUploadProgress((prev) => ({ ...prev, [fileKey]: { name: file.name, progress: -1, error: err.message } }));
        setError(err.message);
      }
    }

    setUploading(false);
    if (results.length > 0) {
      setSuccess(`${results.length} file${results.length > 1 ? 's' : ''} uploaded successfully`);
      onFilesChange?.();
    }

    // Clear progress after a delay
    setTimeout(() => setUploadProgress({}), 3000);
  }, [projectId, sessionKey, getAuthHeaders, onFilesChange]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(e.dataTransfer.files);
  }, [uploadFiles]);

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const handleFileSelect = (e) => {
    uploadFiles(e.target.files);
    e.target.value = '';
  };

  const handleFetchUrl = async () => {
    if (!url.trim()) return;
    clearMessages();
    setFetchingUrl(true);

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(getAuthHeaders ? await getAuthHeaders() : {}),
      };
      const resp = await fetch('/api/files/add-url', {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: url.trim(), projectId, sessionKey }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Fetch failed: HTTP ${resp.status}`);
      }

      const data = await resp.json();
      setSuccess(`URL content saved: ${data.filename}`);
      setUrl('');
      onFilesChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setFetchingUrl(false);
    }
  };

  const handleSaveText = async () => {
    if (!textContent.trim()) return;
    clearMessages();
    setSavingText(true);

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(getAuthHeaders ? await getAuthHeaders() : {}),
      };
      const resp = await fetch('/api/files/add-text', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: textContent.trim(),
          title: textTitle.trim() || 'Untitled Text',
          projectId,
          sessionKey,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Save failed: HTTP ${resp.status}`);
      }

      setSuccess('Text saved successfully');
      setTextTitle('');
      setTextContent('');
      onFilesChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingText(false);
    }
  };

  const tabs = [
    { id: 'upload', label: 'Upload File' },
    { id: 'url', label: 'Add URL' },
    { id: 'text', label: 'Add Text' },
  ];

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-1 bg-dark-800 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); clearMessages(); }}
            className={`flex-1 text-xs py-1.5 px-2 rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-brand-600 text-white'
                : 'text-dark-400 hover:text-white hover:bg-dark-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Upload File Tab */}
      {activeTab === 'upload' && (
        <div>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-brand-500 bg-brand-500/10'
                : 'border-dark-600 hover:border-dark-500 hover:bg-dark-800/50'
            }`}
          >
            <div className="text-2xl mb-2">
              {uploading ? '⏳' : '📁'}
            </div>
            <p className="text-sm text-dark-300">
              {uploading ? 'Uploading...' : 'Drop files here or click to browse'}
            </p>
            <p className="text-xs text-dark-500 mt-1">
              PDF, DOC, XLS, images, text files (max 50MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.json,.html,.xml,.yaml,.yml,.png,.jpg,.jpeg,.gif,.bmp,.webp,.svg"
            />
          </div>

          {/* Upload progress */}
          {Object.entries(uploadProgress).length > 0 && (
            <div className="mt-2 space-y-1">
              {Object.entries(uploadProgress).map(([key, item]) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className="truncate flex-1 text-dark-300">{item.name}</span>
                  {item.progress === 100 && (
                    <span className="text-green-400">Done</span>
                  )}
                  {item.progress === -1 && (
                    <span className="text-red-400">Failed</span>
                  )}
                  {item.progress >= 0 && item.progress < 100 && (
                    <div className="w-16 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add URL Tab */}
      {activeTab === 'url' && (
        <div className="space-y-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/page"
            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500 placeholder-dark-500"
          />
          <button
            onClick={handleFetchUrl}
            disabled={!url.trim() || fetchingUrl}
            className="w-full btn-primary text-sm py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {fetchingUrl ? 'Fetching...' : 'Fetch URL Content'}
          </button>
        </div>
      )}

      {/* Add Text Tab */}
      {activeTab === 'text' && (
        <div className="space-y-2">
          <input
            type="text"
            value={textTitle}
            onChange={(e) => setTextTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500 placeholder-dark-500"
          />
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Paste text content here..."
            rows={5}
            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-brand-500 placeholder-dark-500"
          />
          <button
            onClick={handleSaveText}
            disabled={!textContent.trim() || savingText}
            className="w-full btn-primary text-sm py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {savingText ? 'Saving...' : 'Save Text'}
          </button>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
          {success}
        </div>
      )}
    </div>
  );
}

// Export helpers for use in FileList
export { getFileIcon, formatSize };
