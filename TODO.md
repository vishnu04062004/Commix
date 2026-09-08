# Commix project status

## Working

- Responsive workspace UI with mobile navigation, chat composer, tool picker, conversation history, and login flow.
- FastAPI health, auth, demo login, refresh, chat, and conversation endpoints.
- Shared in-memory user/conversation storage for local development.
- Production frontend build and backend smoke tests passing.

## Before production

- Add formal migrations and a Postgres adapter for multi-instance production deployments.
- Set `GEMINI_API_KEY` on the server and verify the selected `GEMINI_MODEL` for the deployed account.
- Set a long random `JWT_SECRET_KEY`, update `CORS_ORIGINS` to the deployed frontend, and complete Google OAuth redirect configuration.
