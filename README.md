# Layr

<div align="center">

![Svelte](https://img.shields.io/badge/Svelte_5-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white)

A high-performance, professional Bento Grid layout builder for modern web interfaces. Design, preview, and export responsive grid systems with a seamless desktop-first workflow.

**[Launch Playground](/playground)**

</div>

---

## Features

### 📐 **Grid Engineering**
- **Dynamic Bento System**: Create complex, nested-style layouts with snap-to-grid precision.
- **Micro-interactions**: Fluid hover scales, dynamic border radii based on cell area, and glassmorphic aesthetics.
- **Fusion Logic**: Seamlessly union contiguous cells into combined shapes using advanced `clip-path` math.

### 📱 **Responsive Designer**
- **Multi-Breakpoint Editing**: Direct, interactive editing for Desktop, Tablet, and Mobile views.
- **Smart Compaction**: Automatic layout rearrangement for smaller screens while preserving design intent.
- **Device Framing**: Realistic viewport previews to ensure visual consistency across all form factors.

### ⚡ **Professional Workflow**
- **Spatial Undo/Redo**: Full history tracking (Cmd+Z) for up to 50 actions.
- **Keyboard Shortcuts**: Rapid shortcuts for Union (U), Delete, and Multi-select (Shift+Click).
- **Infinite Canvas**: Pan and Zoom with familiar creative tool controls (Space+Drag, Ctrl+Scroll).

### 📤 **Code Generation**
- **Instant Export**: Generate clean, production-ready Svelte components with Tailwind CSS.
- **Template Gallery**: Start with professional presets ranging from Portfolio heroes to Dashboard layouts.
- **One-Click Deploy**: Copy serialized grid data for use in the Layr CLI.

## Tech Stack

### Frontend & Logic

<div>

![Svelte](https://img.shields.io/badge/Svelte_5-FF3E00?style=flat-square&logo=svelte&logoColor=white)
![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=flat-square&logo=svelte&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)

</div>

- **Framework**: Svelte 5 (Runes) + SvelteKit
- **Styling**: Tailwind CSS 3.4 (Strict Monochrome System)
- **3D Engine**: Threlte (Three.js for Svelte)
- **State Management**: Svelte Runes based Snapshot Store
- **Build Tool**: Vite 7

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Layr.git
   cd Layr
   ```

2. **Install dependencies**
   ```bash
   bun i
   ```

3. **Start Development Server**
   ```bash
   bun run dev
   ```

## Architecture

```
┌─────────────────────────────────────┐
│     Bento Designer (Svelte 5)       │
│  - BentoStore (Runes-based State)   │
│  - Composables (Pan, Drag, Resize)  │
│  - SelectionStore (Multi-select)    │
└──────────────┬──────────────────────┘
               │ Reactive Updates
┌──────────────▼──────────────────────┐
│     Grid Engine (SVG + CSS)         │
│  - ClipPath Generator (Fusion)      │
│  - Breakpoint Manager               │
│  - Serialization Logic              │
└──────────────┬──────────────────────┘
               │
        ┌──────▼──────┐
        │ LocalStorage│
        └─────────────┘
```

## Responsive Matrix

Layr handles layout overrides across three primary breakpoints:

| Viewport | Columns | Behavior |
|----------|---------|----------|
| Desktop  | 18      | Full free-form editing and fusion |
| Tablet   | 2       | Automatic span-to-grid |
| Mobile   | 1       | Single column vertical stacking |

## Shortcut Cheat Sheet

| Action | Shortcut |
|--------|----------|
| Undo | `Cmd + Z` |
| Redo | `Cmd + Shift + Z` |
| Union Cells | `U` |
| Delete Cell | `Delete` |
| Pan Canvas | `Space + Drag` |
| Zoom | `Ctrl + Scroll` |

---

<div align="center">

**Engineered for architects of the modern web**

[Report Bug](https://github.com/yourusername/Layr/issues) • [Request Feature](https://github.com/yourusername/Layr/issues)

</div>
