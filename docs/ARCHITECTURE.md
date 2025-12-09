# Architecture Documentation

## System Architecture

This project follows a three-tier architecture:

### 1. Frontend (React + Tailwind)
- **Location**: `/frontend`
- **Purpose**: User interface for interacting with the AI agent
- **Components**:
  - Chat interface
  - Test design visualization
  - Code viewer with diff
  - Metrics dashboard
  - Live browser feed

### 2. Backend (FastAPI + Python)
- **Location**: `/backend`
- **Purpose**: AI agent brain and orchestration
- **Modules**:
  - **Agent Modules** (8 phases):
    1. Exploration (`agent/exploration`)
    2. Test Design (`agent/test_design`)
    3. BDD Generation (`agent/bdd_generation`)
    4. Code Generation (`agent/code_generation`)
    5. Verification (`agent/verification`)
    6. CI/CD Integration (`agent/ci_integration`)
    7. Continuous Monitoring (`agent/monitoring`)
    8. Maintenance (`agent/maintenance`)
  - **LLM Integration** (`llm/`): Local/free-tier LLM clients
  - **API Routes** (`api/routes/`): REST endpoints
  - **Services** (`services/`): Orchestration and WebSocket management

### 3. Browser Runner (Isolated Execution)
- **Location**: `/browser_runner`
- **Purpose**: Isolated browser automation
- **Components**:
  - Playwright executor
  - WebSocket RPC server
  - Test execution engine

## Data Flow

```
User Input (Frontend)
  ↓
WebSocket → Backend API
  ↓
Agent Orchestrator
  ↓
Phase Modules (1-8)
  ↓
Browser Runner (RPC) ← Isolated Execution
  ↓
Results → Storage
  ↓
WebSocket → Frontend (Display)
```

## Communication Protocols

### Frontend ↔ Backend
- **REST API**: For standard requests (sessions, metrics, etc.)
- **WebSocket**: For real-time chat and progress updates

### Backend ↔ Browser Runner
- **WebSocket RPC**: For browser commands and test execution
- Commands: `navigate`, `get_dom`, `screenshot`, `click`, `fill`, `execute_test`

## Storage Structure

```
/storage
  /knowledge_base      # Structured representations
  /visual_signatures   # Element visual signatures for healing
  /versions           # Version history for undo/redo
  /metrics            # Performance metrics
```

## Module Dependencies

```
Frontend → Backend API
Backend API → Agent Orchestrator
Agent Orchestrator → Phase Modules
Phase Modules → LLM Client + Browser Runner
Browser Runner → Playwright
```

## Key Design Decisions

1. **Isolation**: Browser runner is completely separate to prevent interference
2. **POM Architecture**: All generated tests use Page Object Model
3. **BDD Reuse**: Agent must analyze and reuse existing steps (legacy challenge)
4. **Free-tier LLMs**: No paid APIs allowed
5. **Observability**: Token usage and response time tracked per iteration
6. **Self-healing**: Visual signatures enable automatic locator repair
7. **Versioning**: All changes tracked with undo/redo support

## TODO: Implementation Priorities

1. Implement WebSocket connections (frontend and browser runner)
2. Implement LLM client (Ollama integration)
3. Implement Phase 1 (Exploration) completely
4. Connect frontend to backend
5. Implement storage layer
6. Implement remaining phases sequentially
7. Add comprehensive error handling
8. Add logging and monitoring
9. Add tests for each module
10. Add CI/CD pipeline for the platform itself
