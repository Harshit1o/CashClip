import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, FileAudio, Video, Calendar, Download, ArrowLeft, Loader2, Heart, Coins, ShoppingCart, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase, getThumbnailUrl } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/context/AuthContext';

interface ContentItem {
  id: string;
  title: string;
  description?: string;
  content_type: string;
  file_path: string;
  created_at: string;
  fileSize?: string;
  thumbnail?: string;
  liked?: boolean;
  like_count?: number;
  dime_value: number;
  last_value_update: string;
  user_id: string;
  current_owner_id: string;
  owner_name?: string;
  owner_avatar?: string;
}

interface PurchaseRequest {
  id: string;
  content_id: string;
  requester_id: string;
  owner_id: string;
  dime_amount: number;
  status: string;
  created_at: string;
}

const ContentView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [content, setContent] = useState<ContentItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLikeProcessing, setIsLikeProcessing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [dimeAmount, setDimeAmount] = useState(1);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [existingRequest, setExistingRequest] = useState<PurchaseRequest | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  useEffect(() => {
    const fetchContent = async () => {
      if (!id) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Get the authenticated user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          throw new Error('Failed to authenticate user');
        }

        const userId = userData.user?.id;

        if (!userId) {
          navigate('/login');
          return;
        }

        console.log('Fetching content with ID:', id);

        // Fetch the content item
        const { data, error: contentError } = await supabase
          .from('content')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (contentError) {
          throw new Error('Content not found or access denied');
        }

        if (!data) {
          throw new Error('Content not found');
        }
        
        console.log('Content data:', data);
        
        // Check if the user is the owner
        const isCurrentOwner = data.current_owner_id === userId;
        setIsOwner(isCurrentOwner);
        
        console.log('Current owner ID:', data.current_owner_id);
        console.log('User ID:', userId);
        console.log('Is owner:', isCurrentOwner);
        
        // Get owner's profile information
        let ownerName = 'Unknown';
        let ownerAvatar = null;
        
        if (data.current_owner_id) {
          const { data: ownerData, error: ownerError } = await supabase
            .from('profiles')
            .select('full_name, username, avatar_url')
            .eq('id', data.current_owner_id)
            .maybeSingle();
            
          console.log('Owner profile data:', ownerData);
          
          if (ownerData) {
            ownerName = ownerData.full_name || ownerData.username || 'Unknown';
            ownerAvatar = ownerData.avatar_url;
          } else if (ownerError) {
            console.error('Error fetching owner profile:', ownerError);
          }
        }
        
        // Get like count using direct count without group
        const { data: likeCountData, error: likeCountError } = await supabase
          .from('content_likes')
          .select('*', { count: 'exact' })
          .eq('content_id', id);
            
        // Check if user has liked this content
        const { data: userLikeData, error: userLikeError } = await supabase
          .from('content_likes')
          .select('id')
          .eq('content_id', id)
          .eq('user_id', userId)
          .maybeSingle();
        
        // Determine if content is liked by user
        const isLiked = !!userLikeData;
        
        // Extract like count (will be 0 if no likes)
        const likeCount = likeCountData ? likeCountData.length : 0;

        // Estimate file size based on content_type if not available
        const estimatedSize = getEstimatedFileSize(data.content_type);
        
        // Get thumbnail for videos using the helper function
        let thumbnail;
        if (data.content_type === 'video') {
          thumbnail = getThumbnailUrl(data.id);
        }
        
        // Check for existing purchase requests
        if (!isCurrentOwner) {
          const { data: requestData, error: requestError } = await supabase
            .from('purchase_requests')
            .select('*')
            .eq('content_id', id)
            .eq('requester_id', userId)
            .eq('status', 'pending')
            .maybeSingle();
            
          console.log('Existing purchase request:', requestData);
            
          if (requestData) {
            setExistingRequest(requestData);
            setDimeAmount(requestData.dime_amount);
          }
        }
        
        setContent({
          ...data,
          fileSize: estimatedSize,
          thumbnail,
          liked: isLiked,
          like_count: likeCount,
          owner_name: ownerName,
          owner_avatar: ownerAvatar
        });
      } catch (err: any) {
        console.error('Error fetching content:', err);
        setError(err.message || 'Failed to load content');
        toast({
          title: "Error loading content",
          description: err.message || "We couldn't load this content item. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [id, navigate, toast]);

  // Estimate file size based on content type (placeholder function)
  const getEstimatedFileSize = (contentType: string): string => {
    switch(contentType) {
      case 'video': return '25-50 MB';
      case 'audio': return '10-15 MB';
      case 'pdf': return '2-5 MB';
      default: return 'Unknown size';
    }
  };

  const toggleLike = async () => {
    if (!content || !content.id || isLikeProcessing) return;
    
    setIsLikeProcessing(true);
    
    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw new Error('Failed to authenticate user');
      }

      const userId = userData.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // Toggle like status
      if (content.liked) {
        // Unlike: delete the like entry
        const { error: deleteError } = await supabase
          .from('content_likes')
          .delete()
          .eq('user_id', userId)
          .eq('content_id', content.id);
          
        if (deleteError) {
          throw new Error('Failed to unlike content');
        }
        
        // Update local state
        setContent({
          ...content,
          liked: false,
          like_count: (content.like_count || 1) - 1
        });
        
        toast({
          title: "Removed from liked items",
          description: "Content has been removed from your liked items",
        });
      } else {
        // Like: insert new like entry
        const { error: insertError } = await supabase
          .from('content_likes')
          .insert([
            { user_id: userId, content_id: content.id }
          ]);
          
        if (insertError) {
          throw new Error('Failed to like content');
        }
        
        // Update local state
        setContent({
          ...content,
          liked: true,
          like_count: (content.like_count || 0) + 1
        });
        
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
      setIsLikeProcessing(false);
    }
  };

  const renderContentIcon = (type: string, size = 6) => {
    const className = `h-${size} w-${size}`;
    
    switch (type) {
      case 'video':
        return <Video className={`${className} text-blue-500`} />;
      case 'audio':
        return <FileAudio className={`${className} text-purple-500`} />;
      case 'pdf':
        return <FileText className={`${className} text-red-500`} />;
      default:
        return null;
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

  const handleDownload = () => {
    if (content) {
      window.open(content.file_path, '_blank');
    }
  };

  const handleSubmitPurchaseRequest = async () => {
    if (!content || !user || isSubmittingRequest) return;
    
    setIsSubmittingRequest(true);
    
    try {
      console.log('Submitting purchase request with user ID:', user.id);
      console.log('Content:', content);
      
      // Check if user has enough dime coins
      if ((profile?.dime_coins || 0) < dimeAmount) {
        toast({
          title: "Insufficient dime coins",
          description: `You need ${dimeAmount} dime coins to make this request. You currently have ${profile?.dime_coins || 0}.`,
          variant: "destructive",
        });
        return;
      }
      
      if (existingRequest) {
        // Update existing request
        const { error } = await supabase
          .from('purchase_requests')
          .update({
            dime_amount: dimeAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRequest.id);
          
        if (error) throw error;
        
        toast({
          title: "Purchase request updated",
          description: `Your offer has been updated to ${dimeAmount} dime coins.`,
        });
      } else {
        console.log('Creating purchase request with:', {
          content_id: content.id,
          requester_id: user.id,
          owner_id: content.current_owner_id,
          dime_amount: dimeAmount
        });
        
        // Create new purchase request
        const { data, error } = await supabase
          .from('purchase_requests')
          .insert({
            content_id: content.id,
            requester_id: user.id,
            owner_id: content.current_owner_id,
            dime_amount: dimeAmount,
            status: 'pending'
          })
          .select();
          
        if (error) throw error;
        
        console.log('Purchase request created:', data);
        
        toast({
          title: "Purchase request sent",
          description: `Your offer of ${dimeAmount} dime coins has been sent to the owner.`,
        });
        
        // Update local state with the new request data
        if (data && data[0]) {
          setExistingRequest(data[0]);
        } else {
          // Fallback if we don't get the created request back
          setExistingRequest({
            id: '', 
            content_id: content.id,
            requester_id: user.id,
            owner_id: content.current_owner_id,
            dime_amount: dimeAmount,
            status: 'pending',
            created_at: new Date().toISOString()
          });
        }
      }
      
      setPurchaseDialogOpen(false);
    } catch (err: any) {
      console.error('Error submitting purchase request:', err);
      toast({
        title: "Error",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const cancelPurchaseRequest = async () => {
    if (!existingRequest) return;
    
    try {
      const { error } = await supabase
        .from('purchase_requests')
        .delete()
        .eq('id', existingRequest.id);
        
      if (error) throw error;
      
      toast({
        title: "Request canceled",
        description: "Your purchase request has been canceled.",
      });
      
      setExistingRequest(null);
    } catch (err: any) {
      console.error('Error canceling request:', err);
      toast({
        title: "Error",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderContentViewer = () => {
    if (!content) return null;

    switch (content.content_type) {
      case 'video':
        return (
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <video 
              controls 
              className="w-full h-full"
              poster={content.thumbnail}
            >
              <source src={content.file_path} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        );
      case 'audio':
        return (
          <div className="bg-purple-50 p-6 rounded-lg">
            <div className="flex flex-col items-center justify-center">
              <FileAudio className="h-16 w-16 text-purple-500 mb-4" />
              <div className="w-full max-w-md bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{content.title}</span>
                  <span className="text-sm text-muted-foreground">{content.fileSize}</span>
                </div>
                <audio controls className="w-full mt-2">
                  <source src={content.file_path} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
          </div>
        );
      case 'pdf':
        return (
          <div className="bg-red-50 p-6 rounded-lg">
            <div className="flex flex-col items-center justify-center">
              <FileText className="h-16 w-16 text-red-500 mb-4" />
              <div className="w-full bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{content.title}</span>
                    <span className="text-sm text-muted-foreground">{content.fileSize}</span>
                  </div>
                </div>
                <div className="aspect-[3/4] bg-white">
                  <iframe
                    src={`${content.file_path}#toolbar=0`}
                    className="w-full h-full"
                    title={content.title}
                  >
                    This browser does not support PDFs. Please download the PDF to view it.
                  </iframe>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="bg-muted p-6 rounded-lg text-center">
            <p>Preview not available for this content type.</p>
            <Button onClick={handleDownload} className="mt-4">
              <Download className="mr-2 h-4 w-4" />
              Download to View
            </Button>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/20 py-12">
        <div className="container-content">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded-md w-1/4 mb-8"></div>
            <div className="h-[400px] bg-muted rounded-lg mb-8"></div>
            <div className="h-6 bg-muted rounded-md w-3/4 mb-4"></div>
            <div className="h-4 bg-muted rounded-md w-1/2 mb-8"></div>
            <div className="h-20 bg-muted rounded-md"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-muted/20 py-12">
        <div className="container-content text-center">
          <h1 className="text-2xl font-bold mb-4">Content not found</h1>
          <p className="mb-8">{error || "The content you're looking for doesn't exist or has been removed."}</p>
          <Link to="/library">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Library
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 py-12">
      <div className="container-content">
        <div className="mb-8">
          <Link to="/library" className="inline-flex items-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Link>
        </div>

        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{content.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  {renderContentIcon(content.content_type, 4)}
                  <span className="capitalize">{content.content_type}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(content.created_at)}</span>
                </div>
                <div>{content.fileSize}</div>
              </div>
              
              {/* Owner information */}
              <div className="flex items-center mt-4">
                <div className="h-8 w-8 rounded-full bg-muted overflow-hidden mr-2 flex items-center justify-center">
                  {content.owner_avatar ? (
                    <img src={content.owner_avatar} alt="Owner" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="text-sm">Owner</div>
                  <div className="text-sm font-medium">{content.owner_name}</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-100 text-amber-800">
                <Coins className="h-5 w-5" />
                <div>
                  <p className="font-bold">{content.dime_value || 1}</p>
                  <p className="text-xs">Dime Value</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {renderContentViewer()}

        {content.description && (
          <Card className="p-6 mt-8">
            <h2 className="text-lg font-semibold mb-2">Description</h2>
            <p className="text-muted-foreground">{content.description}</p>
          </Card>
        )}

        <div className="mt-8 flex items-center gap-4 flex-wrap">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          
          <Button
            variant="outline"
            onClick={toggleLike}
            disabled={isLikeProcessing}
            className={content.liked ? "bg-red-50" : ""}
          >
            <Heart
              className={`mr-2 h-4 w-4 ${content.liked ? "fill-red-500 text-red-500" : ""}`}
            />
            {content.liked ? "Unlike" : "Like"} ({content.like_count || 0})
          </Button>
          
          {/* Purchase Request Button - Only show if not owner */}
          {!isOwner && (
            <>
              {existingRequest ? (
                <div className="flex gap-2 items-center ml-auto">
                  <div className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                    Request pending ({existingRequest.dime_amount} dimes)
                  </div>
                  
                  <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Edit Offer
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Update your offer</DialogTitle>
                        <DialogDescription>
                          Enter the amount of dime coins you want to offer for this content.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="py-4">
                        <Label htmlFor="dime-amount" className="mb-2 block">
                          Dime amount (you have {profile?.dime_coins || 0})
                        </Label>
                        <Input
                          id="dime-amount"
                          type="number"
                          min="1"
                          value={dimeAmount}
                          onChange={(e) => setDimeAmount(parseInt(e.target.value) || 1)}
                          className="mb-4"
                        />
                      </div>
                      
                      <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
                        <Button
                          variant="destructive"
                          onClick={cancelPurchaseRequest}
                        >
                          Cancel Request
                        </Button>
                        <Button
                          onClick={handleSubmitPurchaseRequest}
                          disabled={isSubmittingRequest || (profile?.dime_coins || 0) < dimeAmount}
                        >
                          Update Offer
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" className="ml-auto">
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Purchase with Dimes
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Purchase request</DialogTitle>
                      <DialogDescription>
                        Enter the amount of dime coins you want to offer for this content.
                        If the owner accepts your offer, the dimes will be transferred and you'll become the new owner.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4">
                      <Label htmlFor="dime-amount" className="mb-2 block">
                        Dime amount (you have {profile?.dime_coins || 0})
                      </Label>
                      <Input
                        id="dime-amount"
                        type="number"
                        min="1"
                        value={dimeAmount}
                        onChange={(e) => setDimeAmount(parseInt(e.target.value) || 1)}
                        className="mb-4"
                      />
                    </div>
                    
                    <DialogFooter>
                      <Button
                        onClick={handleSubmitPurchaseRequest}
                        disabled={isSubmittingRequest || (profile?.dime_coins || 0) < dimeAmount}
                      >
                        Send Request
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentView;
