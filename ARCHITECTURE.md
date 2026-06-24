# OmniAssist AI — System Architecture & Data Flow

This document details the high-performance system architecture, data pipelines, security guardrails, and codebase structure of **OmniAssist AI**.

---

## 1. System Architecture Map

OmniAssist AI uses a full-stack, single-container, event-driven architecture that bundles client asset serving with server-side AI processing.

```
                  +----------------------------------+
                  |         Client Browser           |
                  |  (React 19, Tailwind CSS, Vite)  |
                  +-----------------+----------------+
                                    |
                                    |  HTTPS (Port 3000)
                                    v
                  +-----------------+----------------+
                  |        Express Server            |
                  |  (Unified Router, Port 3000)     |
                  +--------+----------------+--------+
                           |                |
             Internal APIs |                | AI Requests (Server-side)
                           v                v
                  +--------+-------+  +-----+----------------+
                  |  Thread-Safe   |  |   Google GenAI SDK   |
                  |   LocalDB      |  | (gemini-2.5-pro/     |
                  |  (db.json API) |  |  gemini-2.5-flash)   |
                  +----------------+  +----------------------+
```

---

## 2. Core Operational Pipelines

### A. The RAG Retrieval Pipeline (Retrieval-Augmented Generation)
1. **User Ingress:** A user submits a customer service query (e.g., *"What is your refund window?"*) via the support ChatView.
2. **Context Scanning:** The server scans the internal Knowledge Base database for records matching keywords from the user's query.
3. **Context Construction:** Matching content segments are collected, ranked, and wrapped inside XML structured tags (`<knowledge_context>`).
4. **Prompt Assembly:** The active prompt version instruction is retrieved, combined with the context documents, and passed securely to the Gemini SDK.
5. **AI Synthesis & Response:** The Gemini model generates a factual response. Citations are highlighted, and the complete payload is stored inside `db.json` and returned to the browser.

### B. Thread-Safe Atomic Storage Engine
To avoid file-system write conflicts and potential corruptions during concurrent modifications:
1. **Mutex Acquisition:** A task requests access to mutate state. The `AsyncLock` queue grants access sequentially.
2. **Atomic Serialization:** Changes are written to a temporary swap file (`db.json.tmp`).
3. **Kernel Rename:** The operating system’s native kernel swap operation (`fs.rename`) overwrites `db.json` instantaneously, guaranteeing that reads are never performed on half-written states.
4. **Debounced Disk Flushing:** High-frequency consecutive updates are consolidated in memory, triggering a write once the channel quietens.

---

## 3. Server API Reference

### Auth & User endpoints
- `POST /api/auth/login`: Authenticates administrator or agent credentials using timing-safe cryptographic comparisons.
- `GET /api/auth/me`: Retrieves current session contexts securely.

### Chat & Support Conversations
- `GET /api/conversations`: Lists conversations ordered by activity.
- `POST /api/conversations`: Spawns a new customer chat channel.
- `GET /api/conversations/:id/messages`: Pulls historical conversation messages.
- `POST /api/conversations/:id/messages`: Dispatches message events, triggers context-fetching, and queries Gemini.
- `POST /api/conversations/:id/feedback`: Records Customer Satisfaction (CSAT) scores.

### Tickets Management
- `GET /api/tickets`: Lists support tickets in the dashboard.
- `POST /api/tickets/:id/resolve`: Moves tickets from active/escalated to resolved states.

### Prompt Controls
- `GET /api/prompts`: Returns prompt versions.
- `POST /api/prompts`: Deploys new system prompt versions with version control tracking.
- `POST /api/prompts/:id/activate`: Switches the active prompt version globally.

---

## 4. Key Deployment Specifications

- **Container Port Bindings:** Configured to run on port `3000` mapping exclusively on interface host `0.0.0.0` for container ingress.
- **Node Type Engine:** Configured to compile and build CJS modules with absolute path resolution via `@tailwindcss/vite` and `esbuild` configurations.
- **Client Bundling Output:** Automatically compiled into `dist/` containing optimized, tree-shaken React assets served using Express static file serving.
