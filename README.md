# Scientific Journal Publication Trend Tracking System FE

React, TypeScript, and Vite frontend using MUI, Motion, and Heroicons.

## Local development

```sh
npm install
npm run dev
```

The frontend reads configuration from `.env.local`. Copy `.env.example` to `.env.local`; its local Worker default points to `http://127.0.0.1:8787` when `sjs-api` is running with Wrangler. For another environment, set `VITE_WORKER_API_URL` to that environment's Worker base URL. Start the Worker in its `sjs-api` directory with `npm run dev`.

In development, the frontend connects to the Firebase Auth Emulator at `127.0.0.1:9099` and Firestore Emulator at `127.0.0.1:8080` by default. Both emulators must be running. The frontend signs into the Auth Emulator with a local development account and stores projects directly in `users/{uid}/projects/{projectId}`. Set the optional emulator and development-account variables in `.env.local` to override the defaults. Set `VITE_USE_FIREBASE_EMULATOR=false` only when using a configured Firebase web app instead.

## Checks

```sh
npm run lint
npm run build
```

## Current UI prototype

- **Overview** searches Authors, Works, and Institutions through the Worker's shared search route and loads country/institution filters from the Worker.
- **Project > Create Project** loads subject areas and keyword suggestions from the Worker, then saves project metadata to the signed-in user's Firestore collection. Only project name, subject area, selected keywords, status, and timestamps are stored; scholarly records remain in the Worker/provider flow.
- Public research reads use OpenAlex through the Worker. Provider credentials stay in the Worker environment.

The application uses a light `#fbfbfb` workspace, white panels, and a compact nested sidebar. The main dashboard layouts are designed to fit a desktop viewport; narrower screens use a responsive, scrollable layout.
