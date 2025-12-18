# Web Testing Agent MVP

AI-powered web testing assistant with human-in-the-loop capabilities. Built for rapid deployment with hot-swappable LLMs.

## System Flow

```
User → Frontend (frontend/index.html) → FastAPI (app.py) → Agent (agent.py) → LLM + Browser
                                      ↓
                                  Metrics Tracking
```

### Component Breakdown

**agent.py** - Core agent logic
- `TestingAgent` - Main orchestrator
- `PageExplorerTool` - Custom smolagents tool for deep page exploration using Playwright
- Phase 1: `explore_page()` - Extract page structure, elements, locators
- Phase 2: `design_tests()` - Generate test cases with LLM
- Hot-swappable LLM via `MODEL_PROVIDER` env var

**app.py** - FastAPI backend
- `/api/explore` - Phase 1 endpoint
- `/api/design-tests` - Phase 2 endpoint
- `/api/metrics` - Get token usage + response times
- `/api/reset` - Clear agent state

**frontend/** - Web UI assets
- `frontend/index.html` - HTML
- `frontend/style.css` - Styles
- `frontend/script.js` - Client logic
- URL input + explore button
- Real-time output display
- Metrics panel (tokens, response time)
- Test case visualization

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
playwright install chromium
```

### 2. Configure LLM (Choose One)

**Option A: OpenAI (gpt-4o-mini) - Fastest, $$$**
```bash
cp .env.example .env
# Edit .env:
MODEL_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
MODEL_NAME=gpt-4o-mini
```

**Option B: HuggingFace (Free Tier) - Slower, Free**
```bash
cp .env.example .env
# Edit .env:
MODEL_PROVIDER=huggingface
HF_TOKEN=hf_your-token-here
```

**Option C: Ollama (Local) - Free, Private**
```bash
# Install Ollama from https://ollama.ai
ollama pull llama3.2

cp .env.example .env
# Edit .env:
MODEL_PROVIDER=ollama
MODEL_NAME=llama3.2
```

### 3. Run Server
```bash
python app.py
```

### 4. Open Browser
Open: http://localhost:8000
Frontend assets are served from the `frontend/` folder.

## Usage

1. Enter URL (e.g., `https://demo.playwright.dev/todomvc`)
2. Click "🔍 Explore" - Agent analyzes page (30-60s)
3. View exploration results + metrics
4. Click "📋 Design Tests" - Agent generates test cases (30-60s)
5. Review test cases in output panel
6. Click "🔄 Reset" to start over

## What Works Now

✅ Phase 1: Page exploration with Playwright  
✅ Phase 2: Test case generation with LLM  
✅ Metrics tracking (response time, tokens)  
✅ Hot-swappable LLM (OpenAI/HuggingFace/Ollama)  
✅ Web interface with real-time updates  
✅ Visible browser (headless=False)

## What Needs Work

⚠️ **Token counting** - Currently returns 0, needs LLM wrapper  
⚠️ **Test case parsing** - Simple heuristic, needs structured output  
⚠️ **Phase 3** - Code generation (Playwright Python)  
⚠️ **Phase 4** - Test execution + evidence collection  
⚠️ **Coverage visualization** - Not implemented  
⚠️ **Better error handling** - Minimal validation  

## Expanding the System

### Add Phase 3 (Code Generation)
1. Create new tool in `agent.py`: `CodeGeneratorTool`
2. Add method `generate_code()` to `TestingAgent`
3. Add endpoint `/api/generate-code` to `app.py`
4. Add button to frontend

### Add Phase 4 (Verification)
1. Create `TestExecutorTool` that runs pytest
2. Capture screenshots/videos during execution
3. Generate HTML report
4. Display in UI

### Improve Token Counting
Wrap LLM calls with token counter:
```python
# In agent.py _init_model()
from functools import wraps

def count_tokens(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Count input/output tokens
        result = func(*args, **kwargs)
        # Log tokens
        return result
    return wrapper
```

## Architecture Notes

- **Separation of concerns**: Agent logic (agent.py) independent of API (app.py)
- **LLM agnostic**: Change provider in .env without code changes
- **Observable**: All metrics logged and exposed via API
- **Extensible**: Add new phases as tools without refactoring

## Troubleshooting

**"Model not found"**  
- Check MODEL_PROVIDER matches your setup
- Verify API keys are correct
- For Ollama, ensure model is pulled: `ollama list`

**"Browser launch failed / install issues"**  
- Ensure Playwright is installed: `playwright install chromium`
- If using a venv, run: `python -m playwright install chromium`
- On Windows, try PowerShell as Administrator if install fails

**"Slow response times"**  
- HuggingFace free tier is rate-limited
- Consider Ollama for faster local inference
- Use smaller models (llama3.2 vs llama3.3-70b)

## Timeline Estimate (2 Days)

**Day 1**
- [x] Core agent setup (4h)
- [x] FastAPI + UI (4h)

**Day 2**  
- [ ] Phase 3 implementation (4h)
- [ ] Phase 4 basic version (2h)
- [ ] Polish + demo prep (2h)
