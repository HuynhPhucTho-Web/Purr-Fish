---
name: Cozy Kawaii Pastoral UI
colors:
  surface: '#fff8f7'
  surface-dim: '#e8d6d4'
  surface-bright: '#fff8f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff0ef'
  surface-container: '#fdeae8'
  surface-container-high: '#f7e4e2'
  surface-container-highest: '#f1dedc'
  on-surface: '#231918'
  on-surface-variant: '#57423e'
  inverse-surface: '#392e2d'
  inverse-on-surface: '#ffedeb'
  outline: '#8b716d'
  outline-variant: '#dec0ba'
  surface-tint: '#a53b29'
  primary: '#a53b29'
  on-primary: '#ffffff'
  primary-container: '#ff7e67'
  on-primary-container: '#731709'
  inverse-primary: '#ffb4a6'
  secondary: '#136b4b'
  on-secondary: '#ffffff'
  secondary-container: '#a0f0c7'
  on-secondary-container: '#1a704f'
  tertiary: '#7c5800'
  on-tertiary: '#ffffff'
  tertiary-container: '#ca9d45'
  on-tertiary-container: '#4e3600'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad4'
  primary-fixed-dim: '#ffb4a6'
  on-primary-fixed: '#3f0300'
  on-primary-fixed-variant: '#842415'
  secondary-fixed: '#a2f3ca'
  secondary-fixed-dim: '#87d7af'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005237'
  tertiary-fixed: '#ffdea7'
  tertiary-fixed-dim: '#f0bf63'
  on-tertiary-fixed: '#271900'
  on-tertiary-fixed-variant: '#5e4200'
  background: '#fff8f7'
  on-background: '#231918'
  surface-variant: '#f1dedc'
typography:
  headline-xl:
    fontFamily: Quicksand
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-xl-mobile:
    fontFamily: Quicksand
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg:
    fontFamily: Quicksand
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Quicksand
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  headline-sm:
    fontFamily: Quicksand
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Quicksand
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Quicksand
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  body-sm:
    fontFamily: Quicksand
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-lg:
    fontFamily: Quicksand
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
  label-md:
    fontFamily: Quicksand
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
  label-sm:
    fontFamily: Quicksand
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-tablet: 1rem
  margin: 1rem
  margin-tablet: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

The design system establishes a restorative, delightfully tactile aesthetic tailored for a mobile pet simulation idle-clicker game. It bridges Japanese kawaii culture with modern tactile mobile game design, evoking warmth, gentle joy, emotional safety, and low-stress immersion.

### Aesthetic Foundation
- **Tactile & Squishy Materiality**: Interactive components simulate soft rubber, silicone, and mochi textures. Buttons exhibit physical bounce, press down via drop-offsets, and project diffuse, colored drop shadows rather than sterile neutral blurs.
- **Warm Domestic Cozy Tone**: Stark blacks, clinical whites, and abrasive cold grays are forbidden. The environment reads like a hand-drawn picture book or an artisan bakery, using clotted cream bases, cocoa chocolate typography, and vibrant pastel confections.
- **Playful Ornamentation**: Subtle scalloped frames, bubbly indicator dots, stitched borders, and friendly icon-first status tracking reinforce a lighthearted, gamified universe without compromising crisp visual hierarchy.

## Colors

The palette operates on a culinary and botanical metaphor of warm pastries, matcha tea, ripe persimmon, and sweet cream.

### Roles & Assignments
- **Primary (`#FF7E67`, `#FF9B82`)**: Coral Peach. Used for primary calls-to-action, high-energy clicker taps, critical quest alerts, love/happiness meters, and prominent action buttons.
- **Secondary (`#88D8B0`, `#A8E6CF`)**: Soft Matcha Mint. Dedicated to satiety, health bars, inventory expansion, positive confirmations, and soothing UI backdrops.
- **Tertiary (`#FDCB6E`, `#FFEAA7`)**: Butter Sweet Yellow. Serves as currency counters (fish coins, premium catnip), star ratings, milestone rewards, and energetic focal points.
- **Accent Soft Sky & Lavender (`#D6E4FF`, `#C4B5FD`)**: Auxiliary accents for magical enhancements, deep-water fish tanks, sleep meters, and passive skill trees.
- **Neutral & Text (`#4A3E3D`, `#7A6968`)**: Deep Cocoa Brown & Milk Chocolate. Replaces harsh black to maintain a soft storybook feel while delivering accessible AAA contrast on light grounds.
- **Surfaces & Canvases (`#FFF9F2`, `#FFF2E6`, `#FFE8D6`)**: Peach Cream and Warm Custard. Acts as the base viewport background, container fill, and modal surface.

## Typography

The typography leverages **Quicksand** across all tiers to deliver rounded terminals and warm geometric letterforms that complement the squishy visual language.

### Styling Directives
- **Weights**: Reserve `700 (Bold)` for headings, currency numerals, level metrics, and interactive buttons to optimize legibility on vibrant pastel backgrounds. Use `600 (SemiBold)` and `500 (Medium)` for dialog, lore, and descriptive lists.
- **Numbers & Metrics**: Numerical readouts (coin counts, idle tick counters, DPS multipliers) must use tabular numbers (`font-variant-numeric: tabular-nums`) with bold weights to avoid visual jitter during rapid idle increases.
- **Text Color Hierarchy**: Primary copy uses Deep Cocoa Brown (`#4A3E3D`). Secondary annotations, cooldowns, and timestamps use Milk Chocolate (`#7A6968`). Text inside tinted primary containers renders in Crisp Cream (`#FFFFFF` or `#FFF9F2`) with a subtle text shadow (`0 1px 2px rgba(74, 62, 61, 0.25)`).

## Layout & Spacing

The layout is built for single-thumb portrait mobile gaming, with responsive scaling for tablet viewports.

### Architectural Model
- **Mobile First (Portrait, 360px - 480px)**: 4-column fluid layout with dynamic safe areas (iOS home indicator, punch-hole cameras). Primary HUD overlays anchor to top and bottom bounds, while the central canvas hosts the interactive aquarium/sanctuary area.
- **Tablet / Large Screen (768px+)**: Centered stage column constrained to 540px width with floating side-dock panels for inventory, gacha drawers, and pet progression books.
- **Thumb Zones**: Critical clicker nodes, tap buttons, and primary action drawers reside within the lower 40% of the mobile viewport. Static status bars (hunger, mood, fish energy) lock to the top edge below system status bars.

## Elevation & Depth

Visual hierarchy uses **tactile offset shadows** combined with soft, warm ambient diffusion to create a tangible "mochi toy" aesthetic.

### Depth Mechanics
- **Tactile Squish (Bottom Offset)**: Interactive elements don't rely purely on flat shadows. Instead, primary surfaces sit on an extruded base created by a solid offset border/under-layer (`0 4px 0 #E5634D` underneath `#FF7E67`), collapsing to `0 1px 0` on tap or active state.
- **Warm Ambient Bloom**: Floating modals and tooltips utilize low-opacity, warm-tinted drop shadows rather than grayscale shadows:
  - Low Elevation (HUD elements, chip badges): `0 2px 6px rgba(122, 105, 104, 0.12)`
  - Medium Elevation (Cards, dialog windows): `0 6px 16px rgba(122, 105, 104, 0.16), 0 2px 4px rgba(255, 126, 103, 0.08)`
  - High Elevation (Level-up modal, gacha pull showcase): `0 12px 28px rgba(74, 62, 61, 0.2), 0 0 0 100vmax rgba(74, 62, 61, 0.3)`
- **Inner Gloss Highlight**: Buttons and interactive badges feature a subtle semi-transparent white highlight across their upper edge (`inset 0 2px 0 rgba(255, 255, 255, 0.45)`) simulating glazed candy or smooth silicone.

## Shapes

The design system enforces a pill-shaped and bubble geometry (`roundedness: 3`) across all controls and structural containers.

### Boundary Specifications
- **Controls & Buttons**: Pill-shaped (`border-radius: 9999px`).
- **Cards & Modals**: Extra rounded corners (`border-radius: 1.5rem` to `2rem`). Sharp 90-degree corners are completely absent.
- **Outlines & Strokes**: All primary containers, HUD modules, and action cards feature a defined, soft border of `2px solid #FFF2E6` or `2.5px solid #EEDBCB` to frame the candy-colored content against scenic game backgrounds.

## Components

### Buttons
- **Primary Pill (Squish CTA)**:
  - Fill: `#FF7E67`, Text: `#FFFFFF`, Outline: `2px solid #FFF9F2`.
  - Base Extrusion: Solid pseudo-element shadow `0 4px 0 #E5634D`.
  - Top Sheen: `inset 0 2px 0 rgba(255, 255, 255, 0.5)`.
  - State: On press, shifts downward by `3px`, reducing bottom extrusion to `1px` with a gentle `scale(0.97)` spring transition.
- **Secondary (Matcha & Butter)**:
  - Fill: Soft matcha `#88D8B0` (confirmations) or butter yellow `#FDCB6E` (store/currency). Extrusion tinted to matching deeper values (`#6CB892` and `#D8A84E`).
- **Icon Action Buttons**:
  - Circular buttons (`48px x 48px` or `56px x 56px`) with centered kawaii vector icons (paw print, fish tail, bell, yarn).

### Cards & HUD Shells
- **HUD Coin/Energy Tracker**:
  - Pill container (`height: 36px`), background `#FFF9F2`, border `2px solid #FFE8D6`.
  - Leading circular emblem overlapping the left margin displaying dynamic icons (e.g., golden carp, heart gem).
  - Value in Quicksand Bold, trailing '+' micro-button in Coral Peach.
- **Pet Status & Upgrade Cards**:
  - Background: Custard white (`#FFFFFF`) with inner border `2px solid #FFF2E6`.
  - Rounded `1.5rem` corners with soft bottom drop shadow `0 6px 12px rgba(122, 105, 104, 0.08)`.
  - Headers accented by pastel color-blocked bannerettes or stitched ribbon headers.

### Progress Bars (Happiness & Hunger)
- **Track**: Capsule background `#FFF2E6` with inset inner shadow `inset 0 2px 4px rgba(74, 62, 61, 0.1)`. Height: `18px` to `24px`.
- **Fill**: Gradients of coral peach (`#FF9B82` to `#FF7E67`) or matcha (`#A8E6CF` to `#88D8B0`) with a rounded pill edge.
- **Micro-Decorations**: Segment dividers marked by micro-paw marks; floating icon thumbnail (heart or swimming fish) pinned to the current progress head, bobbing dynamically via idle animation.

### Badges & Chips
- Bubbly rounded pills with text set in `label-sm` or `label-md`.
- Backgrounds in soft pastel washes: Lavender (`#D6E4FF`), Mint (`#A8E6CF`), or Peach (`#FFE8D6`).
- Border: `1.5px solid rgba(74, 62, 61, 0.1)`.

### Checkboxes & Toggle Switches
- **Toggle Switch**:
  - Track: Pill form in `#EEDBCB`, shifting to `#88D8B0` when active.
  - Thumb: Oversized bouncy sphere (`#FFFFFF`) containing a subtle paw print deboss, casting an elevation shadow of `0 3px 6px rgba(74, 62, 61, 0.15)`.
- **Checkboxes**:
  - Rounded squircle (`12px` radius), fill `#FFF9F2`, border `2px solid #FF9B82`. Check mark rendered as an adorable fishbone or heart glyph in `#FF7E67`.

### Input Fields
- Fill: `#FFFDFB`, border: `2px solid #FFE8D6`, text: `#4A3E3D`, placeholder: `#B8A9A8`.
- Focus state: Border changes to `#FF7E67` with a subtle halo of `0 0 0 4px rgba(255, 126, 103, 0.2)`. Fully rounded capsule form.

### Dialogs & Toast Notifications
- **Toast Notifications**: Floating cream clouds bordered in soft peach, sliding down from top HUD with an icon indicator and crisp playful audio cue.
- **Modals**: Centered bouncy cards with a scalloped top header, soft cocoa backdrop blur (`backdrop-filter: blur(4px)`), and twin primary action choices ("Keep Playing" vs "Rest Pet").