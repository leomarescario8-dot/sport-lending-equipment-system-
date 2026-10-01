# Sport Lending Equipment System

React (Vite) + Node/Express + Supabase.

## DSA used
| Data Structure | Where |
|---|---|
| Hash Table | O(1) equipment lookup by id (get one, join loans/waitlist to names) |
| Queue (linked list) | Waitlist, FIFO auto-assign on return |
| Stack | Undo last add / update / delete |
| Trie | Search autocomplete |

| Algorithm | Where |
|---|---|
| Merge Sort | Default sorting of equipment / loans |
| Quick Sort | Optional sorting (dropdown) |
| Binary Search | Exact name lookup (on merge-sorted list) |
| Linear Search | Keyword search across fields |

## Setup
1. Supabase: New project -> SQL Editor -> paste and run `schema.sql`.
   Settings -> API: copy Project URL and the `service_role` key (server only, never in the client).
2. Server: `cd server && cp .env.example .env` (fill it) `&& npm install && npm test && npm run dev`
3. Client: `cd client && cp .env.example .env && npm install && npm run dev` -> http://localhost:5173

## Deploy
- Backend on Render (Web Service): Root Directory `server`, Build `npm install`, Start `npm start`.
  Env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, CLIENT_URL (your Vercel URL).
- Frontend on Vercel: Root Directory `client`, Framework Vite.
  Env var: VITE_API_URL = your Render URL (no trailing slash).
 Deployed on Vercel and Render
https://sport-lending-equipment-system.vercel.app
