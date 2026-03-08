# Replace Exercise Videos

This folder is a convenient place to store your own exercise video files (MP4) for the app.

## How to use your own videos

1. Add MP4 files to this folder, for example:
   - `pushups.mp4`
   - `squats.mp4`
   - `burpees.mp4`

2. Edit `index.html` and update the `data-video` attribute on each exercise card to point to the local file, for example:

```html
<div class="exercise-card" data-name="Push Ups" data-time="30" data-desc="..." data-video="videos/pushups.mp4">
```

3. Reload the app in your browser and the video will play automatically when the exercise is selected.
