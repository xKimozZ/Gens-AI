# Web Testing Agent - Next.js Frontend

This is the Next.js 14+ version of the Web Testing Agent frontend, featuring TypeScript and Tailwind CSS.

## Features

- ✅ **Next.js 14+ with App Router** - Modern React framework
- ✅ **TypeScript** - Type-safe development
- ✅ **Tailwind CSS** - Utility-first styling
- ✅ **React Context** - State management with localStorage persistence
- ✅ **Full Feature Parity** - All original features ported

## Project Structure

```
frontend-next/
├── app/
│   ├── globals.css        # Global styles and Tailwind imports
│   ├── layout.tsx         # Root layout with AppProvider
│   └── page.tsx           # Main page with tabs
├── components/
│   ├── CodegenTab.tsx     # Phase 4: Code generation
│   ├── ExplorationTab.tsx # Phase 1: Page exploration
│   ├── MetricsPanel.tsx   # Metrics sidebar
│   ├── ReviewTab.tsx      # Phase 3: Test review and AI chat
│   └── TestSuitesTab.tsx  # Phase 2: Test suite design
├── contexts/
│   └── AppContext.tsx     # Global state management
└── lib/
    ├── api.ts             # API client for FastAPI backend
    └── utils.ts           # Utility functions
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- FastAPI backend running on `http://localhost:8000`

### Installation

```bash
cd frontend-next/frontend-next
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Features by Tab

### 📁 Explorations (Phase 1)
- Enter URL and explore web pages
- View extracted page elements
- Save exploration sessions
- Rename and delete explorations
- Press Enter to explore

### 📋 Test Suites (Phase 2)
- Design test cases from explorations
- Choose number of tests (5-20)
- View test details (steps, locators, priority)
- Save and manage multiple test suites
- Color-coded priority levels

### 💬 Review & Edit (Phase 3)
- **Manual Edit Mode**: Direct test case editing
- **AI Chat Mode**: Natural language test modifications
- Chat history per suite (persisted in localStorage)
- Save changes to test suites

### 💻 Generate Code (Phase 4)
- Generate Playwright Python code
- Add custom instructions
- Copy to clipboard
- Download as .py file

### 📊 Metrics Panel
- Total response time
- Tokens used
- Average response time
- Per-phase metrics breakdown
- Auto-updates every 5 seconds

## State Management

All data is persisted in browser localStorage:
- **Explorations**: Saved page exploration results
- **Test Suites**: Designed test cases
- **Chat Histories**: AI chat conversations per suite

## API Integration

The app connects to the FastAPI backend at `http://localhost:8000`:

- `POST /api/explore` - Explore a URL
- `POST /api/design-tests` - Design test cases
- `POST /api/chat` - AI-powered test modifications
- `POST /api/generate-code` - Generate Playwright code
- `GET /api/metrics` - Get performance metrics
- `POST /api/reset` - Reset agent state

## Color Scheme

The design matches the original frontend:
- **Primary**: Purple (#667eea, #764ba2)
- **Background Gradient**: Purple 600 to 900
- **Cards**: White with shadow
- **Success**: Green
- **Danger**: Red
- **Priority Tags**: Red (high), Yellow (medium), Green (low)

## Keyboard Shortcuts

- **Enter** in URL input → Explore
- **Enter** in chat input → Send message

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000
```

### Backend Connection Error
Ensure FastAPI backend is running:
```bash
cd ../../
python app.py
```

### Clear localStorage
Open browser console:
```javascript
localStorage.clear()
location.reload()
```

## Development Notes

- Hot reload enabled
- TypeScript strict mode
- ESLint configured
- Tailwind CSS v4 with @tailwindcss/postcss

## Migration from Vanilla JS

Key improvements over the original frontend:
- ✅ Type safety with TypeScript
- ✅ Component-based architecture
- ✅ Better state management
- ✅ Modern tooling and build process
- ✅ Maintainable Tailwind CSS
- ✅ No global namespace pollution
- ✅ Server-side rendering ready (if needed)
