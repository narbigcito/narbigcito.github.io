# AGENTS.md — narbigcito.github.io

Personal portfolio website for Gibrán Moreno. Single-file static site deployed to GitHub Pages.

## Architecture

- **Single file**: Everything lives in `index.html` (~92KB, ~1600 lines)
- **No build process**: Pure HTML/CSS/JS, no bundlers, no dependencies, no `package.json`
- **No external assets**: Fonts via Google Fonts CDN; everything else embedded as data URIs
- **Static deployment**: GitHub Pages serves directly from repo root on push to `main`

## Key Technical Details

- **WebGL background**: Custom GLSL fragment shader on `#tideCanvas` with mouse interaction
- **Custom cursor**: `#cursor` element replaces default; hides on touch (`(hover: none)`)
- **Interactive elements**:
  - "Wall" section: 11-click brick destruction with particle effects
  - Belief cards: click reactions with counters
  - Project modals: inline overlays for LOGOS, MAGI, WHELLE, La Sombra de la Rana
  - Konami code easter egg (↑↑↓↓←→←→BA)
- **Mobile-first**: Breakpoints at 700px, 640px, 520px, 400px

## Content Sections

Hero → Quién Soy (wall) → Lo Que Creo (cards) → Proyectos → Conversaciones → Conectar → Footer

## Development Notes

- **Language**: Spanish content
- **Styling**: CSS custom properties `--c1` (pink) through `--c6` (green)
- **Fonts**: VT323 (monospace), Space Grotesk (body), Syne/Syne Mono (display)
- **Touch handling**: `touch-action: manipulation`; `touchend` prevents default to avoid double-firing

## Deployment

Push to `main` → auto-deploys to https://narbigcito.github.io

No CI/CD config, no tests, no linting.
