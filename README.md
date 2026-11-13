# ARC RUNNER

A 3D endless runner set on an Arc-blue futuristic railway. Dash through three lanes, dodge trains and barriers, slide under gates, and collect floating USDC-style coins. Original mascot, world, and branding.

Built with [Arc Studio](https://studio.arc.io)

## Features

- Three-lane running with smooth lane switching, jump, and slide
- Moving trains, low barriers, overhead gates, and cargo crates
- Difficulty and speed that ramp up the longer you survive
- Live score, distance, coin counter, and a saved high score
- Pause, restart, sound toggle, and a 3-2-1 countdown on resume
- Keyboard controls on desktop, swipe controls on touch screens
- A human-style 3D runner in Arc streetwear with natural run, jump, slide and turn animations
- Detailed glass-and-stone city with street lights, trees, billboards and overhead rail lines
- Glossy blue, silver and red trains, hazard barriers, overhead gates and cargo containers
- Premium 3D USDC coins with a fly-up collection animation
- Game Over scorecard with the same runner shown beside the score inside the card: shocked, then sighing, facepalming and shrugging on a loop
- Compact control hints docked on the right side of the screen
- Real-time shadows and automatic quality scaling to keep play smooth on mobile and desktop

## Controls

- Arrow keys or A / D: change lane
- Arrow up or W: jump
- Arrow down or S: slide (in the air, drops you faster)
- P or Esc: pause. R: restart. Space or Enter: start
- Touch: swipe left, right, up, or down

## Tech stack

React, TypeScript, Vite, Tailwind CSS, three.js, framer-motion.

## Development

Prerequisites: [Bun](https://bun.sh).

```bash
bun install
bun run dev      # start the dev server
bun run build    # production build
bun run check    # lint and typecheck
```

### Environment variables

None.

## Arc logo on the jacket

The runner's jacket back shows the Arc logo from `public/arc-logo.png` (PNG with a transparent background works best). The image is used as-is and scaled to fit; until the file exists the jacket back stays plain.
