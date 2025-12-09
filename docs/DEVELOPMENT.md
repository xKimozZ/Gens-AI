# Development Guide

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Playwright browsers installed

### Initial Setup

1. **Clone/Initialize Repository**
   ```bash
   cd Project
   ```

2. **Setup Backend**
   ```bash
   cd backend
   python -m venv venv
   # Windows
   .\venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   
   pip install -r requirements.txt
   
   # Copy environment variables
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Setup Browser Runner**
   ```bash
   cd ../browser_runner
   python -m venv venv
   .\venv\Scripts\activate  # or source venv/bin/activate
   
   pip install -r requirements.txt
   playwright install chromium
   
   cp .env.example .env
   ```

4. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   ```

5. **Setup Local LLM (Ollama)**
   - Download Ollama from https://ollama.ai
   - Pull a model: `ollama pull llama2`
   - Verify: `ollama list`

### Running the Platform

**Terminal 1 - Backend**
```bash
cd backend
python main.py
```

**Terminal 2 - Browser Runner**
```bash
cd browser_runner
python main.py
```

**Terminal 3 - Frontend**
```bash
cd frontend
npm run dev
```

Access the platform at: http://localhost:5173

## Development Workflow

### Adding a New Feature

1. **Identify the Phase**: Determine which phase (1-8) the feature belongs to
2. **Update the Module**: Add functionality to the appropriate module
3. **Add API Endpoint**: Create/update API route in `backend/api/routes/`
4. **Update Frontend**: Add UI components if needed
5. **Test**: Write tests and verify functionality
6. **Document**: Update docs with new feature

### Code Structure Guidelines

**Backend**
- Each phase module should be self-contained
- Use dataclasses for data structures
- Add comprehensive TODO comments
- Use type hints
- Follow PEP 8

**Frontend**
- Each page should be a separate component
- Use functional components with hooks
- Add TODO comments for pending features
- Use Tailwind for styling

### Testing

**Backend Tests**
```bash
cd backend
pytest tests/
```

**Frontend Tests**
```bash
cd frontend
npm test
```

**Generated Tests**
```bash
cd generated_tests
pytest tests/
```

## Module Implementation Order

Recommended order for filling in the scaffolded code:

1. **Foundation**
   - WebSocket connections (frontend & browser runner)
   - LLM client integration
   - Storage layer

2. **Phase 1: Exploration**
   - Browser runner commands
   - DOM parsing
   - Screenshot capture
   - Structured representation storage

3. **Phase 2: Test Design**
   - Test case generation with LLM
   - Coverage computation
   - Visualization

4. **Phase 3: BDD Generation**
   - Gherkin parser
   - Step library
   - Step matching
   - Feature file generation

5. **Phase 4: Code Generation**
   - POM generation
   - Test code generation
   - Locator optimization

6. **Phase 5: Verification**
   - Test execution via browser runner
   - Evidence collection
   - Report generation

7. **Phase 6: CI/CD Integration**
   - Jenkins client
   - Job creation
   - Allure integration

8. **Phase 7: Monitoring**
   - Log parsing
   - Trend analysis
   - Email summaries

9. **Phase 8: Maintenance**
   - Self-healing engine
   - Extension detector
   - POM updater

## Debugging

### Backend Debugging
- Logs: `backend/logs/backend.log`
- Enable debug mode in `.env`: `DEBUG=true`
- Use `logger.debug()` for detailed logging

### Browser Runner Debugging
- Set `HEADLESS=false` to see browser
- Enable tracing: `ENABLE_TRACING=true`
- Check WebSocket connection in browser console

### Frontend Debugging
- React DevTools browser extension
- Check console for errors
- Check Network tab for API calls

## Common Issues

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <pid> /F

# Linux/Mac
lsof -i :8000
kill -9 <pid>
```

### Playwright Browser Not Found
```bash
playwright install chromium
```

### LLM Connection Failed
- Verify Ollama is running: `ollama list`
- Check `LLM_API_URL` in `.env`

## Contributing

1. Work on TODO items in order of priority
2. Test thoroughly before marking as complete
3. Update documentation
4. Add comments explaining complex logic
5. Use meaningful commit messages

## Next Steps

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for detailed implementation roadmap.
