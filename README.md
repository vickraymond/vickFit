# FitVick

A small web workout timer and log. This project is built as a Progressive Web App (PWA) so you can install it on mobile devices and package it as an APK using tools like [PWABuilder](https://www.pwabuilder.com/) or [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap).

## How to Run Locally

> Tip: The app includes an **“Install App”** button in the header (when viewed in Chrome/Edge) so you can install it as a native-like app on your device.

1. Open a terminal in this folder.
2. Start a simple local web server (Python example):

```bash
python -m http.server 8000
```

3. Open http://localhost:8000 in your browser.

> Tip: For best install (APK) results, make sure the app is served over HTTPS (e.g., deploy to GitHub Pages, Vercel, Netlify, or another HTTPS host).

> Tip: For a richer install experience, add a proper PNG icon set (192x192 and 512x512) and update `manifest.json` icons. PWABuilder will prompt you if it needs an icon.
>
> There is also an **"Get APK"** button in the app header that opens PWABuilder with your site URL.

## Deploy to GitHub Pages

1. Create a GitHub repository and push this project to `main`.
2. Make sure the repository is public (or use a GitHub Pages plan that supports private pages).
3. The workflow in `.github/workflows/gh-pages.yml` will auto-deploy on every push to `main`.

Once the workflow succeeds, your site will be available at:

```
https://<your-username>.github.io/<repo-name>/
```

Then use that URL in PWABuilder to generate an APK.

## How to Install on Android (APK)

1. Open https://www.pwabuilder.com/ and enter your local site URL (or deploy the site somewhere public).
2. Follow the steps to generate an APK. PWABuilder will use the `manifest.json` and `sw.js` provided in this repo.

Alternatively, you can use Bubblewrap (requires Node.js and Java):

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://your-site.com/manifest.json
bubblewrap build
```

## Features Added

- Workout log persists between sessions using `localStorage`
- Clear history button
- Circuit mode: automatically cycle through exercises with rest timers (like a real workout circuit)
- Video demo for each exercise (plays while you workout)
- Sound + vibration when timers complete
- Offline support via Service Worker (`sw.js`)
- PWA manifest (`manifest.json`) to enable install prompts
- Responsive layout for mobile screens

## Using Your Own Exercise Videos

If you want real workout videos instead of the demo clips, put your MP4 files into `videos/` and update the `data-video` attribute for each exercise card in `index.html`.

For example:

```html
<div class="exercise-card" data-name="Push Ups" data-time="30" data-desc="..." data-video="videos/pushups.mp4">
```

---

Enjoy your workouts! 💪
