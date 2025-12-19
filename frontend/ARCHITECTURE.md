# Frontend Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         index.html                               │
│                    (620 lines - unchanged)                       │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┴───────────┐
                    │   Load Order Matters    │
                    └────────────┬───────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────┐          ┌─────────────┐          ┌─────────────┐
│  state.js   │          │   api.js    │          │  utils.js   │
│  (217 lines)│          │  (116 lines)│          │ (105 lines) │
├─────────────┤          ├─────────────┤          ├─────────────┤
│ • appState  │          │ • explore   │          │ • escapeHtml│
│ • localStorage│        │ • design    │          │ • download  │
│ • CRUD ops  │          │ • chat      │          │ • clipboard │
└─────────────┘          │ • codegen   │          │ • UI helpers│
                         │ • metrics   │          └─────────────┘
                         └─────────────┘
                                 │
                    ┌────────────┴───────────┐
                    │                        │
                    ▼                        ▼
            ┌─────────────┐          ┌─────────────┐
            │ metrics.js  │          │  UI Modules │
            │  (69 lines) │          │    (760)    │
            ├─────────────┤          └──────┬──────┘
            │ • update    │                 │
            │ • display   │    ┌────────────┼────────────┐
            │ • phases    │    │            │            │
            └─────────────┘    ▼            ▼            ▼
                         ┌──────────┐ ┌──────────┐ ┌──────────┐
                         │explore.js│ │design.js │ │review.js │
                         │(171 lines)│ │(225 lines)│ │(246 lines)│
                         ├──────────┤ ├──────────┤ ├──────────┤
                         │Phase 1:  │ │Phase 2:  │ │Phase 3:  │
                         │• URL     │ │• Test    │ │• Edit    │
                         │• Display │ │• Render  │ │• Chat    │
                         │• List    │ │• Toggle  │ │• Save    │
                         └──────────┘ └──────────┘ └──────────┘
                                           │
                                           ▼
                                     ┌──────────┐
                                     │codegen.js│
                                     │(118 lines)│
                                     ├──────────┤
                                     │Phase 4:  │
                                     │• Generate│
                                     │• Display │
                                     │• Download│
                                     └──────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                              │
                    ▼                                              ▼
            ┌─────────────┐                              ┌─────────────┐
            │  main.js    │                              │  Browser    │
            │  (37 lines) │                              │   Events    │
            ├─────────────┤                              ├─────────────┤
            │ • switchTab │◄─────────────────────────────┤ • onclick   │
            │ • init      │                              │ • onchange  │
            └─────────────┘                              │ • DOMReady  │
                                                         └─────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Data Flow Example                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User clicks "Explore" button                                    │
│         │                                                        │
│         ├─► explore.js::exploreUrl()                            │
│         │        │                                               │
│         │        ├─► api.js::apiExploreUrl(url)                 │
│         │        │        │                                      │
│         │        │        └─► Backend /api/explore               │
│         │        │                 │                             │
│         │        │                 └─► Returns data              │
│         │        │                                               │
│         │        ├─► state.js::addExploration(data)             │
│         │        │        │                                      │
│         │        │        └─► localStorage.setItem()             │
│         │        │                                               │
│         │        ├─► explore.js::displayExplorationResult()     │
│         │        │        │                                      │
│         │        │        └─► Updates DOM                        │
│         │        │                                               │
│         │        └─► metrics.js::updateMetrics()                │
│         │                 │                                      │
│         │                 └─► Refreshes metrics display          │
│         │                                                        │
│         └─► explore.js::renderExplorationsList()                │
│                  │                                               │
│                  └─► Updates sidebar                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Module Dependencies                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  main.js                                                         │
│    └─► Depends on: ALL modules                                  │
│                                                                  │
│  UI Modules (explore, design, review, codegen)                  │
│    ├─► state.js (read/write app state)                          │
│    ├─► api.js (backend calls)                                   │
│    ├─► utils.js (helpers)                                       │
│    └─► metrics.js (update metrics)                              │
│                                                                  │
│  metrics.js                                                      │
│    ├─► state.js (read/write metrics)                            │
│    ├─► api.js (fetch from backend)                              │
│    └─► utils.js (escapeHtml)                                    │
│                                                                  │
│  api.js                                                          │
│    └─► No dependencies (pure API layer)                         │
│                                                                  │
│  utils.js                                                        │
│    └─► No dependencies (pure utilities)                         │
│                                                                  │
│  state.js                                                        │
│    └─► No dependencies (pure state management)                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    File Size Distribution                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ui/review.js   ████████████████████████████████ 246 lines      │
│  ui/design.js   ███████████████████████████ 225 lines           │
│  state.js       ██████████████████████ 217 lines                │
│  ui/explore.js  █████████████████ 171 lines                     │
│  ui/codegen.js  ████████████ 118 lines                          │
│  api.js         ███████████ 116 lines                           │
│  utils.js       ██████████ 105 lines                            │
│  metrics.js     ██████ 69 lines                                 │
│  main.js        ███ 37 lines                                    │
│                                                                  │
│  Total: 1,304 lines (was 1,489 in monolith)                     │
│  Average: 145 lines per file                                    │
│  Largest: 246 lines (review.js)                                 │
│  Smallest: 37 lines (main.js)                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Principles Applied

### 1. **Separation of Concerns**
Each module has a single, well-defined responsibility

### 2. **Dependency Injection**
No circular dependencies - clean dependency tree

### 3. **State Centralization**
All state in `window.appState`, managed by state.js

### 4. **API Abstraction**
All backend calls go through api.js - easy to swap backends

### 5. **Utility Reuse**
Common functions in utils.js - DRY principle

### 6. **Progressive Enhancement**
Core modules load first, then UI, then initialization

### 7. **Backwards Compatibility**
All HTML onclick handlers still work - zero breaking changes
