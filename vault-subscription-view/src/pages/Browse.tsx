import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { Search, FileText, FileAudio, Video, Loader2, Heart, User } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase, getStorageUrl } from '@/integrations/supabase/client';

interface ContentItem {
  id: string;
  title: string;
  content_type: string;
  file_path: string;
  description?: string;
  thumbnail?: string;
  created_at: string;
  user_id: string;
  fileSize?: string;
  liked?: boolean;
  like_count?: number;
  creator_name?: string;
  creator_avatar?: string;
}

const Browse: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likeProcessing, setLikeProcessing] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchAllContent();
  }, []);
  
  const fetchAllContent = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch the current user for like status
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id;
      
      // Query all public content from all users
      const { data, error: contentError } = await supabase
        .from('content')
        .select('*')
        .order('created_at', { ascending: false });

      if (contentError) {
        throw new Error('Failed to fetch content');
      }

      if (!data || data.length === 0) {
        setContentItems([]);
        setIsLoading(false);
        return;
      }

      // Get all content IDs and user IDs to fetch additional data
      const contentIds = data.map((item: ContentItem) => item.id);
      const userIds = [...new Set(data.map((item: ContentItem) => item.user_id))];
      
      // Get like counts for all content
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
      
      // Get current user's likes if logged in
      const likeStatusMap: Record<string, boolean> = {};
      if (currentUserId) {
        const { data: userLikesData } = await supabase
          .from('content_likes')
          .select('content_id')
          .eq('user_id', currentUserId);
        
        if (userLikesData) {
          userLikesData.forEach((like: { content_id: string }) => {
            likeStatusMap[like.content_id] = true;
          });
        }
      }
      
      // Get creator data (users)
      const creatorMap: Record<string, { name: string, avatar: string }> = {};
      
      // Fetch user profiles for all creators
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      if (profilesData) {
        profilesData.forEach((profile: any) => {
          creatorMap[profile.id] = { 
            name: profile.full_name || 'Anonymous User', 
            avatar: profile.avatar_url 
          };
        });
      }
      
      // Process the data with all required information
      const processedData = data.map((item: ContentItem) => {
        // Estimate file size based on content_type if not available
        const estimatedSize = getEstimatedFileSize(item.content_type);
        
        // Extract thumbnail if it's a video with proper storage URL
        const thumbnail = item.content_type === 'video' 
          ? `${getStorageUrl('thumbnails', item.id)}.jpg` 
          : undefined;
        
        const creator = creatorMap[item.user_id] || { name: 'Unknown User', avatar: undefined };
        
        return {
          ...item,
          fileSize: estimatedSize,
          thumbnail,
          liked: likeStatusMap[item.id] || false,
          like_count: likeCountMap[item.id] || 0,
          creator_name: creator.name,
          creator_avatar: creator.avatar
        };
      });
      
      setContentItems(processedData);
    } catch (err: any) {
      console.error('Error fetching content:', err);
      setError(err.message || 'Failed to load content');
      toast({
        title: "Error loading content",
        description: err.message || "We couldn't load the content. Please try again.",
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
          <h1 className="text-4xl font-bold tracking-tight">Browse Content</h1>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for content..."
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
              <h2 className="text-xl font-semibold">Loading content</h2>
              <p className="text-muted-foreground mt-2">
                Please wait while we load the available content...
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
                    ? `There isn't any ${getContentTypeLabel(selectedType).toLowerCase()} content available yet.`
                    : "There isn't any content available yet."}
              </p>
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
                        <div className="h-12 w-12 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
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
                  
                  {/* Creator information */}
                  <div className="flex items-center mb-2">
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center overflow-hidden mr-2">
                      {item.creator_avatar ? (
                        <img 
                          src={item.creator_avatar} 
                          alt={item.creator_name} 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-sm font-medium">{item.creator_name}</span>
                  </div>
                  
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
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium 
                      ${mapContentTypeToFilterType(item.content_type) === 'video' ? 'bg-blue-50 text-blue-700' : 
                        mapContentTypeToFilterType(item.content_type) === 'audio' ? 'bg-purple-50 text-purple-700' : 
                        'bg-red-50 text-red-700'}`}>
                      {renderContentIcon(item.content_type, "sm")}
                      <span>{getContentTypeLabel(item.content_type)}</span>
                    </span>
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

export default Browse;
