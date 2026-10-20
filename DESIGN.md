# Design System & Visual Language — SATIVA BelajarVibe

<!-- impeccable:design-schema 1 -->

## Design Tokens

### Color Palette
- **Background Deep**: `#0d1d29` (Deep slate navy)
- **Panel Glass**: `#102636`/90 with `backdrop-blur-xl` and `border-white/10`
- **Accent Primary**: `#a0d4e4` (Luminous cyan-blue)
- **Accent Emerald**: `#10b981` (Present / Success status)
- **Accent Indigo**: `#6366f1` (Email & Management interactive state)
- **Accent Alert**: `#f59e0b` / `#ef4444` (Burnout risk & warnings)
- **Text Main**: `#ffffff` (High contrast pure white)
- **Text Muted**: `#a0d4e4`/80 (Soft cyan text)

### Typography & Hierarchy
- **Font Family**: Inter, system-ui, sans-serif
- **Headings**: `heading-display`, `font-extrabold`, uppercase tracking-wider
- **Body Text**: `text-xs`, `text-sm`, leading-relaxed
- **Mono Stats**: `font-mono` for metrics, distance, and timestamps

### Spacing & Grid
- **Sidebar Width**: `w-64` (Desktop fixed), sticky positioning
- **Card Padding**: `p-6` to `p-8`
- **Border Radius**: `rounded-3xl` for main cards, `rounded-2xl` for subpanels, `rounded-xl` for buttons

### Motion & Micro-interactions
- **Transitions**: `transition-all duration-300`
- **Hovers**: Subtle scale transforms `hover:scale-105`, glow borders `hover:border-[#a0d4e4]/40`
- **Fade In**: `animate-fade-in` on view transitions
