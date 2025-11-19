```tsx
// Example chunked upload component for admin/lexicon-setup
// Usage: <UploadLexicon uploadEndpoint="/api/lexicon/upload" />
// This component uses the frontend fetch helper `fetchWithTimeout` / `fetchWithTimeoutRetry`
// to upload large files in 5MB chunks and then POST /commit to assemble and process.

import React, { useState } from 'react';
import { fetchWithTimeoutRetry } from '@/lib/fetch';

type Props = {
  uploadEndpoint: string; // e.g. /api/lexicon/upload
  authToken?: string;
};

export default function UploadLexicon({ uploadEndpoint, authToken }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string | null>(null);

  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

  async function handleUpload() {
    if (!file) return;
    setStatus('Uploading');
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const chunk = file.slice(start, start + CHUNK_SIZE);
        const form = new FormData();
        form.append('chunk', chunk);
        form.append('index', String(i));
        form.append('total', String(totalChunks));
        form.append('filename', file.name);
        const headers: Record<string, string> = {};
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
        const res = await fetchWithTimeoutRetry(`${uploadEndpoint}`, {
          method: 'POST',
          body: form,
          headers
        }, 60_000, 2);
        if (!res.ok) throw new Error(`Upload chunk ${i} failed: ${res.status}`);
        setProgress(Math.round(((i + 1) / totalChunks) * 100));
      }
      // commit
      const commitRes = await fetchWithTimeoutRetry(`${uploadEndpoint}/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ filename: file.name })
      }, 30_000, 2);
      if (!commitRes.ok) throw new Error(`Commit failed: ${commitRes.status}`);
      setStatus('Completed');
    } catch (err: any) {
      console.error('Upload error', err);
      setStatus(`Error: ${err.message || err}`);
    }
  }

  return (
    <div>
      <h3>Upload Lexicon (chunked)</h3>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button disabled={!file || status === 'Uploading'} onClick={handleUpload}>Upload</button>
      <div>Progress: {progress}%</div>
      {status && <div>Status: {status}</div>}
    </div>
  );
}
