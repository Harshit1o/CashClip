
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, FileAudio, Video, ArrowLeft, Loader2, Check, X, User, Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface ContentItem {
  id: string;
  title: string;
  content_type: string;
  dime_value: number;
}

interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface PurchaseRequest {
  id: string;
  content_id: string;
  requester_id: string;
  owner_id: string;
  dime_amount: number;
  status: string;
  created_at: string;
  content?: ContentItem;
  requester?: Profile;
}

const PurchaseRequests: React.FC = () => {
  const [incomingRequests, setIncomingRequests] = useState<PurchaseRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<PurchaseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('incoming');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { user, profile, updateProfile } = useAuth();

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching requests for user:', user.id);
      
      // Fetch incoming requests (where the user is the owner)
      const { data: incomingData, error: incomingError } = await supabase
        .from('purchase_requests')
        .select('*')
        .eq('owner_id', user.id)
        .eq('status', 'pending');
        
      if (incomingError) throw incomingError;
      
      console.log('Incoming requests data:', incomingData);
      
      // Fetch outgoing requests (where the user is the requester)
      const { data: outgoingData, error: outgoingError } = await supabase
        .from('purchase_requests')
        .select('*')
        .eq('requester_id', user.id)
        .order('status', { ascending: false });
        
      if (outgoingError) throw outgoingError;
      
      console.log('Outgoing requests data:', outgoingData);
      
      // Get all unique requester IDs to fetch their profiles in a single query
      const requesterIds = incomingData.map(request => request.requester_id);
      
      console.log('Requester IDs to fetch profiles for:', requesterIds);
      
      // Process incoming requests with content and requester details
      const incomingWithDetails = await Promise.all(
        incomingData.map(async (request) => {
          // Get content info
          const { data: contentData } = await supabase
            .from('content')
            .select('id, title, content_type, dime_value')
            .eq('id', request.content_id)
            .maybeSingle();
          
          // For UUID format requester_ids, use standard query
          let requesterProfile;
          
          // Convert UUID-looking strings to UUID if needed
          // This is a critical fix - we need to make sure the requester_id format matches what's in the profiles table
          if (request.requester_id && request.requester_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            console.log(`Fetching profile for UUID requester: ${request.requester_id}`);
            
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('id, full_name, username, avatar_url')
              .eq('id', request.requester_id)
              .maybeSingle();
              
            if (profileError) {
              console.error('Error fetching requester profile:', profileError);
            } else {
              requesterProfile = profile;
              console.log('UUID profile found:', profile);
            }
          } else {
            console.log(`Trying to find profile where id = ${request.requester_id}`);
            
            // Try direct match by string ID
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('id, full_name, username, avatar_url')
              .eq('id', request.requester_id)
              .maybeSingle();
              
            if (profileError) {
              console.error('Error fetching requester profile by string ID:', profileError);
            } else if (profile) {
              requesterProfile = profile;
              console.log('Profile found by string ID:', profile);
            }
          }
          
          // Use requester profile if found, otherwise create a fallback profile
          const requester = requesterProfile || {
            id: request.requester_id,
            full_name: "Unknown User",
            username: "unknown",
            avatar_url: null
          };
          
          return {
            ...request,
            content: contentData || undefined,
            requester: requester
          };
        })
      );
      
      // Get content details for outgoing requests
      const outgoingWithDetails = await Promise.all(
        outgoingData.map(async (request) => {
          // Get content info
          const { data: contentData } = await supabase
            .from('content')
            .select('id, title, content_type, dime_value')
            .eq('id', request.content_id)
            .maybeSingle();
            
          return {
            ...request,
            content: contentData || undefined
          };
        })
      );
      
      setIncomingRequests(incomingWithDetails);
      setOutgoingRequests(outgoingWithDetails);
    } catch (err: any) {
      console.error('Error fetching requests:', err);
      setError(err.message || 'Failed to load purchase requests');
      toast({
        title: "Error loading requests",
        description: err.message || "We couldn't load your purchase requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!selectedRequest || !user || !profile) return;
    
    setProcessingId(selectedRequest.id);
    
    try {
      // Start a transaction using supabase
      const requester_id = selectedRequest.requester_id;
      const content_id = selectedRequest.content_id;
      const dime_amount = selectedRequest.dime_amount;
      
      console.log('Transfer details:', {
        contentId: content_id,
        requesterId: requester_id,
        ownerId: user.id,
        amount: dime_amount
      });
      
      // 1. Get requester profile to verify they have enough dimes
      const { data: requesterData, error: requesterError } = await supabase
        .from('profiles')
        .select('dime_coins')
        .eq('id', requester_id)
        .maybeSingle();
        
      if (requesterError) {
        console.error('Error getting requester profile:', requesterError);
        throw new Error('Could not find requester profile');
      }
      
      if (!requesterData) {
        console.error('Requester profile not found for ID:', requester_id);
        throw new Error('Requester profile not found');
      }
      
      console.log('Requester data found:', requesterData);
      
      if (requesterData.dime_coins < dime_amount) {
        throw new Error('Requester does not have enough dime coins');
      }
      
      // 2. Update the purchase request status
      const { error: requestError } = await supabase
        .from('purchase_requests')
        .update({ status: 'accepted' })
        .eq('id', selectedRequest.id);
        
      if (requestError) throw requestError;
      
      // 3. Update the content owner
      const { error: contentError } = await supabase
        .from('content')
        .update({ current_owner_id: requester_id })
        .eq('id', content_id);
        
      if (contentError) throw contentError;
      
      console.log('Content ownership updated');
      
      // 4. Deduct dime coins from requester
      const { error: deductError } = await supabase
        .from('profiles')
        .update({ dime_coins: requesterData.dime_coins - dime_amount })
        .eq('id', requester_id);
        
      if (deductError) throw deductError;
      
      // 5. Add dime coins to current user (owner)
      const newDimeCoins = (profile.dime_coins || 0) + dime_amount;
      const { error: addError } = await supabase
        .from('profiles')
        .update({ dime_coins: newDimeCoins })
        .eq('id', user.id);
        
      if (addError) throw addError;
      
      // 6. Update local profile state
      updateProfile({ ...profile, dime_coins: newDimeCoins });
      
      // 7. Remove this request from the list
      setIncomingRequests(incomingRequests.filter(r => r.id !== selectedRequest.id));
      
      toast({
        title: "Request accepted",
        description: `You've received ${dime_amount} dime coins and transferred ownership of the content.`,
      });
      
      setConfirmDialogOpen(false);
    } catch (err: any) {
      console.error('Error accepting request:', err);
      toast({
        title: "Error accepting request",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
      setSelectedRequest(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingId(requestId);
    
    try {
      const { error } = await supabase
        .from('purchase_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);
        
      if (error) throw error;
      
      setIncomingRequests(incomingRequests.filter(r => r.id !== requestId));
      
      toast({
        title: "Request rejected",
        description: "The purchase request has been rejected.",
      });
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      toast({
        title: "Error",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const renderContentIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4 text-blue-500" />;
      case 'audio':
        return <FileAudio className="h-4 w-4 text-purple-500" />;
      case 'pdf':
      case 'ebook':
        return <FileText className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/20 py-12">
        <div className="container-content max-w-5xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p>Loading purchase requests...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 py-12">
      <div className="container-content max-w-5xl mx-auto">
        <div className="mb-8">
          <Link to="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-6">
            <h1 className="text-4xl font-bold tracking-tight">Purchase Requests</h1>
            
            <div className="flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-lg">
              <Coins className="h-5 w-5" />
              <div>
                <span className="font-bold">{profile?.dime_coins || 0}</span>
                <span className="ml-1">Dime Coins</span>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="incoming" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="incoming">
              Incoming Requests {incomingRequests.length > 0 && `(${incomingRequests.length})`}
            </TabsTrigger>
            <TabsTrigger value="outgoing">
              My Requests {outgoingRequests.length > 0 && `(${outgoingRequests.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incoming">
            <Card>
              {incomingRequests.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">You don't have any incoming purchase requests.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Content</TableHead>
                      <TableHead>Requester</TableHead>
                      <TableHead>Offer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomingRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {request.content && renderContentIcon(request.content.content_type)}
                            <Link 
                              to={`/content/${request.content_id}`} 
                              className="hover:underline font-medium"
                            >
                              {request.content?.title || "Unknown Content"}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-muted overflow-hidden mr-2 flex items-center justify-center">
                              {request.requester?.avatar_url ? (
                                <img 
                                  src={request.requester.avatar_url} 
                                  alt={request.requester.full_name || 'User'} 
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <User className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <span className="font-medium">
                              {request.requester?.full_name || 
                               request.requester?.username || 
                               "Unknown User"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">{request.dime_amount} Dimes</span>
                        </TableCell>
                        <TableCell>{formatDate(request.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleRejectRequest(request.id)}
                              disabled={processingId === request.id}
                            >
                              {processingId === request.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4 mr-1" />
                              )}
                              <span>Reject</span>
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setConfirmDialogOpen(true);
                              }}
                              disabled={processingId === request.id}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              <span>Accept</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="outgoing">
            <Card>
              {outgoingRequests.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">You haven't sent any purchase requests yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Content</TableHead>
                      <TableHead>My Offer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outgoingRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {request.content && renderContentIcon(request.content.content_type)}
                            <Link 
                              to={`/content/${request.content_id}`} 
                              className="hover:underline font-medium"
                            >
                              {request.content?.title || "Unknown Content"}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">{request.dime_amount} Dimes</span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(request.status)}`}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(request.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Transfer</DialogTitle>
            <DialogDescription>
              Are you sure you want to accept this offer and transfer ownership of your content?
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="py-4">
              <div className="flex items-center justify-between mb-4 p-3 bg-muted rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">Content</div>
                  <div className="font-medium">{selectedRequest.content?.title}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Offer</div>
                  <div className="font-semibold text-amber-600">{selectedRequest.dime_amount} Dimes</div>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                By accepting, you will receive {selectedRequest.dime_amount} dime coins and transfer
                ownership of this content. This action cannot be undone.
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAcceptRequest} 
              disabled={processingId !== null}
            >
              {processingId ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                "Accept and Transfer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseRequests;
