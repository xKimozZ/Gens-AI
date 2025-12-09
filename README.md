# Web-Based AI QA Agent Platform

## 🎯 Project Overview

This is a full end-to-end Web-Based AI QA Agent platform designed to assist QA Engineers with exploration, test design, implementation, and maintenance.

## 🏗️ Architecture Overview

### Three Major Components:

1. **Web Interface (Frontend + Dashboard)**
   - Chat interface between Human Tester and AI Agent
   - Live browser view controlled by agent
   - Metrics dashboard (response time, token usage, coverage)
   - Versioning with diff view (old/new)
   - Undo/Redo functionality
   - Coverage shading visualization
   - Self-healing notifications

2. **AI Agent (Backend Brain)**
   - Exploration Module
   - Collaborative Test Design Module
   - BDD Generation Module
   - Code Generation Module (Playwright + Python)
   - Verification & Evidence Collection Module
   - CI/CD Integration Module
   - Continuous Monitoring Module
   - Self-Healing Module
   - Extension Module

3. **Isolated Execution Environment**
   - Separate browser runner
   - Playwright headless/headful execution
   - RPC/WebSocket communication with agent

## 📁 Project Structure

```
/backend                 # FastAPI backend server
  /agent                 # AI Agent core logic
    /exploration         # Phase 1: Page exploration
    /test_design         # Phase 2: Test case design
    /bdd_generation      # Phase 3: Gherkin generation
    /code_generation     # Phase 4: Playwright code generation
    /verification        # Phase 5: Test verification
    /ci_integration      # Phase 6: Jenkins/CI pipeline
    /monitoring          # Phase 7: Continuous monitoring
    /maintenance         # Phase 8: Self-healing & extension
  /api                   # REST API endpoints
  /services              # Business logic services
  /models                # Data models
  /utils                 # Utility functions
  /llm                   # LLM integration (local/free-tier)

/browser_runner          # Isolated browser execution environment
  /executor              # Playwright test executor
  /rpc                   # RPC/WebSocket server
  /utils                 # Browser utilities

/frontend                # React + Tailwind frontend
  /src
    /components          # React components
    /pages               # Page components
    /services            # API clients
    /hooks               # Custom React hooks
    /store               # State management
    /utils               # Frontend utilities

/generated_tests         # Output directory for generated tests
  /pages                 # POM classes
  /features              # BDD feature files
  /tests                 # Pytest test files
  /reports               # Allure reports
  /screenshots           # Test evidence
  /videos                # Test recordings

/storage                 # Data persistence
  /knowledge_base        # Structured representations
  /visual_signatures     # Visual snapshots for healing
  /versions              # Version history
  /metrics               # Performance metrics

/config                  # Configuration files
/docs                    # Documentation
/tests                   # System tests
```

## 🚀 Technology Stack

- **Frontend**: React 18, Tailwind CSS, WebSocket client
- **Backend**: Python FastAPI
- **Browser Runner**: Playwright Python
- **Agent Brain**: Python modules with LangChain/LlamaIndex
- **Storage**: SQLite + File-based storage
- **LLM**: Local (Ollama/LM Studio) or Free-tier API
- **Observability**: Custom dashboard (MLFlow/LangFuse integration stub)

## 🔄 Workflow Phases

### Phase 1: Exploration & Knowledge Acquisition
- Agent explores URL and creates structured representation
- DOM parsing + screenshots
- Visual signature storage

### Phase 2: Collaborative Test Design
- Generate test case list
- Visual coverage map with shaded regions
- Interactive refinement

### Phase 3: BDD Scenario Generation
- Analyze existing feature files
- Reuse existing steps
- Generate clean Gherkin with minimal redundancy

### Phase 4: Implementation (Code Generation)
- Generate Playwright + Python code
- POM-based architecture
- Self-verification hooks

### Phase 5: Verification & Evidence Collection
- Execute tests
- Capture screenshots, logs, videos
- Generate detailed reports

### Phase 6: Pipeline Integration (CI/CD)
- Jenkins job creation
- Allure report integration
- Automated scheduling

### Phase 7: Continuous Monitoring & Insight
- Parse historical logs
- Analyze trends
- Email summarization

### Phase 8: Maintenance (Healing & Extension)
- **Self-Healing**: Detect locator changes, update POM automatically
- **Extension**: Detect new UI elements, update test suite

## 🛡️ Safety & Constraints

- **Guardrails**: Block irrelevant/malicious prompts
- **Free-tier only**: No paid LLM APIs
- **Isolation**: Browser runner completely separate from agent logic
- **Observability**: Track tokens, response time, coverage accuracy

## 📊 Key Features

- **Versioning**: Track changes in code, BDD, test cases
- **Diff View**: Visual comparison of old vs new versions
- **Undo/Redo**: Rollback changes
- **Bug-Finding Mode**: Autonomous exploratory testing
- **Manual Assistant Mode**: Perform repetitive tasks
- **Context Reset**: Clear agent memory
- **Parallel Agents**: Multi-agent concurrent execution

## 🏃 Getting Started

### Prerequisites
```bash
# Python 3.10+
python --version

# Node.js 18+
node --version

# Install Playwright
playwright install
```

### Setup
```bash
# Install backend dependencies
cd backend
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install

# Install browser runner dependencies
cd ../browser_runner
pip install -r requirements.txt
```

### Run
```bash
# Terminal 1: Start backend
cd backend
python main.py

# Terminal 2: Start browser runner
cd browser_runner
python main.py

# Terminal 3: Start frontend
cd frontend
npm start
```

## 📝 Current Status

**⚠️ SCAFFOLD PHASE**: All modules are currently stubs with TODO comments. Gradual implementation will follow.

## 🎓 Evaluation Criteria

1. **Accuracy & Truthfulness**: No hallucinated locators
2. **Code Defense**: Deep understanding required
3. **Architectural Integrity**: Proper isolation and POM
4. **Feature Completeness**: All 8 phases working
5. **Metrics & Observability**: Response time, tokens, coverage

## 📅 Deadline

Week 13

## 📄 License

Academic Project
