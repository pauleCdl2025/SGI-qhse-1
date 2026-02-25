import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/Icon";
import { showError } from '@/utils/toast';

interface ImageUploadProps {
  onFilesChange: (files: File[]) => void; // Still emits File[] for parent to handle upload
  initialImageUrls?: string[]; // To display existing images
  label?: string; // Custom label for the upload section
}

export const ImageUpload = ({ onFilesChange, initialImageUrls = [], label = "Photos de l'incident" }: ImageUploadProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(initialImageUrls); // Can include initial URLs
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    const newFiles = [...files, ...selectedFiles];
    if (newFiles.length + initialImageUrls.length > 5) { // Check total images including initial
      showError("Vous ne pouvez télécharger que 5 images au maximum.");
      return;
    }
    
    setFiles(newFiles);
    onFilesChange(newFiles); // Emit new File objects for parent to upload

    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    // If removing an initial image, it means it's an existing URL
    // If removing a newly added file, it means it's a local File object
    const isInitialImage = index < initialImageUrls.length;

    if (isInitialImage) {
      // For initial images, we just remove the preview. The parent component
      // will need to handle the deletion from storage if necessary.
      const updatedPreviews = previews.filter((_, i) => i !== index);
      setPreviews(updatedPreviews);
      // We don't call onFilesChange here as it's for new files.
      // The parent should manage existing image URLs separately.
    } else {
      // For newly added files, remove both the file and its preview
      const fileIndex = index - initialImageUrls.length;
      const updatedFiles = files.filter((_, i) => i !== fileIndex);
      const updatedPreviews = previews.filter((_, i) => i !== index);
      
      setFiles(updatedFiles);
      setPreviews(updatedPreviews);
      onFilesChange(updatedFiles);

      // Clean up object URLs for local files
      URL.revokeObjectURL(previews[index]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <label htmlFor="photo-upload" className="cursor-pointer">
          <Icon name="Camera" className="mx-auto text-4xl text-gray-400 mb-2" />
          <p className="text-gray-600">Cliquez pour prendre une photo ou uploader des images</p>
          <p className="text-xs text-gray-500 mt-2">Max 5 images (JPG, PNG)</p>
        </label>
        <Input 
          id="photo-upload" 
          type="file" 
          multiple 
          accept="image/jpeg, image/png" 
          className="hidden" 
          onChange={handleFileChange}
          ref={fileInputRef}
        />
      </div>
      {previews.length > 0 && (
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative">
              <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded-md" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={() => removeFile(index)}
              >
                <Icon name="X" className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};