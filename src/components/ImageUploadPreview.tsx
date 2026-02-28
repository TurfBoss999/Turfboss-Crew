'use client';

// ================================
// IMAGE UPLOAD PREVIEW COMPONENT
// ================================

import { useState, useRef } from 'react';

interface UploadedImage {
  id: string;
  url: string;
  file: File;
}

interface ImageUploadPreviewProps {
  onUpload: (file: File, previewUrl: string) => void;
  maxFiles?: number;
}

export function ImageUploadPreview({ onUpload, maxFiles = 5 }: ImageUploadPreviewProps) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxFiles - images.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    setIsUploading(true);

    for (const file of filesToProcess) {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      
      const newImage: UploadedImage = {
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        url: previewUrl,
        file,
      };

      setImages(prev => [...prev, newImage]);
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      onUpload(file, previewUrl);
    }

    setIsUploading(false);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (imageId: string) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => img.id === imageId);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.url);
      }
      return prev.filter(img => img.id !== imageId);
    });
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      {/* Upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        capture="environment"
      />

      {images.length < maxFiles && (
        <button
          onClick={triggerFileInput}
          disabled={isUploading}
          className="w-full py-4 px-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-emerald-500 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Take or Upload Photo</span>
            </>
          )}
        </button>
      )}

      {/* Image previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((image) => (
            <div key={image.id} className="relative aspect-square rounded-lg overflow-hidden group">
              <img
                src={image.url}
                alt="Uploaded preview"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => handleRemoveImage(image.id)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {/* Always visible delete button on mobile */}
              <button
                onClick={() => handleRemoveImage(image.id)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center sm:hidden"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload count */}
      {images.length > 0 && (
        <p className="text-xs text-gray-500 text-center">
          {images.length} of {maxFiles} photos uploaded
        </p>
      )}
    </div>
  );
}
