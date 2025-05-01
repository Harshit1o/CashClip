import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { Search, FileText, FileAudio, Video, Plus, Loader2, Heart, Coins } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase, getThumbnailUrl } from '@/integrations/supabase/client';

interface ContentItem {
  id: string;
  title: string;
  content_type: string;
  file_path: string;
  description?: string;
  thumbnail?: string;
  created_at: string;
  fileSize?: string;
  liked?: boolean;
  like_count?: number;
  dime_value: number;
  last_value_update: string;
  current_owner_id: string;
}

interface UserLike {
  id: string;
  user_id: string;
  content_id: string;
  created_at: string;
}

const Library: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likeProcessing, setLikeProcessing] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchContent();
  }, []);
  
  const fetchContent = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch the user's content from Supabase
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw new Error('Failed to authenticate user');
      }

      const userId = userData.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      console.log('Fetching content for user ID:', userId);

      // Query the content table for this user's content (now filtering by current_owner_id)
      const { data, error: contentError } = await supabase
        .from('content')
        .select('*')
        .eq('current_owner_id', userId);

      if (contentError) {
        throw new Error('Failed to fetch content');
      }

      console.log('Content data:', data);

      // Get all content IDs to fetch like counts
      const contentIds = data.map((item: ContentItem) => item.id);
      
      // Get like counts for all content - using count aggregation with RPC
      const likeCountMap: Record<string, number> = {};
      
      // Fetch likes for each content ID and count them
      for (const contentId of contentIds) {
        const { data: likesData, error: likesError } = await supabase
          .from('content_likes')
          .select('*', { count: 'exact' })
          .eq('content_id', contentId);
        
        if (!likesError && likesData) {
          likeCountMap[contentId] = likesData.length;
        }
      }
      
      // Get user's likes
      const { data: userLikesData, error: userLikesError } = await supabase
        .from('content_likes')
        .select('content_id')
        .eq('user_id', userId);
      
      // Create a mapping of content_id to like status
      const likeStatusMap: Record<string, boolean> = {};
      if (userLikesData) {
        userLikesData.forEach((like: { content_id: string }) => {
          likeStatusMap[like.content_id] = true;
        });
      }
      
      // Process the data with file size estimation and like status
      const processedData = data.map((item: ContentItem) => {
        // Estimate file size based on content_type if not available
        const estimatedSize = getEstimatedFileSize(item.content_type);
        
        // Extract thumbnail if it's a video with proper storage URL
        const thumbnail = item.content_type === 'video' 
          ? getThumbnailUrl(item.id) 
          : undefined;
        
        return {
          ...item,
          fileSize: estimatedSize,
          thumbnail,
          liked: likeStatusMap[item.id] || false,
          like_count: likeCountMap[item.id] || 0
        };
      });
      
      setContentItems(processedData);
    } catch (err: any) {
      console.error('Error fetching content:', err);
      setError(err.message || 'Failed to load your content');
      toast({
        title: "Error loading library",
        description: err.message || "We couldn't load your library items. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLike = async (contentId: string) => {
    try {
      // Prevent multiple clicks while processing
      if (likeProcessing[contentId]) return;
      setLikeProcessing(prev => ({ ...prev, [contentId]: true }));
      
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw new Error('Failed to authenticate user');
      }

      const userId = userData.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // Find the content item
      const contentItem = contentItems.find(item => item.id === contentId);
      if (!contentItem) return;
      
      // If already liked, unlike it
      if (contentItem.liked) {
        const { error: deleteError } = await supabase
          .from('content_likes')
          .delete()
          .eq('user_id', userId)
          .eq('content_id', contentId);
          
        if (deleteError) {
          throw new Error('Failed to unlike content');
        }
        
        // Update local state
        setContentItems(prevItems =>
          prevItems.map(item =>
            item.id === contentId
              ? {
                  ...item,
                  liked: false,
                  like_count: (item.like_count || 1) - 1
                }
              : item
          )
        );
        
        toast({
          title: "Removed from liked items",
          description: "Content has been removed from your liked items",
        });
      } else {
        // Like the content
        const { error: insertError } = await supabase
          .from('content_likes')
          .insert([
            { user_id: userId, content_id: contentId }
          ]);
          
        if (insertError) {
          throw new Error('Failed to like content');
        }
        
        // Update local state
        setContentItems(prevItems =>
          prevItems.map(item =>
            item.id === contentId
              ? {
                  ...item,
                  liked: true,
                  like_count: (item.like_count || 0) + 1
                }
              : item
          )
        );
        
        toast({
          title: "Added to liked items",
          description: "Content has been added to your liked items",
        });
      }
    } catch (err: any) {
      console.error('Error toggling like:', err);
      toast({
        title: "Error",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLikeProcessing(prev => ({ ...prev, [contentId]: false }));
    }
  };

  // Estimate file size based on content type (placeholder function)
  const getEstimatedFileSize = (contentType: string): string => {
    switch(contentType) {
      case 'video': return '25-50 MB';
      case 'audio': return '10-15 MB';
      case 'pdf': return '2-5 MB';
      default: return 'Unknown size';
    }
  };

  // Helper to format content type for display
  const getContentTypeLabel = (contentType: string): string => {
    switch (contentType) {
      case 'video': return 'Video';
      case 'audio': return 'Audio';
      case 'pdf': return 'eBook';
      default: return contentType.charAt(0).toUpperCase() + contentType.slice(1);
    }
  };

  // Map content_type to the UI filter types
  const mapContentTypeToFilterType = (contentType: string): string => {
    switch (contentType) {
      case 'video': return 'video';
      case 'audio': return 'audio';
      case 'pdf': 
      case 'ebook': 
      case 'epub': return 'pdf';
      default: return contentType;
    }
  };

  // Filter content based on search term and selected type
  const filteredContent = contentItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (item.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const itemType = mapContentTypeToFilterType(item.content_type);
    const matchesType = selectedType === 'all' || itemType === selectedType;
    return matchesSearch && matchesType;
  });

  const renderContentIcon = (type: string, size?: "sm" | "md" | "lg") => {
    const iconSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-6 w-6";
    
    const contentType = mapContentTypeToFilterType(type);
    switch (contentType) {
      case 'video':
        return <Video className={`${iconSize} text-blue-500`} />;
      case 'audio':
        return <FileAudio className={`${iconSize} text-purple-500`} />;
      case 'pdf':
        return <FileText className={`${iconSize} text-red-500`} />;
      default:
        return <FileText className={`${iconSize} text-gray-500`} />;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-muted/20 py-12">
      <div className="container-content max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <h1 className="text-4xl font-bold tracking-tight">My Library</h1>
          <Link to="/upload">
            <Button className="transition-all hover:scale-105">
              <Plus className="mr-2 h-4 w-4" />
              Upload New
            </Button>
          </Link>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search your content..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Tabs 
              value={selectedType} 
              onValueChange={setSelectedType}
              className="w-full md:w-auto"
            >
              <TabsList className="grid grid-cols-4 w-full md:w-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="video">Videos</TabsTrigger>
                <TabsTrigger value="audio">Audio</TabsTrigger>
                <TabsTrigger value="pdf">eBooks</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white shadow-sm rounded-lg p-12 text-center">
            <div className="flex flex-col items-center max-w-md mx-auto">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <h2 className="text-xl font-semibold">Loading your content</h2>
              <p className="text-muted-foreground mt-2">
                Please wait while we load your library...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white shadow-sm rounded-lg p-8 text-center">
            <div className="flex flex-col items-center max-w-md mx-auto">
              <div className="p-3 rounded-full bg-red-50 mb-4">
                <FileText className="h-6 w-6 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold">Error loading content</h2>
              <p className="text-muted-foreground mt-2">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : filteredContent.length === 0 ? (
          <div className="bg-white shadow-sm rounded-lg p-8 text-center">
            <div className="flex flex-col items-center max-w-md mx-auto">
              <div className="p-3 rounded-full bg-muted mb-4">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold">No content found</h2>
              <p className="text-muted-foreground mt-2">
                {searchTerm 
                  ? `No results found for "${searchTerm}". Try a different search term.` 
                  : selectedType !== 'all'
                    ? `You don't have any ${getContentTypeLabel(selectedType).toLowerCase()} content in your library yet.`
                    : "You don't have any content in your library yet."}
              </p>
              {!searchTerm && (
                <Link to="/upload" className="mt-4">
                  <Button className="transition-all hover:shadow-md">Upload Your First File</Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContent.map((item) => (
              <Card key={item.id} className="overflow-hidden transition-all hover:shadow-lg group">
                <Link to={`/content/${item.id}`} className="block relative">
                  {item.content_type === 'video' && item.thumbnail ? (
                    <div className="aspect-video bg-muted overflow-hidden relative">
                      <img 
                        src={item.thumbnail} 
                        alt={item.title}
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <div className="h-12 w-12 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                          <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center">
                            <Video className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`aspect-video relative flex items-center justify-center transition-all duration-300 ${
                      mapContentTypeToFilterType(item.content_type) === 'audio' ? 'bg-purple-50 group-hover:bg-purple-100' : 
                      mapContentTypeToFilterType(item.content_type) === 'pdf' ? 'bg-red-50 group-hover:bg-red-100' : 'bg-blue-50 group-hover:bg-blue-100'
                    }`}>
                      {renderContentIcon(item.content_type, "lg")}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                    </div>
                  )}
                </Link>
                
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between">
                    <div className="font-semibold line-clamp-1 hover:text-primary transition-colors">
                      <Link to={`/content/${item.id}`}>{item.title}</Link>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-full"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleLike(item.id);
                      }}
                      disabled={likeProcessing[item.id]}
                    >
                      <Heart
                        className={`h-5 w-5 ${item.liked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
                      />
                      <span className="sr-only">{item.liked ? 'Unlike' : 'Like'}</span>
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="p-4 pt-0">
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{item.fileSize}</span>
                    <span>•</span>
                    <span>{formatDate(item.created_at)}</span>
                    <span>•</span>
                    <span className="flex items-center">
                      <Heart className="h-3.5 w-3.5 mr-1" />
                      {item.like_count || 0}
                    </span>
                  </div>
                </CardContent>
                
                <CardFooter className="p-4 pt-0">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium 
                        ${mapContentTypeToFilterType(item.content_type) === 'video' ? 'bg-blue-50 text-blue-700' : 
                          mapContentTypeToFilterType(item.content_type) === 'audio' ? 'bg-purple-50 text-purple-700' : 
                          'bg-red-50 text-red-700'}`}>
                        {renderContentIcon(item.content_type, "sm")}
                        <span>{getContentTypeLabel(item.content_type)}</span>
                      </span>
                    </div>
                    
                    <div className="flex items-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <Coins className="h-3.5 w-3.5" />
                        <span>{item.dime_value || 1}</span>
                      </span>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;
