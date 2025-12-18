'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, Video, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type UploadState = 'idle' | 'creating' | 'uploading' | 'completing' | 'done' | 'error';

export default function NewGamePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [opponent, setOpponent] = useState('');
  const [gameDate, setGameDate] = useState('');
  const [sport, setSport] = useState<'football' | 'basketball' | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Please select a valid video file (MP4, MOV, AVI, or WebM)');
        return;
      }
      // Validate file size (5GB max)
      if (selectedFile.size > 5 * 1024 * 1024 * 1024) {
        setError('File size must be less than 5GB');
        return;
      }
      setFile(selectedFile);
      setError('');
      // Auto-fill title if empty
      if (!title) {
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, '');
        setTitle(fileName);
      }
    }
  }, [title]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const input = document.getElementById('video-upload') as HTMLInputElement;
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(droppedFile);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    setError('');

    try {
      // Step 1: Create game record
      setUploadState('creating');
      const createRes = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          opponent: opponent || undefined,
          gameDate: gameDate || undefined,
          sport: sport || undefined,
        }),
      });

      if (!createRes.ok) {
        throw new Error('Failed to create game');
      }

      const { game } = await createRes.json();

      // Step 2: Get presigned upload URL
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: game.id,
          filename: file.name,
          contentType: file.type,
        }),
      });

      if (!presignedRes.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, key } = await presignedRes.json();

      // Step 3: Upload file to R2
      setUploadState('uploading');

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error('Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(file);
      });

      // Step 4: Mark upload complete
      setUploadState('completing');
      const completeRes = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: game.id,
          key,
          fileSize: file.size,
        }),
      });

      if (!completeRes.ok) {
        throw new Error('Failed to complete upload');
      }

      setUploadState('done');

      // Redirect to game page after a moment
      setTimeout(() => {
        router.push(`/game/${game.id}`);
      }, 1500);

    } catch (err) {
      setUploadState('error');
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const isUploading = ['creating', 'uploading', 'completing'].includes(uploadState);

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Back link */}
      <Link href="/games" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Games
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Game Film</h1>
        <p className="text-gray-500 mb-6">Upload your game footage and our AI will analyze every player.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Area */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Video File
            </Label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                file ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-[#0f2d52]'
              }`}
            >
              <input
                id="video-upload"
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <Video className="w-8 h-8 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-1">Drag and drop your video here, or click to browse</p>
                  <p className="text-sm text-gray-400">MP4, MOV, AVI, WebM up to 5GB</p>
                </>
              )}
            </div>
          </div>

          {/* Game Details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Game Title *
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Week 5 vs Lincoln High"
                required
                disabled={isUploading}
              />
            </div>
            <div>
              <Label htmlFor="opponent" className="block text-sm font-medium text-gray-700 mb-1">
                Opponent
              </Label>
              <Input
                id="opponent"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="e.g., Lincoln High"
                disabled={isUploading}
              />
            </div>
            <div>
              <Label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Game Date
              </Label>
              <Input
                id="date"
                type="date"
                value={gameDate}
                onChange={(e) => setGameDate(e.target.value)}
                disabled={isUploading}
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Sport (or let AI detect)
              </Label>
              <div className="flex gap-3">
                {[
                  { value: '', label: 'Auto-detect' },
                  { value: 'football', label: 'Football' },
                  { value: 'basketball', label: 'Basketball' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSport(option.value as any)}
                    disabled={isUploading}
                    className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${
                      sport === option.value
                        ? 'border-[#0f2d52] bg-[#0f2d52]/5 text-[#0f2d52]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-600 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="font-medium text-blue-900">
                  {uploadState === 'creating' && 'Creating game...'}
                  {uploadState === 'uploading' && `Uploading video... ${uploadProgress}%`}
                  {uploadState === 'completing' && 'Finishing up...'}
                </span>
              </div>
              {uploadState === 'uploading' && (
                <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Success State */}
          {uploadState === 'done' && (
            <div className="bg-green-50 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-900">
                Upload complete! Redirecting to your game...
              </span>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!file || !title || isUploading || uploadState === 'done'}
            className="w-full bg-[#0f2d52] hover:bg-[#1a4a7a] py-3 text-base"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload & Analyze
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
