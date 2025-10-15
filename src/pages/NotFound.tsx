import { AlertCircle, Home, RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';

export default function NotFound() {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1f35 50%, #0f1420 100%)',
      }}
    >
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl">
          {/* Large 404 Text */}
          <div className="text-center mb-8">
            <h1 
              className="text-[120px] md:text-[140px] font-bold leading-none mb-3"
              style={{
                background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #f0abfc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              404
            </h1>
          </div>

          {/* Glass Card */}
          <div className="glass-card rounded-2xl p-6 md:p-8 mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-2">
              Oops! Page Not Found
            </h2>
            <p className="text-gray-400 text-center mb-6 max-w-md mx-auto text-sm">
              The page you're looking for seems to have wandered off into the digital void.
            </p>

            <p className="text-white text-center font-medium mb-4 text-sm">
              Here's what you can do:
            </p>

            {/* Suggestion Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div 
                className="glass rounded-xl p-4 text-center hover:bg-white/10 transition-all cursor-default border border-white/10"
              >
                <div className="flex justify-center mb-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Search className="w-4 h-4 text-blue-400" />
                  </div>
                </div>
                <p className="text-gray-300 text-xs">Check the URL for typos</p>
              </div>

              <div 
                className="glass rounded-xl p-4 text-center hover:bg-white/10 transition-all cursor-pointer border border-white/10"
                onClick={handleRefresh}
              >
                <div className="flex justify-center mb-2">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                    <RefreshCw className="w-4 h-4 text-purple-400" />
                  </div>
                </div>
                <p className="text-gray-300 text-xs">Refresh the page</p>
              </div>

              <div 
                className="glass rounded-xl p-4 text-center hover:bg-white/10 transition-all cursor-default border border-white/10"
              >
                <div className="flex justify-center mb-2">
                  <div className="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                    <AlertCircle className="w-4 h-4 text-pink-400" />
                  </div>
                </div>
                <p className="text-gray-300 text-xs">Report if unexpected</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <Button
              variant="gradient"
              size="default"
              onClick={handleGoHome}
              className="min-w-[160px]"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <Button
              variant="default"
              size="default"
              onClick={handleGoBack}
              className="min-w-[160px]"
            >
              <svg 
                className="w-4 h-4 mr-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M10 19l-7-7m0 0l7-7m-7 7h18" 
                />
              </svg>
              Go Back
            </Button>
          </div>

          {/* Quote */}
          <p className="text-center text-xs text-gray-500 italic">
            "Not all who wander are lost... but this page definitely is."
          </p>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
