import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Menu, User, Coins } from 'lucide-react';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, profile, logout } = useAuth();
  
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <header className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50 border-purple-100">
      <nav className="container-content flex items-center justify-between h-16">
        <div className="flex items-center gap-8">
          <Link to="/" className="font-bold text-2xl text-purple-600">
            ContentVault
          </Link>
          
          <div className="hidden md:flex items-center gap-6">
            <Link to="/browse" className="text-foreground/80 hover:text-purple-600 font-medium">
              Browse
            </Link>
            {isAuthenticated && (
              <>
                <Link to="/dashboard" className="text-foreground/80 hover:text-purple-600 font-medium">
                  Dashboard
                </Link>
                <Link to="/library" className="text-foreground/80 hover:text-purple-600 font-medium">
                  Library
                </Link>
                <Link to="/upload" className="text-foreground/80 hover:text-purple-600 font-medium">
                  Upload
                </Link>
                <Link to="/purchase-requests" className="text-foreground/80 hover:text-purple-600 font-medium">
                  Purchase Requests
                </Link>
                <Link to="/profile" className="text-foreground/80 hover:text-purple-600 font-medium">
                  Profile
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              {/* Display dime coins in navbar */}
              <div className="hidden md:flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-1 rounded">
                <Coins className="h-4 w-4" />
                <span className="font-medium">{profile?.dime_coins || 0}</span>
              </div>
              
              <span className="hidden md:inline-block text-sm text-foreground/70">
                {profile?.full_name || profile?.username || user?.email}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full" aria-label="User menu">
                    <Avatar>
                      {profile?.avatar_url ? (
                        <AvatarImage src={profile.avatar_url} alt={profile.full_name || 'User'} />
                      ) : (
                        <AvatarFallback className="bg-purple-100 text-purple-600">
                          {getInitials(profile?.full_name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-purple-100">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/library" className="cursor-pointer">My Library</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/purchase-requests" className="cursor-pointer">Purchase Requests</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-destructive">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="border-purple-100">
                    <DropdownMenuItem asChild>
                      <Link to="/browse" className="cursor-pointer">Browse</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="cursor-pointer">Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/library" className="cursor-pointer">Library</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/upload" className="cursor-pointer">Upload</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/purchase-requests" className="cursor-pointer">Purchase Requests</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer">Profile</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="outline" className="border-purple-200 hover:bg-purple-50">Log in</Button>
              </Link>
              <Link to="/signup" className="hidden md:block">
                <Button className="bg-purple-600 hover:bg-purple-700">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
