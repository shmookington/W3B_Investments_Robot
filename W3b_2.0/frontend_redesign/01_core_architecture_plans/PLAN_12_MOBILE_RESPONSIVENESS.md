# Frontend Redesign Phase 12: The Executive Mobile Experience

**Status:** APPROVED
**Topic:** Rebuilding the App for High-Net-Worth Executives on the Go (`/mobile`)

## 1. The Strategy: Focus on the "Tear Sheet"
Most hedge fund partners don't sit at a computer to check yield; they look at their phones. The current W3B site breaks down linearly. To feel "sophisticated," the mobile view must feel like an exclusive iOS native banking app (e.g., Apple Card or Chase Private Client).

## 2. Intricacies & Implementation Details

**1. `<MobilePortfolioRibbon>`**
- A fixed-bottom "glassmorphic" tab bar covering exactly 15% of the bottom screen. 
- It houses three major sections: `VAULT`, `MARKETS`, `AUDIT`. 

**2. `<ExecutiveTearSheet>`**
- Instead of showing all the intricate execution data (`Trading Tape`, `Order Book`), the mobile view condenses it to an "Executive Tear Sheet". It just gives high-level PnL, Total Volatility, and Kelly Adjustments.

**3. `<ProgressiveWebApp_Config>`**
- W3B must be installable to the iOS Homescreen. We will configure a massive overhaul of `manifest.json`.
- The PWA icon is not a colorful logo; it is a profound, solid Onyx geometric shape framed in Gold.
- `apple-mobile-web-app-status-bar-style` set to `black-translucent` so the app blends seamlessly into the physical phone notch.
