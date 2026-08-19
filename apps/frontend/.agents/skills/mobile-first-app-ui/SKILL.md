---
name: mobile-first-app-ui
description: Best practices and UI patterns for crafting native-feeling mobile-first responsive web apps, bottom sheets, floating map overlays, touch thumb-zone ergonomics, and responsive desktop dashboard layouts.
license: MIT
---

# Mobile-First App UI & Thumb-Zone Ergonomics

Grab and Uber thrive because their interfaces are designed thumb-first on mobile while seamlessly expanding into clean command dashboards on desktop. This skill guides the architecture of modern transport & on-demand delivery interfaces.

---

## 1. Thumb-Zone Ergonomics & Spatial Hierarchy

On mobile devices (360px - 430px width):
- **Natural Thumb Zone (Bottom 40%)**: Primary action buttons ("Đặt xe", "Nhận cuốc", "Bắt đầu chở"), service selectors, price summary.
- **Easy Reach Zone (Middle 35%)**: Dynamic trip status, driver details, live ETA counter, route overview.
- **Hard Reach / Glance Zone (Top 25%)**: Back buttons, search bar, map zoom controls, header profile.

```
+-----------------------------+
| [Avatar]  [Search Box]  [⚡] |  <- Hard Reach / Header glance
+-----------------------------+
|                             |
|      MAP CANVAS             |  <- Visual stage
|   (Vehicle & Route)         |
|                             |
+-----------------------------+
| Driver Card / State Stepper |  <- Easy Reach
+-----------------------------+
| [ Crabbike | CrabCar | Food]|  <- Natural Thumb Zone
| [ ==== ĐẶT XE NGAY ==== ]   |  <- Primary Action (48-56px height)
+-----------------------------+
```

---

## 2. The 3-State Collapsible Bottom Sheet Pattern

Bottom sheets on map applications should support 3 fluid snap-points:
1. **Peek State (Height: ~120px)**: Shows only essential ETA ("Tài xế đang đến trong 3 phút") and driver name. Maximizes map visibility.
2. **Half-Expanded State (Height: ~45-55% vh)**: Shows route details, vehicle info, fare breakdown, and action buttons.
3. **Full-Expanded State (Height: ~90% vh)**: Shows full trip receipt, route step breakdown, support chat, or driver reviews.

### Implementation Guidelines:
- **Drag Handle Bar**: Include a subtle pill handle at the top (`w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2`).
- **Touch Gesture Listener**: Use `touchstart`, `touchmove`, `touchend` with velocity detection or Framer Motion `drag="y" dragConstraints={{ top: 0, bottom: 300 }}`.
- **Safe Area Insets**: Always apply `padding-bottom: env(safe-area-inset-bottom, 16px)` to avoid overlapping mobile navigation home bars.

---

## 3. Glassmorphism & Modern Depth Tokens

Never use flat generic gray borders. Create depth using frosted glass, subtle borders, and layered drop shadows:

```css
/* Glassmorphism Floating Bottom Sheet */
.glass-sheet {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 -10px 30px -5px rgba(0, 0, 0, 0.08), 0 -4px 10px -2px rgba(0, 0, 0, 0.03);
}

/* Glass Floating Card over Map */
.glass-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(229, 231, 235, 0.8);
  border-radius: 1rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
}
```

---

## 4. Swipe-To-Confirm ("Trượt để nhận cuốc")

For high-stakes actions (Driver accepting trip, starting transit), a swipe slider prevents accidental taps:

```tsx
export function SwipeToConfirm({ onConfirm, text = "Trượt để nhận cuốc" }: { onConfirm: () => void; text?: string }) {
  const [dragX, setDragX] = useState(0);
  const maxDrag = 220;

  const handleTouchEnd = () => {
    if (dragX >= maxDrag * 0.85) {
      setDragX(maxDrag);
      onConfirm();
    } else {
      setDragX(0); // Snap back
    }
  };

  return (
    <div className="relative w-full h-14 bg-emerald-100 rounded-full p-1 overflow-hidden select-none">
      <div className="absolute inset-0 flex items-center justify-center font-semibold text-emerald-800 text-sm">
        {text} ➔
      </div>
      <div
        className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold shadow-md cursor-grab active:cursor-grabbing transition-transform duration-75"
        style={{ transform: `translateX(${dragX}px)` }}
        onTouchMove={(e) => {
          const rect = e.currentTarget.parentElement?.getBoundingClientRect();
          if (rect) {
            const newX = Math.max(0, Math.min(e.touches[0].clientX - rect.left - 24, maxDrag));
            setDragX(newX);
          }
        }}
        onTouchEnd={handleTouchEnd}
      >
        ➔
      </div>
    </div>
  );
}
```

---

## 5. Responsive Breakpoint Adaptation

| Breakpoint | Target View | Layout Strategy |
|---|---|---|
| `< 768px` (Mobile) | Customer & Driver App | Fullscreen Map + Floating Bottom Sheet + Floating Header search |
| `768px - 1024px` (Tablet) | Split Screen | 60% Map Canvas + 40% Side Control Panel |
| `> 1024px` (Desktop / Admin) | Operations Dashboard | Left Sidebar Navigation + Top Stats Bar + Center Fleet Map + Right Live Feed |

---

## 6. Mobile Performance Rules
1. Use `height: 100dvh` (dynamic viewport height) instead of `100vh` to prevent jumping when mobile browser URL bars hide/show.
2. Prevent elastic overscroll bounce on map backgrounds with `overscroll-behavior: none`.
3. Minimum touch target size: **48x48px** for all interactive buttons and icons.
