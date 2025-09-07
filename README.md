# Digi

Digi is your little coding companion that lives inside a VS Code view.  
Keep Digi happy by writing code or giving it attention, and watch it grow over time!

## Features

- A virtual pet that hops around while you code.
- Digi has a **joy stat** that decreases slowly when the view is visible.
- Digi only loses joy when you can actually see them.
- Clicking on Digi shows a little heart and restores joy.
- While Digi is visible you gain **experience** and levels over time.
- Experience is gained faster when Digi is happy.
- As Digi levels up, each new level takes progressively longer to reach.
- When joy runs out, Digi may run away — so take good care of them!

## Requirements

No additional requirements — just install and enjoy your coding buddy.

## Extension Settings

This extension contributes the following settings to customize Digi’s appearance:

- `digi.joyColor`: Color of the joy bar when joy is high. (default: `#308530`)
- `digi.lowJoyColor`: Color of the joy bar when joy is medium. (default: `#baba41`)
- `digi.criticalJoyColor`: Color of the joy bar when joy is low. (default: `#c73e3e`)
- `digi.backgroundColor`: Background color of the canvas. (default: `#a7bbe1`)

Example in `settings.json`:

```json
"digi.joyColor": "#00ff00",
"digi.lowJoyColor": "#ffff00",
"digi.criticalJoyColor": "#ff0000",
"digi.backgroundColor": "#222222"
```
