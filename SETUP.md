# Quick Setup Guide

## 🎯 What You Have

A **complete scaffolded codebase** for a Web-Based AI QA Agent platform with:

✅ **Backend** (Python FastAPI) - All 8 phases stubbed
✅ **Frontend** (React + Tailwind) - Complete UI structure
✅ **Browser Runner** (Isolated Playwright execution)
✅ **Documentation** (Architecture, Development, Implementation Plan)
✅ **Configuration** (Environment files, dependencies)

## 🚀 Quick Start (5 minutes)

### 1. Install Prerequisites

**Install Python 3.10+**
```bash
python --version  # Should be 3.10 or higher
```

**Install Node.js 18+**
```bash
node --version  # Should be 18 or higher
```

**Install Ollama (Local LLM)**
- Download from: https://ollama.ai
- Pull a model: `ollama pull llama2`
- Verify: `ollama list`

### 2. Setup Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env if needed (defaults should work)
```

### 3. Setup Browser Runner

```powershell
cd ..\browser_runner
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium

# Copy environment file
cp .env.example .env
```

### 4. Setup Frontend

```powershell
cd ..\frontend
npm install
```

### 5. Run the Platform

**Terminal 1 - Backend**
```powershell
cd backend
.\venv\Scripts\activate
python main.py
```
✅ Backend should start on http://localhost:8000

**Terminal 2 - Browser Runner**
```powershell
cd browser_runner
.\venv\Scripts\activate
python main.py
```
✅ Browser Runner should start on http://localhost:8001

**Terminal 3 - Frontend**
```powershell
cd frontend
npm run dev
```
✅ Frontend should start on http://localhost:5173

### 6. Access the Platform

Open your browser and go to: **http://localhost:5173**

You should see the QA Agent dashboard!

## 📂 Project Structure

```
Project/
├── backend/                  # FastAPI backend
│   ├── agent/               # 8 phase modules (all stubbed)
│   │   ├── exploration/     # Phase 1: Page exploration
│   │   ├── test_design/     # Phase 2: Test case design
│   │   ├── bdd_generation/  # Phase 3: BDD/Gherkin
│   │   ├── code_generation/ # Phase 4: Playwright code
│   │   ├── verification/    # Phase 5: Test execution
│   │   ├── ci_integration/  # Phase 6: Jenkins/CI
│   │   ├── monitoring/      # Phase 7: Analytics
│   │   └── maintenance/     # Phase 8: Self-healing
│   ├── api/routes/          # REST API endpoints
│   ├── llm/                 # LLM client (Ollama/HF)
│   ├── services/            # Orchestrator & WebSocket
│   ├── config/              # Settings
│   └── main.py              # Entry point
│
├── browser_runner/          # Isolated Playwright execution
│   ├── executor/            # Playwright runner
│   ├── rpc/                 # WebSocket RPC server
│   └── main.py              # Entry point
│
├── frontend/                # React UI
│   ├── src/
│   │   ├── components/      # Layout, etc.
│   │   ├── pages/           # Dashboard, Chat, etc.
│   │   └── App.jsx          # Main app
│   └── package.json
│
├── generated_tests/         # Output directory
│   ├── pages/               # POM classes
│   ├── features/            # BDD files
│   ├── tests/               # Test files
│   └── conftest.py          # Pytest config
│
└── docs/                    # Documentation
    ├── ARCHITECTURE.md      # System architecture
    ├── DEVELOPMENT.md       # Dev guide
    └── IMPLEMENTATION_PLAN.md  # Roadmap
```

## 🎨 Current State

**All modules are SCAFFOLDED** with:
- ✅ Complete class structures
- ✅ Function signatures
- ✅ Comprehensive TODO comments
- ✅ Type hints
- ✅ Docstrings
- ✅ Integration points marked

**NO real logic yet** - this is intentional! You can now:
1. Start coding immediately
2. Know exactly what needs to be implemented
3. Understand how all pieces connect

## 🛠️ What to Implement Next

Follow the **IMPLEMENTATION_PLAN.md** in the `docs/` folder.

**Recommended order:**

1. **WebSocket connections** (frontend & browser runner)
2. **LLM client** (Ollama integration)
3. **Storage layer** (SQLite + file storage)
4. **Phase 1 - Exploration** (foundation for everything)
5. **Phase 2 - Test Design** (test case generation)
6. **Phase 3 - BDD** (Gherkin generation)
7. **Phase 4 - Code Gen** (Playwright code)
8. **Phase 5 - Verification** (test execution)
9. **Phases 6-8** (CI/CD, monitoring, self-healing)

## 📝 Key Features to Implement

### Phase 1: Exploration
- Browser automation via Playwright
- DOM parsing and element extraction
- Screenshot capture
- Visual signature generation
- Structured representation storage

### Phase 2: Test Design  
- LLM-based test case generation
- Coverage calculation
- Visual coverage map (annotated screenshots)
- Interactive refinement

### Phase 3: BDD Generation
- Parse existing .feature files
- Build step library for reuse
- Generate new scenarios reusing steps
- Handle Background and Scenario Outline

### Phase 4: Code Generation
- Generate POM classes
- Generate Playwright test code
- Optimize locator selection
- Self-verify generated code

### Phase 5: Verification
- Execute tests via browser runner
- Capture evidence (screenshots, videos, logs)
- Generate Allure reports
- Step-by-step BDD breakdown

### Phase 6: CI/CD Integration
- Create Jenkins jobs
- Configure Allure reporting
- Schedule execution

### Phase 7: Monitoring
- Parse test history
- Identify flaky tests
- Trend analysis
- Email summaries

### Phase 8: Maintenance
- **Self-Healing**: Fix broken locators using visual matching
- **Extension**: Detect new UI elements, update tests

## 🔍 Finding Your Way

**Looking for something?**

- **Backend API endpoints**: `backend/api/routes/`
- **Agent phase modules**: `backend/agent/`
- **Frontend pages**: `frontend/src/pages/`
- **Browser automation**: `browser_runner/executor/`
- **LLM integration**: `backend/llm/client.py`
- **WebSocket**: `backend/services/websocket_manager.py`

**Every file has extensive TODO comments!**

## 🧪 Testing

Once implemented:

```powershell
# Backend tests
cd backend
pytest tests/

# Frontend tests  
cd frontend
npm test

# Generated tests
cd generated_tests
pytest
```

## 📚 Learn More

- **ARCHITECTURE.md**: System design and data flow
- **DEVELOPMENT.md**: Development workflow and debugging
- **IMPLEMENTATION_PLAN.md**: Step-by-step implementation roadmap

## ⚠️ Important Constraints

1. **NO paid LLM APIs** - Use Ollama (local) or HuggingFace (free tier) only
2. **Browser runner MUST be isolated** - Separate from agent logic
3. **Must use POM pattern** - All generated tests use Page Object Model
4. **Must reuse BDD steps** - Analyze existing features (legacy challenge)
5. **Track metrics** - Token usage and response time per iteration

## 🎯 Success Criteria

You're on track when:
- ✅ All phases (1-8) are working end-to-end
- ✅ UI shows live browser feed
- ✅ Metrics dashboard displays token usage & response time
- ✅ Coverage visualization with shaded regions works
- ✅ Diff view shows old vs new versions
- ✅ Undo/Redo functionality works
- ✅ Self-healing can fix broken locators
- ✅ Extension can detect and test new UI elements

## 💡 Tips

1. **Start small**: Implement one function at a time
2. **Test frequently**: Run code after each implementation
3. **Use the TODOs**: They guide you through implementation
4. **Read the docs**: Architecture and implementation plan have all details
5. **Ask questions**: Comment your assumptions

## 🚧 Known Limitations (Current Scaffold)

- No database yet (needs implementation)
- No WebSocket connections (needs implementation)
- No LLM integration (needs implementation)
- No browser automation (needs implementation)
- All API endpoints return placeholders
- Frontend doesn't connect to backend yet

**This is expected!** You now have a clean canvas to paint on.

## ✨ You're Ready!

You have a **complete, production-ready architecture** with clear implementation paths. Start coding and watch your QA Agent come to life! 🎉

---

**Need help?** Check the docs or look for TODO comments in the code!
