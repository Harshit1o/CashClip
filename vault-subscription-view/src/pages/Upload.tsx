import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload as UploadIcon, X, FileText, FileAudio, Video } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from "@/integrations/supabase/client";

type FileType = 'video' | 'audio' | 'ebook';

const Upload: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileType, setFileType] = useState<FileType>('video');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const fileTypeIcons = {
    video: <Video className="h-10 w-10 text-blue-500" />,
    audio: <FileAudio className="h-10 w-10 text-purple-500" />,
    ebook: <FileText className="h-10 w-10 text-red-500" />
  };

  const fileTypeExtensions = {
    video: '.mp4,.webm,.mov',
    audio: '.mp3,.wav,.aac',
    ebook: '.pdf'
  };

  const buckets = {
    video: 'videos',
    audio: 'audio',
    ebook: 'ebooks'
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    // Validate file type based on selected type
    let isValid = false;
    
    if (fileType === 'video' && file.type.startsWith('video/')) {
      isValid = true;
    } else if (fileType === 'audio' && file.type.startsWith('audio/')) {
      isValid = true;
    } else if (fileType === 'ebook' && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
      isValid = true;
    }

    if (isValid) {
      setSelectedFile(file);
      if (!title) setTitle(file.name.split('.')[0]);
    } else {
      toast({
        title: "Invalid file type",
        description: `Please upload a ${fileType} file.`,
        variant: "destructive",
      });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !title || !user) {
      toast({
        title: "Missing information",
        description: "Please provide a title and select a file.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const bucketName = buckets[fileType];
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, selectedFile);
      
      if (uploadError) throw uploadError;
      
      // Get public URL for the file
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);
      
      // Save metadata to the database with initial dime value of 1
      const { error: insertError } = await supabase.from('content').insert({
        user_id: user.id,
        title,
        description,
        file_path: publicUrlData.publicUrl,
        content_type: fileType,
        dime_value: 1, // Initial dime value is 1
        last_value_update: new Date().toISOString(),
        current_owner_id: user.id // Set the uploader as the initial owner
      });
      
      if (insertError) throw insertError;
      
      toast({
        title: "Upload successful",
        description: `${title} has been uploaded to your library with an initial value of 1 Dime.`,
      });
      
      navigate('/library');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "There was an error uploading your file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  const getHumanReadableSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-muted/20 py-12">
      <div className="container-content max-w-3xl">
        <h1 className="text-4xl font-bold mb-10">Upload Content</h1>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Upload a New File</CardTitle>
              <CardDescription>
                Upload videos, audio files, or eBooks to your library
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fileType">File Type</Label>
                <Select 
                  value={fileType}
                  onValueChange={(value) => {
                    setFileType(value as FileType);
                    setSelectedFile(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select file type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="ebook">eBook (PDF)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Enter a title for your file"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Enter a description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {!selectedFile ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <div className="flex flex-col items-center justify-center gap-4">
                    {fileTypeIcons[fileType]}
                    <div className="space-y-2">
                      <p className="font-medium">
                        Drag and drop your {fileType} file, or click to browse
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Supports {fileTypeExtensions[fileType]} formats
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm">
                      <UploadIcon className="mr-2 h-4 w-4" />
                      Select {fileType} file
                    </Button>
                  </div>
                  <Input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept={fileTypeExtensions[fileType]}
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {fileTypeIcons[fileType]}
                      <div>
                        <p className="font-medium truncate max-w-[200px] sm:max-w-xs">
                          {selectedFile.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {getHumanReadableSize(selectedFile.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={removeSelectedFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                disabled={isUploading || !selectedFile || !title}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Uploading...
                  </>
                ) : (
                  'Upload File'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Upload;
