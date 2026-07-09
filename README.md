# Takora Mart Frontend - Final

## Local Setup

```bash
cp .env.local.example .env
pnpm install --no-frozen-lockfile
pnpm run dev
```

Local `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

## Vercel Environment Variable

```env
VITE_API_URL=https://mart-task.onrender.com/api
```

## Vercel Build Settings

```txt
Install Command: pnpm install --no-frozen-lockfile
Build Command: pnpm run build
Output Directory: dist
```

`vercel.json` is included to fix refresh/reload route 404.
# task_takora
