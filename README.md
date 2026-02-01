# 🎬 NoWorries AI Studio

> AI-Powered Video Generation Platform with Multi-Provider Support

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/savorsem/noworries_scosta)

## ✨ Features

### 🎨 Modern, Responsive UI
- Beautiful gradient backgrounds with animated effects
- Glassmorphism design elements
- Smooth animations and transitions
- Mobile-first responsive design
- Dark theme optimized for extended use

### 🔐 Secure API Key Management
- **No Google Cloud Account Required** - Manage API keys directly in the app
- Support for multiple AI providers:
  - 🤖 Google Gemini (Text & Video Generation)
  - 🧠 OpenAI (GPT Models)
  - 🎭 Anthropic Claude
  - 🎨 Replicate (AI Models)
  - 🖼️ Stability AI (Image Generation)
  - ➕ Custom Providers

- **Local Storage Only** - Your API keys never leave your browser
- Easy provider switching - Enable/disable providers on the fly
- Secure key visibility toggle

### 🎯 Smart Features
- Intelligent prompt suggestions
- Video generation history
- Real-time generation status
- Error handling with helpful messages
- PWA support for offline access

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- API key from at least one supported provider

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/savorsem/noworries_scosta.git
   cd noworries_scosta
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   ```
   http://localhost:5173
   ```

### 🔑 Setting Up API Keys

#### Option 1: Through the UI (Recommended)

1. Click the ⚙️ Settings icon in the top right
2. Go to the "API Keys" tab
3. Enable your desired provider(s)
4. Enter your API key(s)
5. Click "Save Settings"

#### Option 2: Manual Configuration

API keys are stored in `localStorage` with the key `api_providers`. Format:

```json
[
  {
    "id": "google-gemini",
    "name": "Google Gemini",
    "key": "YOUR_API_KEY_HERE",
    "enabled": true,
    "keyPlaceholder": "AIzaSy...",
    "description": "Google's Gemini AI model"
  }
]
```

### 📋 Getting API Keys

#### Google Gemini
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy and paste into the app settings

#### OpenAI
1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new secret key
3. Copy and paste into the app settings

#### Anthropic Claude
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Generate an API key
3. Copy and paste into the app settings

#### Replicate
1. Visit [Replicate API Tokens](https://replicate.com/account/api-tokens)
2. Create a new token
3. Copy and paste into the app settings

#### Stability AI
1. Visit [DreamStudio](https://platform.stability.ai/)
2. Generate an API key
3. Copy and paste into the app settings

## 🏗️ Project Structure

```
noworries_scosta/
├── api/                    # Vercel serverless API routes
│   ├── ai/                # AI generation endpoints
│   ├── integrations/      # Integration management
│   └── jobs/              # Background job handling
├── components/            # React components
│   ├── EnhancedSettingsDrawer.tsx  # Settings UI with API key management
│   ├── VideoCard.tsx               # Video display component
│   ├── BottomPromptBar.tsx         # Prompt input component
│   └── ...
├── services/              # Service layer
│   ├── geminiService.ts   # Google Gemini integration
│   ├── providerClients.ts # Multi-provider support
│   └── ...
├── App.tsx                # Main application component
├── index.tsx              # Application entry point
├── index.css              # Global styles with animations
└── manifest.json          # PWA manifest
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
npm run format       # Check formatting
npm run format:write # Fix formatting
npm run typecheck    # Run TypeScript checks
```

### Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

## 🚢 Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/savorsem/noworries_scosta)

1. Click the button above
2. Follow Vercel's deployment wizard
3. Your app will be live in minutes!

### Manual Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy the `dist/` folder to your hosting provider

3. Ensure your hosting supports:
   - Single Page Application (SPA) routing
   - Serverless functions (for API routes)

## 🔒 Security & Privacy

- **Local Storage Only**: API keys are stored in your browser's localStorage
- **No Server Storage**: We never send or store your API keys on our servers
- **Client-Side Processing**: All sensitive operations happen in your browser
- **HTTPS Required**: Always use HTTPS in production for secure communication

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🐛 Troubleshooting

### Build Errors

**Issue**: `Cannot find module 'react'`
**Solution**: Run `npm install` to install all dependencies

**Issue**: `index.tsx is empty`
**Solution**: This has been fixed. Pull the latest changes from main branch.

### API Key Issues

**Issue**: "No API key configured"
**Solution**: 
1. Open Settings (⚙️ icon)
2. Go to API Keys tab
3. Enable at least one provider
4. Enter a valid API key
5. Click Save Settings

**Issue**: API key not working
**Solution**:
1. Verify the key is correct and hasn't expired
2. Check if the provider service is operational
3. Ensure you have credits/quota remaining

### Performance Issues

**Issue**: Slow loading
**Solution**: 
- Clear browser cache
- Check your internet connection
- Disable browser extensions

## 🙏 Acknowledgments

- Built with [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Lucide](https://lucide.dev/)
- Deployed on [Vercel](https://vercel.com/)

## 📧 Support

If you have any questions or need help, please:
1. Check the [Issues](https://github.com/savorsem/noworries_scosta/issues) page
2. Create a new issue if your problem isn't already listed

---

Made with ❤️ by the NoWorries team
