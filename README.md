# Movie Project

Small Node + TypeScript project that connects to MongoDB and exposes a GraphQL API for movies. The frontend is a small static SPA in `public/` that uses GraphQL to query and mutate data.

Run locally:

```powershell
npm install
npm run dev      # fast development with ts-node-dev
# or build & run
npm run build
npm start
```

Environment:
- Create a `.env` with `MONGO_URI` pointing to your MongoDB Atlas or local instance.

To publish on GitHub:
1. Create a new GitHub repo (via web UI or `gh repo create`).
2. Run the commands below to push your code:

```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
# replace URL with your new repo
git remote add origin https://github.com/<your-username>/<repo>.git
git push -u origin main
```

Notes:
- The project uses TypeScript and compiles to `dist/` for production.
- The frontend stays in `public/` as static files.
