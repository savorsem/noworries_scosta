import React, { useState, useEffect } from 'react';
import { Settings, Play, Loader2, Sparkles } from 'lucide-react';
import EnhancedSettingsDrawer from './components/EnhancedSettingsDrawer';
import VideoCard from './components/VideoCard';
import BottomPromptBar from './components/BottomPromptBar';
import StudioAgent from './components/StudioAgent';

interface Video {
  id: string;
  prompt: string;
  status: 'generating' | 'ready' | 'error';
  url?: string;
  createdAt: number;
}

const App: React.FC = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  // Check if API keys are configured
  useEffect(() => {
    const providers = localStorage.getItem('api_providers');
    if (!providers) {
      // First time user - show settings
      setTimeout(() => {
        setSettingsOpen(true);
      }, 1000);
    }
  }, []);

  useEffect(() => {
    // Auto-hide welcome screen after 3 seconds if there are videos
    if (videos.length > 0 && showWelcome) {
      const timer = setTimeout(() => setShowWelcome(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [videos, showWelcome]);

  const handleGenerate = async (prompt: string) => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setShowWelcome(false);

    const newVideo: Video = {
      id: Date.now().toString(),
      prompt,
      status: 'generating',
      createdAt: Date.now(),
    };

    setVideos((prev) => [newVideo, ...prev]);

    try {
      // Check if API keys are configured
      const providersStr = localStorage.getItem('api_providers');
      if (!providersStr) {
        throw new Error('No API providers configured');
      }

      const providers = JSON.parse(providersStr);
      const enabledProvider = providers.find((p: any) => p.enabled && p.key);

      if (!enabledProvider) {
        throw new Error('No API key configured. Please add an API key in Settings.');
      }

      // Simulate API call (replace with actual API integration)
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Update video status (this would be replaced with actual API response)
      setVideos((prev) =>
        prev.map((v) =>
          v.id === newVideo.id
            ? {
                ...v,
                status: 'ready',
                url: 'https://example.com/video.mp4', // Replace with actual URL
              }
            : v
        )
      );
    } catch (error: any) {
      console.error('Generation failed:', error);
      setVideos((prev) =>
        prev.map((v) =>
          v.id === newVideo.id ? { ...v, status: 'error' } : v
        )
      );
      
      // Show error to user
      if (error.message.includes('API key')) {
        alert(error.message);
        setSettingsOpen(true);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 backdrop-blur-md bg-gray-900/80 border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">NoWorries AI Studio</h1>
              <p className="text-xs text-gray-400">AI-Powered Video Generation</p>
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2.5 hover:bg-gray-800 rounded-lg transition-colors relative group"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-gray-300 group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-32 px-4">
        {showWelcome && videos.length === 0 && (
          <div className="max-w-2xl mx-auto text-center py-20 animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Play className="w-10 h-10" />
            </div>
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Welcome to NoWorries AI Studio
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              Transform your ideas into stunning AI-generated videos.
              <br />
              Just describe what you want to create and let AI do the magic.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setSettingsOpen(true)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Settings className="w-5 h-5" />
                Configure API Keys
              </button>
            </div>
          </div>
        )}

        {isGenerating && videos.length === 1 && (
          <div className="max-w-2xl mx-auto text-center py-12 animate-fade-in">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-indigo-500 animate-spin" />
            <h3 className="text-2xl font-semibold mb-2">Generating your video...</h3>
            <p className="text-gray-400">This may take a few moments. Please wait.</p>
          </div>
        )}

        {videos.length > 0 && (
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Your Videos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Prompt Bar */}
      <BottomPromptBar onSubmit={handleGenerate} disabled={isGenerating} />

      {/* Enhanced Settings Drawer */}
      <EnhancedSettingsDrawer
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>
    </div>
  );
};

export default App;
