# Split Deployment: Render Backend + Cloudflare Frontend

This project is ready to deploy with the Express API on Render and the React/Vite app on Cloudflare Pages.

## Backend: Render

Create a new Render Web Service from the repository.

- Root directory: leave empty
- Runtime: Node
- Build command: `npm ci --prefix backend`
- Start command: `npm --prefix backend start`
- Health check path: `/api/health`

Environment variables:

```env
NODE_VERSION=22
JWT_SECRET=<generate-a-strong-secret>
CORS_ORIGINS=https://your-cloudflare-pages-domain.pages.dev
ADMIN_EMAIL=admin@trucksup.local
ADMIN_PASSWORD=<set-admin-password>
DRIVER_EMAIL=driver@trucksup.local
DRIVER_PASSWORD=<set-driver-password>
```

After Render deploys, note the backend URL:

```text
https://your-render-backend.onrender.com
```

## Frontend: Cloudflare Pages

Create a Cloudflare Pages project from the same repository.

- Root directory: `frontend`
- Framework preset: Vite
- Build command: `npm ci && npm run build`
- Build output directory: `dist`

Environment variables:

```env
NODE_VERSION=22
VITE_API_URL=https://your-render-backend.onrender.com/api
VITE_SOCKET_URL=https://your-render-backend.onrender.com
```

Cloudflare Pages will copy `public/_redirects` into the build so React routes work after refresh.

## Final Wiring

After Cloudflare gives you the frontend URL, update Render:

```env
CORS_ORIGINS=https://your-cloudflare-pages-domain.pages.dev
```

If you add a custom domain later, include both domains separated by commas:

```env
CORS_ORIGINS=https://your-cloudflare-pages-domain.pages.dev,https://yourdomain.com
```

## Notes

- The backend stores SQLite data at `backend/data/trucks-up.sqlite`.
- Render free instances have ephemeral filesystems. For long-term production data, move the database to a managed service or attach persistent storage where available.
- The backend can still serve `frontend/dist` for single-service deployments, but split deployment does not require building the frontend on Render.
