# React Frontend

The frontend is a React 19 TypeScript SPA built with Vite and styled with Tailwind CSS 4 (dark theme). It uses TanStack React Query for server state and React Router for navigation.

## Routing

Routes are defined in [[frontend/src/App.tsx#App]]. All authenticated routes are wrapped in a ProtectedRoute component. Key pages:
- `/` — Dashboard with server overview, stats, and activity feed
- `/server/:id` — Tabbed server management (console, players, chat, metrics, scheduling, Discord)
- `/players` — Global player database with search and filtering
- `/players/:id` — Individual player history, bans, sessions
- `/ban-lists` — Global and per-server ban list management
- `/triggers` — Event-driven [[automation#Triggers]] configuration
- `/scheduler` — Cron-based [[automation#Scheduled Commands]]
- `/activity` — Audit log viewer

## API Client

HTTP communication uses Axios with Bearer token auth and automatic 401→login redirect. API modules in `frontend/src/api/` mirror backend routers. WebSocket is used for the live RCON console.

## Auth Context

[[frontend/src/contexts/AuthContext.tsx#AuthProvider]] manages authentication state, persisting the JWT token in localStorage. The context provides login, logout, and current user info to all components.

## Design System

Custom dark theme defined in `frontend/src/index.css` with CSS custom properties. Uses Plus Jakarta Sans for UI text and JetBrains Mono for console output. Lucide React for icons, Recharts for analytics charts.
