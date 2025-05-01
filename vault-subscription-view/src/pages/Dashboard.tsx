import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Library, User, FileText, FileAudio, Video, Clock, Coins, AlertCircle, Loader2, RefreshCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RecentActivity {
  id: string;
  title: string;
  content_type: string;
  created_at: string;
}

const Dashboard: React.FC = () => {
  const { user, profile, updateProfile } = useAuth();
  const displayName = profile?.full_name || profile?.username || 'User';
  const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCheckIn, setLastCheckIn] = useState<string | null>(null);
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  // Spin the Wheel states
  const [spinCount, setSpinCount] = useState(0);
  const [maxSpins, setMaxSpins] = useState(3);
  const [nextSpinReset, setNextSpinReset] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<number | null>(null);
  const [spinResultMessage, setSpinResultMessage] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("calculating...");
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchRecentActivity();
      checkLastCheckIn();
      checkSpinStatus();
    }
  }, [user]);

  // Add countdown timer effect
  useEffect(() => {
    if (!nextSpinReset) return;
    
    // Update the countdown immediately
    updateTimeRemaining();
    
    // Set interval to update the countdown every minute
    const intervalId = setInterval(updateTimeRemaining, 60000);
    
    return () => clearInterval(intervalId);
  }, [nextSpinReset]);

  // Function to update the time remaining display
  const updateTimeRemaining = () => {
    if (!nextSpinReset) {
      setTimeRemaining("Unknown");
      return;
    }
    
    const now = new Date();
    const resetTime = new Date(nextSpinReset);
    const diffMs = resetTime.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      setTimeRemaining("Ready to reset!");
      // Check if we need to reset spins
      if (spinCount < maxSpins) {
        resetSpins();
      }
      return;
    }
    
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    setTimeRemaining(`${diffHrs}h ${diffMins}m`);
  };

  const fetchRecentActivity = async () => {
    if (!user) return;
    
    try {
      // Fetch only the most recent upload
      const { data, error } = await supabase
        .from('content')
        .select('id, title, content_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        // PGRST116 is the error for no rows returned, which is not a true error in this case
        throw error;
      }
      
      setRecentActivity(data || null);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkLastCheckIn = async () => {
    if (!user) return;
    
    try {
      // First check if the column exists by querying metadata
      const { data: columnData, error: columnError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .limit(1)
        .single();
      
      if (columnError) {
        console.error("Error checking profile:", columnError);
        setCanCheckIn(true); // Default to allowing check in if we can't determine
        return;
      }
      
      // If last_check_in is undefined in the data, it may not exist in the database
      if (columnData && 'last_check_in' in columnData) {
        // Column exists, proceed with normal logic
        const lastDate = columnData.last_check_in ? new Date(columnData.last_check_in) : null;
        setLastCheckIn(columnData.last_check_in);
        
        if (!lastDate) {
          // No check-in record, so user can check in
          setCanCheckIn(true);
          return;
        }
        
        const today = new Date();
        
        // Reset hours/minutes/seconds to compare just the date
        const todayDate = new Date(
          today.getFullYear(), 
          today.getMonth(), 
          today.getDate()
        );
        
        const lastCheckInDate = new Date(
          lastDate.getFullYear(),
          lastDate.getMonth(),
          lastDate.getDate()
        );
        
        // If the dates are different (not the same day), user can check in again
        setCanCheckIn(todayDate.getTime() > lastCheckInDate.getTime());
      } else {
        // Column doesn't exist yet, allow check in by default
        setCanCheckIn(true);
        
        // Log this for debugging purposes
        console.log("The last_check_in column doesn't appear to exist in the profiles table");
      }
    } catch (error) {
      console.error('Error checking last check-in:', error);
      setCanCheckIn(true); // Default to allowing check in if we encounter an error
    }
  };

  const handleDailyCheckIn = async () => {
    if (!user || !profile || isCheckingIn || !canCheckIn) return;
    
    setIsCheckingIn(true);
    
    try {
      // Get a random amount of dimes between 1 and 5
      const dimeEarned = Math.floor(Math.random() * 5) + 1;
      const newDimeTotal = (profile.dime_coins || 0) + dimeEarned;
      const now = new Date().toISOString();
      
      // Create an update object
      const updateData: any = {
        dime_coins: newDimeTotal
      };
      
      // Only add last_check_in if it exists in the profile schema
      // Try-catch because this is a profile object check, not a database operation
      try {
        if ('last_check_in' in profile || Object.keys(profile).includes('last_check_in')) {
          updateData.last_check_in = now;
        }
      } catch (e) {
        console.log("Could not determine if last_check_in exists in schema");
      }
      
      // Update the profile with new dime count and last check-in time if applicable
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Update local state
      const updatedProfile = { ...profile, dime_coins: newDimeTotal };
      if ('last_check_in' in profile) {
        updatedProfile.last_check_in = now;
      }
      
      updateProfile(updatedProfile);
      setLastCheckIn(now);
      setCanCheckIn(false);
      
      toast({
        title: "Daily check-in successful!",
        description: `You earned ${dimeEarned} dimes. Come back tomorrow for more!`,
      });
    } catch (error: any) {
      console.error('Error with daily check-in:', error);
      toast({
        title: "Error",
        description: error.message || "There was an error processing your check-in.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const checkSpinStatus = async () => {
    if (!user) return;
    
    try {
      // Get the current spin data from the user's profile
      const { data, error } = await supabase
        .from('profiles')
        .select('spins_remaining, next_spin_reset')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Error fetching spin status:', error);
        return;
      }
      
      if (data) {
        // If the spins_remaining column exists, set the state
        if (data.spins_remaining !== undefined && data.spins_remaining !== null) {
          setSpinCount(data.spins_remaining);
        } else {
          // Initialize to max spins if not set
          await initializeSpins();
          return;
        }
        
        if (data.next_spin_reset) {
          const resetTime = new Date(data.next_spin_reset);
          const now = new Date();
          setNextSpinReset(data.next_spin_reset);
          
          // Check if the reset time has passed
          if (now > resetTime && (data.spins_remaining === null || data.spins_remaining < maxSpins)) {
            // Reset spins if the timer has expired
            await resetSpins();
          } else {
            // Update the time remaining display
            updateTimeRemaining();
          }
        } else if (!data.next_spin_reset && (data.spins_remaining === null || data.spins_remaining < maxSpins)) {
          // If next_spin_reset is not set but spins are not full, set it now
          await resetSpins();
        }
      } else {
        // Initialize spin data if it doesn't exist
        await initializeSpins();
      }
    } catch (error) {
      console.error('Error checking spin status:', error);
    }
  };
  
  // Initialize spins for new users
  const initializeSpins = async () => {
    if (!user || !profile) return;
    
    try {
      // Set spins to max and next reset to 8 hours from now
      const nextReset = new Date();
      nextReset.setHours(nextReset.getHours() + 8);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          spins_remaining: maxSpins,
          next_spin_reset: nextReset.toISOString()
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Update local state
      setSpinCount(maxSpins);
      setNextSpinReset(nextReset.toISOString());
      
      // Update profile context
      updateProfile({
        ...profile,
        spins_remaining: maxSpins,
        next_spin_reset: nextReset.toISOString()
      });
      
    } catch (error) {
      console.error('Error initializing spins:', error);
    }
  };

  // Reset spins after the 8hr timer
  const resetSpins = async () => {
    if (!user || !profile) return;
    
    try {
      // Set next reset time to 8 hours from now
      const nextReset = new Date();
      nextReset.setHours(nextReset.getHours() + 8);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          spins_remaining: maxSpins,
          next_spin_reset: nextReset.toISOString()
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Update local state
      setSpinCount(maxSpins);
      setNextSpinReset(nextReset.toISOString());
      
      // Update profile context
      updateProfile({
        ...profile,
        spins_remaining: maxSpins,
        next_spin_reset: nextReset.toISOString()
      });
      
      // Update the countdown timer display
      updateTimeRemaining();
      
      toast({
        title: "Spins Refreshed!",
        description: `You now have ${maxSpins} spins available!`,
      });
      
    } catch (error) {
      console.error('Error resetting spins:', error);
    }
  };

  // Handle spin the wheel
  const handleSpinWheel = async () => {
    if (!user || !profile || isSpinning || spinCount <= 0) return;
    
    setIsSpinning(true);
    setSpinResult(null);
    setSpinResultMessage(null);
    
    try {
      // Generate a random result (1-10 dimes)
      const dimeEarned = Math.floor(Math.random() * 10) + 1;
      const newDimeTotal = (profile.dime_coins || 0) + dimeEarned;
      const newSpinCount = spinCount - 1;
      
      // Update profile with new dime count and decreased spin count
      const { error } = await supabase
        .from('profiles')
        .update({
          dime_coins: newDimeTotal,
          spins_remaining: newSpinCount,
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Update local state
      setSpinCount(newSpinCount);
      
      // Update the profile context with new values
      const updatedProfile = {
        ...profile,
        dime_coins: newDimeTotal,
        spins_remaining: newSpinCount
      };
      updateProfile(updatedProfile);
      
      // Simulate spinning animation
      setTimeout(() => {
        setSpinResult(dimeEarned);
        setSpinResultMessage(`You won ${dimeEarned} dimes!`);
        setIsSpinning(false);
        
        toast({
          title: "Congratulations!",
          description: `You won ${dimeEarned} dimes from spinning the wheel!`,
        });
      }, 1500);
      
    } catch (error: any) {
      console.error('Error spinning the wheel:', error);
      toast({
        title: "Error",
        description: error.message || "There was an error spinning the wheel.",
        variant: "destructive",
      });
      setIsSpinning(false);
    }
  };

  // Format time remaining until spin reset
  const formatTimeRemaining = () => {
    return timeRemaining;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric' 
    });
  };

  const renderContentIcon = (contentType: string, size: string = "h-4 w-4") => {
    switch (contentType) {
      case 'video':
        return <Video className={`${size} text-blue-500`} />;
      case 'audio':
        return <FileAudio className={`${size} text-purple-500`} />;
      case 'ebook':
        return <FileText className={`${size} text-red-500`} />;
      default:
        return <FileText className={`${size} text-gray-500`} />;
    }
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="container-content py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold">Welcome, {displayName}</h1>
            <p className="text-muted-foreground mt-2">
              Manage your content library
            </p>
          </div>
          
          {/* Display dimes info */}
          <div className="flex items-center mt-4 md:mt-0">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-100 text-amber-800">
              <Coins className="h-5 w-5" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-lg">{profile?.dime_coins || 0}</p>
                  <span className="text-xs">Dimes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Check-in Card */}
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-purple-50 to-amber-50 border border-amber-100">
            <div className="flex flex-col md:flex-row items-center justify-between p-6">
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-1">Daily Dime Check-in</h3>
                <p className="text-muted-foreground mb-4 md:mb-0">
                  Earn free dimes every day by checking in
                </p>
              </div>
              <div className="flex items-center">
                {canCheckIn ? (
                  <Button 
                    onClick={handleDailyCheckIn}
                    disabled={isCheckingIn}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    {isCheckingIn ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Checking in...
                      </>
                    ) : (
                      <>
                        <Coins className="mr-2 h-4 w-4" />
                        Collect Dimes
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="flex flex-col items-center md:items-end">
                    <div className="flex items-center text-amber-800 bg-amber-100/70 px-3 py-1 rounded-full text-sm">
                      <AlertCircle className="mr-1 h-4 w-4" />
                      Already claimed today
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Come back tomorrow for more dimes
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Spin The Wheel Game Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Games</h2>
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-purple-100 overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-2/3 p-6">
                <h3 className="text-xl font-bold mb-2">Spin the Wheel</h3>
                <p className="text-muted-foreground mb-4">
                  Try your luck and earn between 1-10 dimes per spin! You get 3 spins every 8 hours.
                </p>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium">Spins remaining:</span>
                      <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold">
                        {spinCount}/{maxSpins}
                      </span>
                    </div>
                    
                    {/* Make the countdown timer more prominent and always visible */}
                    <div className="flex items-center bg-purple-100 text-purple-700 px-3 py-2 rounded-md mt-2 mb-2">
                      <Clock className="h-4 w-4 mr-2" />
                      <div>
                        <span className="text-sm font-medium">Next reset:</span>
                        <span className="ml-2 font-bold">{formatTimeRemaining()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Button
                      onClick={handleSpinWheel}
                      disabled={isSpinning || spinCount <= 0}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {isSpinning ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Spinning...
                        </>
                      ) : (
                        <>
                          Spin the Wheel
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="w-full md:w-1/3 bg-indigo-100/50 p-6 flex flex-col items-center justify-center">
                <div className="mb-4">
                  {spinResult ? (
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center rounded-full w-24 h-24 bg-indigo-500 text-white text-3xl font-bold mb-2">
                        {spinResult}
                      </div>
                      <p className="text-indigo-700 font-medium">{spinResultMessage}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center rounded-full w-24 h-24 bg-indigo-100 text-indigo-300 text-3xl font-bold mb-2">
                        ?
                      </div>
                      <p className="text-indigo-700 font-medium">
                        {isSpinning ? "Good luck!" : "Spin to win!"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/upload" className="block">
            <Card className="h-full transition-all hover:shadow-md hover:-translate-y-1">
              <CardHeader className="pb-2">
                <div className="p-2 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Upload Content</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Upload your videos, eBooks, and audio files to your library.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="w-full justify-start">
                  Upload Now
                </Button>
              </CardFooter>
            </Card>
          </Link>
          
          <Link to="/library" className="block">
            <Card className="h-full transition-all hover:shadow-md hover:-translate-y-1">
              <CardHeader className="pb-2">
                <div className="p-2 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                  <Library className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>My Library</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Browse and access all your uploaded content in one place.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="w-full justify-start">
                  View Library
                </Button>
              </CardFooter>
            </Card>
          </Link>
          
          <Link to="/purchase-requests" className="block">
            <Card className="h-full transition-all hover:shadow-md hover:-translate-y-1">
              <CardHeader className="pb-2">
                <div className="p-2 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-2">
                  <Coins className="h-6 w-6 text-amber-600" />
                </div>
                <CardTitle>Purchase Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Manage incoming and outgoing content purchase requests.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="w-full justify-start">
                  View Requests
                </Button>
              </CardFooter>
            </Card>
          </Link>
        </div>
                
        {/* Recent Activity Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
          <Card>
            {isLoading ? (
              <div className="p-6 text-center">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Loading your recent activity...</p>
              </div>
            ) : !recentActivity ? (
              <div className="p-6">
                <p className="text-muted-foreground">
                  You haven't uploaded any content yet. Get started by uploading your first file.
                </p>
                <div className="mt-4">
                  <Link to="/upload">
                    <Button>Upload Your First File</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y">
                <Link key={recentActivity.id} to={`/content/${recentActivity.id}`} className="block p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center">
                    <div className="p-2 rounded-full bg-muted mr-3">
                      {renderContentIcon(recentActivity.content_type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{recentActivity.title}</h3>
                      <p className="text-xs text-muted-foreground flex items-center mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        Uploaded on {formatDate(recentActivity.created_at)}
                      </p>
                    </div>
                  </div>
                </Link>
                <div className="p-3 bg-muted/10">
                  <Link to="/library" className="w-full">
                    <Button variant="ghost" size="sm" className="w-full">
                      View All Content
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
