# Commix

Commix is an AI workspace for conversations, planning, and lightweight workflows. It has a React/Vite frontend and a FastAPI backend with Google OAuth, JWT sessions, SQLite persistence, and Gemini-powered chat.

## Stack

- Frontend: React 19, TypeScript, Vite, React Router, Lucide icons
- Backend: FastAPI, Uvicorn, Pydantic, Authlib, JWT
- Persistence: SQLite (`backend/commix.db` by default)
- AI provider: Google Gemini Generative Language API
- Authentication: Google OAuth in configured environments, plus a local demo login

## Requirements

- Node.js 18 or newer
- Python 3.10 or newer
- A Google OAuth web application for Google sign-in
- A Gemini API key for real AI responses

## Project structure

```text
Commix/
├── backend/
│   ├── auth/              # OAuth, JWT, and authentication dependencies
│   ├── routes/            # Auth, chat, and conversation endpoints
│   ├── services/          # SQLite database and user service
│   ├── main.py            # FastAPI application entry point
│   └── requirements.txt
├── frontend/
│   ├── components/        # Login, sidebar, settings, and UI components
│   ├── services/          # Auth, chat, and conversation API clients
│   ├── App.tsx
│   └── package.json
├── .env
└── README.md
```

## Configuration

Create a `.env` file in the project root. Do not commit it or expose its secrets.

```env
HOST=0.0.0.0
PORT=8000

# Use a long, random value outside local development.
JWT_SECRET_KEY=replace-with-a-long-random-secret

# Google OAuth web application credentials.
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/callback

# Comma-separated frontend origins allowed to call the API.
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# SQLite location. Relative paths are resolved from the project root.
DATABASE_PATH=backend/commix.db

# Gemini configuration.
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.6-flash
```

For a deployed frontend, replace the local values in `CORS_ORIGINS` and `GOOGLE_REDIRECT_URI` with the exact deployed URLs. Keep the backend callback URL registered in Google Cloud Console.

The frontend uses `http://localhost:8000` by default. To point it at another backend, create `frontend/.env` with:

```env
VITE_API_URL=https://api.example.com
```

## Google OAuth setup

1. Open Google Cloud Console and create or select a project.
2. Configure the OAuth consent screen and set the application name to `Commix`.
3. Create an OAuth client of type **Web application**.
4. Add this local authorized redirect URI:

   ```text
   http://localhost:8000/auth/callback
   ```

5. Copy the client ID and client secret into `.env`.
6. Add test users while the consent screen is in testing mode.

If the Google credentials are absent, `/auth/login` redirects to the local demo login flow instead.

## Run locally

Open two terminals from the project root.

### Backend

```bash
python -m venv .venv

# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# macOS/Linux
# source .venv/bin/activate

pip install -r backend/requirements.txt
cd backend
python main.py
```

The API runs at `http://localhost:8000`. Check it with:

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{"status":"healthy","service":"commix-api"}
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:3000`.

For a production build:

```bash
npm run build
npm run preview
```

## Authentication and local demo mode

The application stores access and refresh tokens in browser local storage. Protected chat and conversation requests send the access token as a Bearer token. Expired access tokens are refreshed using the refresh token when possible.

To preview the application without Google OAuth, open:

```text
http://localhost:3000/login?demo=1
```

The demo button calls `POST /auth/dev-login` and creates a real persisted local user in SQLite. Sign out from the profile menu to clear the local session.

## API overview

### Public endpoints

- `GET /health` — service health check
- `GET /auth/login` — start Google OAuth
- `GET /auth/callback` — complete Google OAuth
- `POST /auth/dev-login` — create a local development session
- `POST /auth/refresh` — refresh a JWT session

### Authenticated endpoints

Send `Authorization: Bearer <access_token>` with these requests:

- `GET /auth/me` — current user
- `POST /auth/logout` — end the client session
- `POST /chat` — generate a Gemini response and persist the messages
- `GET /api/conversations` — list the signed-in user’s conversations
- `POST /api/conversations` — create a conversation
- `GET /api/conversations/{id}` — retrieve one owned conversation
- `GET /api/conversations/{id}/messages` — retrieve conversation messages
- `PATCH /api/conversations/{id}` — rename a conversation
- `POST /api/conversations/{id}/archive` — archive a conversation
- `DELETE /api/conversations/{id}` — delete a conversation

Conversation ownership is enforced from the authenticated token; a request cannot read or modify another user’s conversations.

## Troubleshooting

### `Cannot find package 'react-refresh'`

Install frontend dependencies again from the frontend directory:

```bash
cd frontend
npm install
npm run dev
```

### OAuth returns 404 or 500

Confirm that:

- the backend is running on port `8000`;
- `GOOGLE_REDIRECT_URI` is `http://localhost:8000/auth/callback` locally;
- the same callback URI is registered in Google Cloud Console;
- the frontend is opened at `http://localhost:3000`;
- `SessionMiddleware` can use the configured `JWT_SECRET_KEY`.

### `Not authenticated` or `You cannot use another user's account`

Sign out, clear the old browser session, and sign in again. The current API identifies the user from the Bearer token and ignores a stale or mismatched client `user_id` for chat requests.

### Chat returns `503` or `502`

Check that `GEMINI_API_KEY` is present and valid, that `GEMINI_MODEL` names an available Gemini model, and that the backend can reach Google’s API.

### CORS errors

Add the exact frontend origin, including protocol and port, to `CORS_ORIGINS`, then restart the backend. Do not use `*` together with credentials.

## Data and security notes

- `backend/commix.db` is created automatically on startup and is ignored by Git.
- Keep `.env`, OAuth secrets, JWT secrets, and Gemini keys private.
- Use HTTPS, secure cookies/session settings, a strong JWT secret, and a managed database before production deployment.
- Restrict `CORS_ORIGINS` to the real deployed frontend URL in production.
