# OpenClaw Architecture

## Overview

```
User -> Next.js Frontend -> /functions/invoke -> Express Backend -> FunctionRegistry -> PatchGenerator
                                                                                    -> InvocationEngine (in-memory)
                                                                                    -> Supabase (future)
```

## Components

### Frontend (Next.js)
- **ChatPanel**: Chat-like UI for invoking functions and viewing results
- **ProjectSidebar**: Workspace/project navigation
- **FunctionList**: Displays available functions from the registry
- **PatchViewer**: Renders generated patch output with syntax highlighting

### Backend (Express)
- **FunctionRegistry**: Maps function names to handlers; supports `invoke()` and `list()`
- **InvocationEngine**: In-memory store for invocation records (replace with Supabase in production)
- **PatchGenerator**: Generates `NSW_buy_nsw_refined.patch`, `.notes`, and `.qa.md` outputs

### Data Flow
1. User sends message via ChatPanel
2. Frontend POSTs to `/functions/invoke` with `{ functionName, inputs }`
3. Backend resolves function from registry, executes handler
4. InvocationEngine records the invocation
5. Response returns `{ invocationId, status, outputs }` to frontend
6. PatchViewer displays the generated patch

## Extension Points
- Replace in-memory InvocationEngine with Supabase persistence
- Add Supabase Auth middleware to backend routes
- Expand function registry with real automation handlers
- Add WebSocket support for long-running function execution
