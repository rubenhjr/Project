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

```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
# replace URL with your new repo
git remote add origin https://github.com/rubenhjr/Project.git
git push -u origin main
```

Notes:
- The project uses TypeScript and compiles to `dist/` for production.
- The frontend stays in `public/` as static files.

Render deployment
-----------------

You can deploy this project to Render using either the web dashboard or the `render.yaml` manifest included in the repo.

1) Create a new Web Service on Render (dashboard):
	- Select: "Connect a repository" and choose this repository.
	- Branch: `main`
	- Build command: `npm install && npm run build`
	- Start command: `npm start`
	- In the Environment section add the secret `MONGO_URI` with your MongoDB connection string.

2) Using `render.yaml` (optional):
	- Edit `render.yaml` to set `repo:` to your GitHub repo and `branch:` if you use a different branch.
	- In the Render dashboard, create a new service and choose to create from manifest; Render will pick up the settings.

3) Secrets and env vars
	- Never commit `.env` or secrets. On Render add `MONGO_URI` in the service's Environment -> Environment Variables (or Secrets) panel.

Notes on startup
  - The start script (`npm start`) runs `node dist/server.js`. Render will run the build step then start the app.
  - If you prefer container deploys you can add a Dockerfile and set Render to use the Docker option (I can add one on request).
