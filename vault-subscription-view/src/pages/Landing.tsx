
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Check, Video, FileText, FileAudio, Shield, Cloud, Zap } from 'lucide-react';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-purple-50">
        <div className="container-content py-12 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Store and Access Your Media <span className="text-purple-600">Anytime, Anywhere</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground">
                The secure cloud platform for all your videos, audio files, and eBooks.
              </p>
              <div className="flex flex-wrap gap-4">
                {isAuthenticated ? (
                  <Button 
                    size="lg" 
                    className="bg-purple-600 hover:bg-purple-700 text-lg"
                    onClick={() => navigate('/dashboard')}
                  >
                    Go to Dashboard
                  </Button>
                ) : (
                  <>
                    <Button 
                      size="lg" 
                      className="bg-purple-600 hover:bg-purple-700 text-lg"
                      onClick={() => navigate('/signup')}
                    >
                      Get Started
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg"
                      className="border-purple-200 hover:bg-purple-50 text-lg"
                      onClick={() => navigate('/login')}
                    >
                      Log In
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="rounded-lg overflow-hidden shadow-2xl">
              <img 
                src="/placeholder.svg" 
                alt="ContentVault Dashboard" 
                className="w-full" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container-content">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need for Your Media Library
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              ContentVault provides a secure and organized way to store and access all your media files.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="bg-white p-6 rounded-lg shadow-md border border-purple-100 flex flex-col items-center text-center transition-all hover:shadow-lg hover:-translate-y-1">
              <div className="bg-purple-100 p-3 rounded-full mb-4">
                <Video className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Video Library</h3>
              <p className="text-muted-foreground">
                Organize and stream your video collection in HD quality from any device.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-purple-100 flex flex-col items-center text-center transition-all hover:shadow-lg hover:-translate-y-1">
              <div className="bg-purple-100 p-3 rounded-full mb-4">
                <FileAudio className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Audio Collection</h3>
              <p className="text-muted-foreground">
                Store podcasts, music, and audiobooks in one secure location.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-purple-100 flex flex-col items-center text-center transition-all hover:shadow-lg hover:-translate-y-1">
              <div className="bg-purple-100 p-3 rounded-full mb-4">
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">eBook Shelf</h3>
              <p className="text-muted-foreground">
                Keep your PDFs and eBooks organized and accessible anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-purple-50">
        <div className="container-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why Choose ContentVault?
              </h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="mr-3 bg-purple-100 rounded-full p-1">
                    <Check className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Secure Storage</h3>
                    <p className="text-muted-foreground">
                      Your content is protected with enterprise-grade security.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="mr-3 bg-purple-100 rounded-full p-1">
                    <Check className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Access Anywhere</h3>
                    <p className="text-muted-foreground">
                      Available on any device with an internet connection.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="mr-3 bg-purple-100 rounded-full p-1">
                    <Check className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Easy Organization</h3>
                    <p className="text-muted-foreground">
                      Intuitive tools to keep your media organized and searchable.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="mr-3 bg-purple-100 rounded-full p-1">
                    <Check className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">High-Quality Streaming</h3>
                    <p className="text-muted-foreground">
                      Stream videos and audio in high quality without buffering.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                {!isAuthenticated && (
                  <Link to="/signup">
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      Create Free Account
                    </Button>
                  </Link>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md border border-purple-100 flex flex-col items-center text-center">
                <div className="bg-purple-100 p-3 rounded-full mb-4">
                  <Shield className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold">Privacy First</h3>
                <p className="text-sm text-muted-foreground">
                  Your data belongs to you and only you
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md border border-purple-100 flex flex-col items-center text-center">
                <div className="bg-purple-100 p-3 rounded-full mb-4">
                  <Cloud className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold">Cloud Storage</h3>
                <p className="text-sm text-muted-foreground">
                  Never worry about losing your files
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md border border-purple-100 flex flex-col items-center text-center">
                <div className="bg-purple-100 p-3 rounded-full mb-4">
                  <Zap className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold">Fast Upload</h3>
                <p className="text-sm text-muted-foreground">
                  Quick uploads even for large files
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md border border-purple-100 flex flex-col items-center text-center">
                <div className="bg-purple-100 p-3 rounded-full mb-4">
                  <Video className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold">Media Player</h3>
                <p className="text-sm text-muted-foreground">
                  Built-in player for all file types
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-purple-600 text-white">
        <div className="container-content text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to start storing your media?
          </h2>
          <p className="text-lg text-purple-100 max-w-2xl mx-auto mb-8">
            Join thousands of users who trust ContentVault for their media storage needs.
          </p>
          {isAuthenticated ? (
            <Button 
              size="lg" 
              variant="outline" 
              className="bg-white text-purple-600 hover:bg-purple-50 border-white"
              onClick={() => navigate('/dashboard')}
            >
              Go to Your Dashboard
            </Button>
          ) : (
            <Button 
              size="lg" 
              variant="outline" 
              className="bg-white text-purple-600 hover:bg-purple-50 border-white"
              onClick={() => navigate('/signup')}
            >
              Sign Up Free
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container-content">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">ContentVault</h3>
              <p className="text-gray-400">
                The secure cloud platform for all your media needs.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">Product</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">Features</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">About</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">Privacy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Terms</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} ContentVault. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
