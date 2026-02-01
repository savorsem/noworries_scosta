import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Palette,
  Shield,
  Database,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Save,
} from 'lucide-react';

interface ApiProvider {
  id: string;
  name: string;
  key: string;
  enabled: boolean;
  keyPlaceholder: string;
  description: string;
}

interface EnhancedSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const EnhancedSettingsDrawer: React.FC<EnhancedSettingsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'api-keys' | 'appearance' | 'privacy'>('api-keys');
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Load saved API keys from localStorage
  useEffect(() => {
    const savedProviders = localStorage.getItem('api_providers');
    if (savedProviders) {
      try {
        setProviders(JSON.parse(savedProviders));
      } catch (e) {
        console.error('Failed to load API providers', e);
      }
    } else {
      // Default providers
      setProviders([
        {
          id: 'google-gemini',
          name: 'Google Gemini',
          key: '',
          enabled: true,
          keyPlaceholder: 'AIzaSy...',
          description: 'Google\'s Gemini AI model for text and video generation',
        },
        {
          id: 'openai',
          name: 'OpenAI',
          key: '',
          enabled: false,
          keyPlaceholder: 'sk-...',
          description: 'OpenAI GPT models for text generation',
        },
        {
          id: 'anthropic',
          name: 'Anthropic Claude',
          key: '',
          enabled: false,
          keyPlaceholder: 'sk-ant-...',
          description: 'Anthropic\'s Claude AI models',
        },
        {
          id: 'replicate',
          name: 'Replicate',
          key: '',
          enabled: false,
          keyPlaceholder: 'r8_...',
          description: 'Run AI models in the cloud',
        },
        {
          id: 'stability',
          name: 'Stability AI',
          key: '',
          enabled: false,
          keyPlaceholder: 'sk-...',
          description: 'Stable Diffusion and image generation',
        },
      ]);
    }
  }, []);

  const saveProviders = () => {
    setSaveStatus('saving');
    try {
      localStorage.setItem('api_providers', JSON.stringify(providers));
      
      // Also save Google Gemini key to old location for backward compatibility
      const geminiProvider = providers.find(p => p.id === 'google-gemini');
      if (geminiProvider?.key) {
        localStorage.setItem('gemini_api_key', geminiProvider.key);
      }
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Failed to save API providers', e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const updateProvider = (id: string, updates: Partial<ApiProvider>) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const toggleKeyVisibility = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addCustomProvider = () => {
    const newProvider: ApiProvider = {
      id: `custom-${Date.now()}`,
      name: 'Custom Provider',
      key: '',
      enabled: false,
      keyPlaceholder: 'Enter API key...',
      description: 'Custom AI provider',
    };
    setProviders((prev) => [...prev, newProvider]);
  };

  const removeProvider = (id: string) => {
    if (confirm('Are you sure you want to remove this provider?')) {
      setProviders((prev) => prev.filter((p) => p.id !== id));
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full md:w-[600px] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <h2 className="text-2xl font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700/50 px-6">
          {[
            { id: 'api-keys', label: 'API Keys', icon: Key },
            { id: 'appearance', label: 'Appearance', icon: Palette },
            { id: 'privacy', label: 'Privacy', icon: Shield },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'api-keys' && (
            <div className="space-y-6">
              {/* Info Banner */}
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-indigo-300 mb-1">
                    Secure API Key Storage
                  </h3>
                  <p className="text-sm text-gray-300">
                    Your API keys are stored locally in your browser and never sent to our servers.
                    You can manage multiple providers and switch between them easily.
                  </p>
                </div>
              </div>

              {/* Providers List */}
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="bg-gray-800/50 rounded-lg p-5 border border-gray-700/50 hover:border-gray-600/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <input
                          type="checkbox"
                          checked={provider.enabled}
                          onChange={(e) =>
                            updateProvider(provider.id, { enabled: e.target.checked })
                          }
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-2 focus:ring-indigo-500"
                        />
                        <h3 className="text-lg font-semibold text-white">
                          {provider.name}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-400 ml-7">
                        {provider.description}
                      </p>
                    </div>
                    {provider.id.startsWith('custom-') && (
                      <button
                        onClick={() => removeProvider(provider.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type={showKeys[provider.id] ? 'text' : 'password'}
                      value={provider.key}
                      onChange={(e) =>
                        updateProvider(provider.id, { key: e.target.value })
                      }
                      placeholder={provider.keyPlaceholder}
                      className="w-full px-4 py-2.5 pr-12 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                    <button
                      onClick={() => toggleKeyVisibility(provider.id)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-600/50 rounded transition-colors"
                    >
                      {showKeys[provider.id] ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Custom Provider Button */}
              <button
                onClick={addCustomProvider}
                className="w-full py-3 px-4 bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Custom Provider
              </button>

              {/* Save Button */}
              <button
                onClick={saveProviders}
                disabled={saveStatus === 'saving'}
                className="w-full py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saveStatus === 'saving' && (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {saveStatus === 'saved' ? (
                  <>
                    <Check className="w-5 h-5" />
                    Saved Successfully!
                  </>
                ) : saveStatus === 'error' ? (
                  <>
                    <AlertCircle className="w-5 h-5" />
                    Failed to Save
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <Palette className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Appearance Settings
                </h3>
                <p className="text-gray-400">
                  Theme customization coming soon...
                </p>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="bg-gray-800/50 rounded-lg p-5 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-400" />
                  Data Storage
                </h3>
                <p className="text-gray-300 text-sm mb-4">
                  All your data is stored locally in your browser. We don't collect or transmit
                  any personal information.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (confirm('Clear all local data? This cannot be undone.')) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 font-medium transition-colors"
                  >
                    Clear All Data
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default EnhancedSettingsDrawer;
