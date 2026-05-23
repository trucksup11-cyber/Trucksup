# Trucks Up

Local end-to-end fleet management app with:

- React + Vite frontend
- Express backend
- SQLite local database stored at `backend/data/trucks-up.sqlite`

## Local Run

1. Start the backend:
   `npm run dev:backend`
2. Start the frontend in another terminal:
   `npm run dev:frontend`
3. Open:
   `http://localhost:5173`

If port `5000` is already in use on your machine:

1. Create `backend/.env` and set `PORT=5050`
2. Create `frontend/.env` and set:
   `VITE_API_PROXY_TARGET=http://localhost:5050`
   `VITE_API_URL=/api`

## Seeded Accounts

- Admin: `admin@trucksup.local` / `admin123`
- Driver: `driver@trucksup.local` / `driver123`

## Notes

- Backend API runs on `http://localhost:5000`
- Frontend uses the Vite proxy, so local browser requests go through `/api`
- You can override defaults with `backend/.env`

## Deployment

For the current split deployment setup:

- Backend: Render Web Service
- Frontend: Cloudflare Pages

See `docs/DEPLOYMENT.md` for exact build commands and environment variables.
