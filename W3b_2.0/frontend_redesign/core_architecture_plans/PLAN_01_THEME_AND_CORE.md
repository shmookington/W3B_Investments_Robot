# Frontend Redesign Phase 1: Thematic Paradigm & Core Components

**Status:** APPROVED
**Topic:** Establishing the Global Style and Thematic Foundation

## 1. The Strategy: "The Sophisticated Fund"
We are abandoning the standard retail-facing prediction/betting app aesthetic. W3B is now a high-end quantitative fund dealing in **Event Hedging** and **Share Settlement**. 
The tone is extremely serious, heavily data-driven, and designed for high-net-worth liquidity providers.

### Approved Principles:
- **Palette**: Charcoal, Platinum, Gold.
- **Vibe**: Bloomberg Terminal meets Apple's Frosted Glass. Deep, rich, organic motion loops hidden in darkness.
- **Asset Classes**: Ambiguous. No mention of "sports" or "teams". We deal in "Event Shares", "Volatility", "Yield", and "Convergence".
- **Structure**: Total scrap and rebuild of HTML/CSS structure to prioritize these ideals.

## 2. Global Styling (The "Dark Pool" Setup)

### Color Tokens
```css
:root {
  --bg-onyx-deep: #0a0a0b;
  --bg-slate-panel: rgba(23, 23, 25, 0.4); /* Deep frosted glass */
  --accent-gold-primary: #d4af37;        /* Execution buttons, highlight stats */
  --accent-gold-muted: #8c7324;
  --text-platinum: #f4f4f5;
  --text-charcoal: #a1a1aa;
  --data-positive: #00e5ff;              /* Yield increasing */
  --data-negative: #ff3366;              /* Volatility spikes / drawdown */
  
  --blur-institutional: blur(28px);
}
```

### Typography
- **Primary Headers & Interface Text:** Switch to `Geist` or `Inter` (sans-serif, geometric, highly legible at small font sizes for data density).
- **Data & Tickers:** Switch to `Fira Code` or `JetBrains Mono` strictly for numerical data representing share prices (`.643`), probabilities, and PnL. No more jagged CRT fonts for standard text.

### The "Evermoving Lake-Flow" Background Standard
Instead of static hex colors, the site’s `<html>` element will feature an ultra-slow, virtually imperceptible dark organic `linear-gradient` / SVG mesh background that subtly cycles over 45 seconds to create severe psychological depth.

## 3. Core New Components (To Rebuild)

**1. `<InstitutionalGlass />` (Replacing HoloPanel)**
A pure css-backdrop filter card. 1px semi-transparent white/gold border (e.g., `border: 1px solid rgba(212, 175, 55, 0.1)`). No more CRT scanlines.

**2. `<ExecutionButton />` (Replacing standard links)**
Smooth magnetic hover physics using Framer Motion. Platinum text that turns solid gold on hover, indicating high-value action.

**3. `<QuantTicker />` (For data visualization)**
A monospaced component that specifically highlights changing numerical values with a flash of green/red when they tick up or down.

## Next Steps
- Strip `globals.css`
- Delete `HoloPanel`, `HoloLabel`, `CRTOverlay` structures.
- Implement the baseline tokens and the 3 core components.
