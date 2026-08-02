# Literature Stock Web App — MVP Prototype

A responsive multi-congregation literature inventory prototype. It currently runs without a backend and stores demo changes in the browser using `localStorage`.

## Included

- Multi-congregation selector
- Dashboard and submission status
- Literature categories
- July 2026 opening quantities
- Stock quantity entry and verification
- Expected-versus-physical differences
- Review and submit flow
- Reports and CSV export
- Congregation, publication and user administration screens
- Initial Supabase database schema

## Run locally

No installation is required.

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Deploy to Vercel

Import this folder or its GitHub repository into Vercel. Because it is a static app, no build command is required and the output directory is the project root.

## Next implementation step

1. Create a Supabase project.
2. Run `supabase-schema.sql` in the Supabase SQL editor.
3. Add Supabase Authentication.
4. Replace the browser data functions in `app.js` with Supabase queries.
5. Add role-based Row Level Security policies.

## Current limitation

This is a working front-end MVP. Data is saved only in the current browser until Supabase is connected.
