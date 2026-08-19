---
name: micro-interactions-and-animations
description: Master guide for creating fluid 60fps micro-interactions, spring physics, radar pulsing animations, vehicle marker movement transitions, gesture-driven bottom sheets, and delight effects for modern web and mobile UI.
license: MIT
---

# Micro-Interactions & Animation Mastery

When building high-end interfaces (like Grab, Uber, Airbnb, Linear), static screens feel dead and clunky. Purposeful micro-interactions turn a functional app into an addictive, delightful product. Every state change, tap, hover, and data update should have feedback, personality, and spatial continuity.

---

## 1. Core Principles of Purposeful Motion

1. **60 FPS Hardware Acceleration Rule**:
   - **ONLY** animate `transform` (translate, scale, rotate) and `opacity`.
   - Never animate `height`, `width`, `top`, `left`, `margin`, or `padding` as they cause layout recalculation and paint thrashing.
   - Use `will-change: transform` sparingly on active animating elements, and remove it on idle.

2. **Easing & Timing Personality**:
   - **Snappy UI Interactions (Clicks, Toggles, Badges)**: 150ms - 250ms with `cubic-bezier(0.4, 0, 0.2, 1)` (Standard) or `cubic-bezier(0.16, 1, 0.3, 1)` (Ultra-smooth ease-out).
   - **Modals, Drawers & Bottom Sheets**: 300ms - 400ms with spring damping or cubic-bezier.
   - **Ambient / Radar Waves**: 1.5s - 2.5s infinite loops with ease-out expansion.

3. **Spatial Continuity**: Elements should enter from where they logically originate (e.g. Bottom sheets slide up from bottom, Trip cards slide down from header, notifications drop in with bounce).

---

## 2. Signature Animations for Crab Transport & Delivery

### A. Radar Pulse Wave (Finding Driver State)
Used during `FINDING_DRIVER` to communicate real-time spatial scanning:
```css
@keyframes radar-pulse {
  0% {
    transform: scale(0.6);
    opacity: 0.8;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    transform: scale(2.4);
    opacity: 0;
  }
}

.radar-ring {
  position: absolute;
  border-radius: 9999px;
  border: 2px solid #00B14F;
  background: radial-gradient(circle, rgba(0, 177, 79, 0.15) 0%, rgba(0, 177, 79, 0) 70%);
  animation: radar-pulse 2.2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
}

.radar-ring:nth-child(2) {
  animation-delay: 0.7s;
}
.radar-ring:nth-child(3) {
  animation-delay: 1.4s;
}
```

### B. Countdown Radial Timer (Driver Offer 15s TTL)
Provides urgent, clear visual feedback for incoming trips:
```tsx
export function RadialCountdown({ totalSeconds = 15, onExpire }: { totalSeconds: number; onExpire: () => void }) {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const strokeDashoffset = (1 - timeLeft / totalSeconds) * 283;

  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" stroke="#E5E7EB" strokeWidth="8" fill="none" />
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="#00B14F"
          strokeWidth="8"
          strokeDasharray="283"
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <span className="absolute font-bold text-lg text-slate-800">{timeLeft}s</span>
    </div>
  );
}
```

### C. Smooth Vehicle Marker Movement (Turf.js Interpolation)
When receiving WebSockets GPS coordinates, interpolate over a 1.2s window:
```typescript
export function animateMarkerAlongPath(
  marker: L.Marker,
  startCoord: [number, number],
  endCoord: [number, number],
  durationMs: number = 1200
) {
  const startTime = performance.now();
  
  function step(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    // Smooth ease-out quad
    const easeProgress = 1 - (1 - progress) * (1 - progress);

    const currentLat = startCoord[0] + (endCoord[0] - startCoord[0]) * easeProgress;
    const currentLng = startCoord[1] + (endCoord[1] - startCoord[1]) * easeProgress;

    marker.setLatLng([currentLat, currentLng]);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}
```

### D. Skeleton Shimmer Loading (Zero-Jank Placeholders)
```css
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton-shimmer {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

### E. Interactive Button Press & Micro-Bounce
```css
.btn-grab {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.btn-grab:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px -4px rgba(0, 177, 79, 0.35);
}
.btn-grab:active {
  transform: translateY(1px) scale(0.98);
  box-shadow: 0 2px 6px -1px rgba(0, 177, 79, 0.25);
}
```

---

## 3. Checklist for High-End Motion Quality
- [ ] Every button has distinct `:hover`, `:focus-visible`, and `:active` physical states.
- [ ] Modals and sheets feature a backdrop blur (`backdrop-blur-md`) with fade-in overlay.
- [ ] State Machine transitions (e.g. Finding -> Accepted -> In Transit) cross-fade smoothly without screen flash.
- [ ] Success actions (e.g. Rating submitted, Trip completed) feature a celebratory micro-animation (checkmark draw or confetti burst).
- [ ] Respect `prefers-reduced-motion` media query for accessibility.
