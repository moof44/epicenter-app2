# Member Progress Feature Redesign Plan

## Scope
1. **Progress Dashboard** (`src/app/features/progress/components/progress-dashboard/`)
2. **Attendance Calendar** (`src/app/features/progress/components/attendance-calendar/`)
3. **Progress Entry Form** (`src/app/features/progress/components/progress-form/`)

## Applied Architectural Rules
1. **4-Screen Responsive UI Protocol**:
   - Mobile (< 640px): 16px lateral padding, stacked KPI cards, full-width touch actions.
   - Tablet Portrait (640px – 768px): 2-column KPI grid.
   - Tablet Landscape (769px – 1024px): 3-column metric cards.
   - Desktop (> 1024px): 6-card metric pulse ribbon and expanded data matrix.
2. **Mandatory 120px Bottom Buffer**: Zero content cutoff above taskbars.
3. **Token Variable Architecture**: Pure White (`#ffffff`), Electric Cyan (`#22d3ee`), Eagles Gold (`#fbbf24`), Mint Success (`#34d399`), Rose Danger (`#f87171`).
4. **Template-First Audit**: 100% selector coverage for every HTML class name.
