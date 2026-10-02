# Biproxx - YouTube-style Clone

A frontend-only YouTube-inspired video platform built with HTML, CSS and JavaScript.

## Features
- YouTube-style responsive interface
- Local creator account and settings
- Upload videos from your computer
- Uploaded videos appear on Home and Channel
- Video player page
- Like / dislike
- Watch history
- Watch Later
- Search
- Categories
- Subscriptions UI
- Playlists / Library
- Dark mode
- Data persistence with localStorage

## Run
Open `index.html` with VS Code Live Server.

## Important
This is a portfolio/demo application. It stores data in the browser using localStorage, so it is not a real multi-user backend and large videos may exceed browser storage limits.

For production, replace localStorage with a backend/database and object storage such as S3 or Cloudinary, plus authentication.


## Upload fix
The upload system uses IndexedDB for video/image blobs instead of localStorage. This avoids the browser's small localStorage quota and lets normal MP4/WebM files be stored locally for this demo.
