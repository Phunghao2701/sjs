# Scientific Journal Publication Trend Tracking System FE

React, TypeScript, and Vite frontend using MUI, Motion, and Heroicons.

## Local development

```sh
npm install
npm run dev
```

The frontend reads `VITE_WORKER_API_URL` from `.env.local`. The checked-in `.env.example` lists the required variable; the local file points to `http://127.0.0.1:8787` for `sjs-api` running with Wrangler. Start the Worker in its `sjs-api` directory with `npm run dev`.

## Checks

```sh
npm run lint
npm run build
```

## Current UI prototype

- **Overview** searches Authors, Works, and Institutions through the Worker's shared search route and loads country/institution filters from the Worker.
- **Project > Create Project** loads subject areas and keyword suggestions from the Worker. Project creation itself remains local demo state because this frontend has no sign-in or Firestore setup yet.
- Public research reads use OpenAlex through the Worker. Provider credentials stay in the Worker environment.

The application uses a light `#fbfbfb` workspace, white panels, and a compact nested sidebar. The main dashboard layouts are designed to fit a desktop viewport; narrower screens use a responsive, scrollable layout.
