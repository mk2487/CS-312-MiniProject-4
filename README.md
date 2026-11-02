# Mini-Project 4 — React Blog

Project 4 builds on the original CS312 EJS blog and retains its header, post form, categories, post cards, and responsive gray styling. Project 1 did not include sign-in or sign-up pages; those pages are new and use the same form layout.

## Run

Install Node.js 24 or newer, then run:

```
npm ci
npm run build
npm start
```

Open http://localhost:8000. For frontend development, leave the backend running and run `npm run dev` in another terminal; Vite forwards `/api` requests to port 8000. The production build is served by Express, so frontend and backend share one origin.

## Components

`Signin.jsx`, `Signup.jsx`, `BlogPostForm.jsx`, `PostList.jsx`, and `MyProfile.jsx` handle authentication, controlled post forms, listing and ownership actions, and the optional profile section. The app fetches JSON and updates React state after successful changes, without reloading the page.

## Backend

`GET /api/me`, `POST /api/auth/signup`, `POST /api/auth/signin`, and `POST /api/auth/signout` handle accounts and sessions. `GET /api/blogs`, `POST /api/blogs`, `PUT /api/blogs/:id`, and `DELETE /api/blogs/:id` handle posts. The server checks ownership for updates and deletes, regardless of which buttons are visible.

SQLite creates `data/blog.sqlite` automatically. Users, sessions and posts survive restarts. Passwords use salted scrypt hashes; sessions use HttpOnly cookies. Keep the database private and back it up. Use persistent storage and HTTPS when deploying; an ephemeral hosting disk will lose data when replaced. Existing in-memory Project 1 posts cannot be recovered after that server restarts.

## Checks

Run `npm test` for API tests covering authentication, validation, ownership, CRUD, and database persistence. Run `npm run build` to check the React build.

