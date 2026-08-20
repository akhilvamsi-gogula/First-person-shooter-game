# NEON BREACH

A browser-based 3D first-person arena shooter built with Three.js. Enter a neon training arena, track the rogue combatant, and clear the simulation before the clock expires.

## Play

Open the live game here after deployment:

- `https://<your-github-username>.github.io/<your-repository-name>/`

For local development, serve the project over HTTP because the game loads Three.js as an ES module:

```powershell
python -m http.server 5500
```

Then visit `http://localhost:5500`.

## Controls

| Input | Action |
| --- | --- |
| Arrow keys | Move around the arena |
| Mouse | Look and aim |
| Space | Fire |
| R | Reload |
| Escape | Release the mouse pointer |

Click the game canvas after entering the arena to capture the mouse for FPS-style camera control.

## Features

- WebGL 3D arena rendered with Three.js
- One computer-controlled opponent
- Mouse-look camera with pointer lock
- Solid arena walls and cover collision
- Center-screen raycast shooting
- Health, ammunition, score, timer, hit feedback, and win/lose states
- Responsive HUD for desktop and mobile screens

## Stack

- HTML5
- CSS3
- Vanilla JavaScript
- [Three.js](https://threejs.org/) loaded from jsDelivr
- Google Fonts: Barlow Condensed and Space Mono

## Project Structure

```text
.
├── index.html   # Game markup and HUD
├── styles.css   # Visual system and responsive layout
├── game.js      # Three.js scene, controls, collisions, AI, and combat
└── README.md
```

## GitHub Pages

This repository includes a GitHub Actions workflow in `.github/workflows/pages.yml`.

1. Push the project to GitHub.
2. In the repository settings, open **Pages**.
3. Set the source to **GitHub Actions**.
4. Push to `main` or run the workflow manually.

The workflow publishes the repository root as a static site. No build command or package installation is required.

## License

No license has been selected yet. Add a license before accepting outside contributions or redistributing the project.
