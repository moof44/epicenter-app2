# Phase 10: Low Stock Alerts

> Part of: Staff Personal Dashboard Spec
> Focus: Products below minimum stock level — role-dependent restock reminder

---

## 1. Goal

**Psychological driver:** Responsibility and ownership.

This widget answers: "Is there something I need to act on right now?" It shifts the dashboard from purely motivational to operationally useful. For ADMIN and MANAGER roles, seeing "3 products need restocking" creates a sense of urgency that drives action — they can tap through to Product Management and handle it immediately.

This is the only widget on the dashboard that's about the gym's needs rather than the staff's personal metrics. It balances the "me" focus of the other widgets with a "the gym needs me" reminder.

---

## 2. Data Source

### Query

**Source:** `ProductService.getProducts()` — the shared, cached real-time stream.

```typescript
productService.getProducts().pipe(
    map(products => products.filter(p => p.stock <= (p.minStockLevel || 0) && p.stock >= 0))
)
```

**Why client-side filter?** Firestore cannot compare two fields in the same document (`stock < minStockLevel`). The only options are:
1. Client-side filter on the cached product list — 0 additional reads
2. A Cloud Function that maintains a `lowStock: true` boolean field — adds write complexity

Option 1 is the clear winner. The product list is already cached via `shareReplay({ refCount: false })` in `ProductService`. Filtering 100 products in memory is instant.

### Fields used from `Product`

- `name` — product name
- `stock` — current stock count
- `minStockLevel` — threshold below which the product is "low"
- `category` — for the category icon
- `type` — to distinguish RETAIL vs CONSUMABLE (both can be low)

### Derived metrics

- `lowStockProducts = products.filter(p => p.stock <= p.minStockLevel)`
- `count = lowStockProducts.length`
- `criticalCount = lowStockProducts.filter(p => p.stock === 0).length` — out of stock entirely

### Firestore cost: 0 reads

The product list is already loaded and cached by `ProductService`. This widget adds zero Firestore reads.

---

## 3. Refresh Behavior & Caching Tier

**Tier: 3 — Already Cached (via ProductService shared stream)**

`ProductService.getProducts()` returns a `shareReplay({ refCount: false })` Observable backed by a Firestore `onSnapshot` listener. This means:
- The product list is always up to date (real-time listener)
- The dashboard widget subscribes to the same stream as POS, Product Management, etc.
- When stock changes (sale, restock, consumption), the listener fires and the widget updates automatically
- Zero additional Firestore reads

| Trigger | Behavior |
|---------|----------|
| Navigate to dashboard | Subscribe to shared product stream. Instant data from cache. |
| Product stock changes (sale, restock) | Widget updates automatically via the shared listener. |
| Navigate away and back | Re-subscribe. `shareReplay` replays last value instantly. |
| New product added / product deleted | Stream emits updated list. Widget re-filters. |

This is the most cost-efficient widget on the entire dashboard.

---

## 4. Copy & Wording

### Card title

"Stock Alerts"

Short, actionable. Not "Low Stock Products" (too long) or "Inventory Warnings" (too alarming).

### Primary line: Count

| Scenario | Text | Color |
|----------|------|-------|
| 0 low stock products | (show positive state — see below) | Green |
| 1 product low | "1 product needs restocking" | Orange |
| 2+ products low | "{count} products need restocking" | Orange |
| Any product at 0 stock | "{criticalCount} out of stock!" | Red (this one deserves red — it's a real operational problem) |

### Product list (below the count)

Show up to 3 products, sorted by stock ascending (most critical first):

```
• Protein Shake — 2 left (min: 10)
• Energy Drink — 0 left ⚠️
• Boxing Gloves — 3 left (min: 5)
```

If more than 3: "+{remaining} more"

### Positive state (all stock healthy)

When no products are below their minimum:

- Icon: `check_circle` (green)
- Text: "All products are well stocked"
- Tone: Reassuring. The staff can focus on other things.

This is NOT an empty state — it's a positive confirmation. The widget still renders, it just shows good news.

---

## 5. Visual Design

### Card structure

```
┌──────────────────────────────────────┐
│  📦  Stock Alerts                    │
│                                      │
│  3 products need restocking          │  ← Count (orange)
│                                      │
│  • Protein Shake — 2 left (min: 10) │  ← Product list
│  • Energy Drink — 0 left ⚠️          │  ← Critical (red text)
│  • Boxing Gloves — 3 left (min: 5)  │
│  +2 more                             │
└──────────────────────────────────────┘
```

Positive state:

```
┌──────────────────────────────────────┐
│  ✅  Stock Alerts                    │
│                                      │
│  All products are well stocked       │  ← Green text
└──────────────────────────────────────┘
```

### Sizing

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Card | Full width (grid-column: 1 / -1) | Full width | Full width |
| Count text | 16px, 600 weight | 15px | 14px |
| Product list item | 13px, 400 weight | 13px | 12px |
| "+N more" link | 13px, 500 weight | 13px | 12px |
| Card padding | 24px | 24px | 16px |
| Card min-height | 80px (positive) / 120px (alerts) | Same | Same |

### Colors

- Count text (low stock): `#ff9800` (orange)
- Count text (out of stock): `#f44336` (red) — the only widget that uses red, because zero stock is a real problem
- Product name: `var(--mat-sys-on-surface)`
- Stock count (low): `#ff9800` (orange)
- Stock count (zero): `#f44336` (red)
- "min: X" reference: `var(--mat-sys-on-surface-variant)` (muted)
- Positive state text: `#4caf50` (green)
- Positive state icon: `#4caf50`

### Card elevation

`mat-elevation-z1`

### Alert accent

When there are low stock products, add a subtle left border accent:

```css
.stock-alert-card.has-alerts {
    border-left: 4px solid #ff9800;
}

.stock-alert-card.has-critical {
    border-left: 4px solid #f44336;
}
```

This draws the eye without being as aggressive as a full red background.

---

## 6. Interactions

| Action | Behavior |
|--------|----------|
| Tap/click the card | Navigate to `/store/manage` — Product Management page where they can restock |
| Tap a specific product name | Same — navigate to Product Management (no deep-link to individual product) |
| Hover (desktop) | Subtle elevation increase + cursor pointer |

---

## 7. Role Visibility

| Role | Sees this widget? | Why |
|------|-------------------|-----|
| ADMIN | ✅ | Responsible for inventory decisions |
| MANAGER | ✅ | Manages restocking |
| STAFF | ❌ | Staff don't manage inventory — showing them low stock creates anxiety without authority to act |
| TRAINER | ❌ | No inventory responsibility |

**Key decision:** STAFF does NOT see this widget. Showing a staff member "3 products need restocking" when they can't do anything about it is frustrating, not motivating. Only roles with inventory management access (ADMIN, MANAGER) see it.

---

## 8. Edge Cases

| Scenario | Behavior |
|----------|----------|
| All products above minStockLevel | Positive state: "All products are well stocked" |
| Product has minStockLevel = 0 (not configured) | Never triggers low stock alert for that product. `stock <= 0` would only trigger if stock is literally 0 or negative. |
| Product has stock = -1 (oversold, data issue) | Treated as critical (stock < minStockLevel). Shows "−1 left ⚠️". The negative number signals a data problem. |
| No products in the system | Positive state (no products = no alerts). |
| 100 products, all low stock | Count shows "100 products need restocking". List shows top 3 most critical. "+97 more" link. |
| Product deleted while dashboard is open | Shared stream emits updated list. Deleted product disappears from alerts automatically. |
| minStockLevel changed by admin | Shared stream emits updated product. Alert recalculates automatically. |

---

## 9. Component Spec

**File:** `src/app/features/dashboard/widgets/low-stock-alerts/low-stock-alerts.ts`

**Inputs:** None.

**Injections:** `ProductService`

**Signals:**
- `products = toSignal(productService.getProducts(), { initialValue: [] })`

**Computed:**
- `lowStockProducts = computed(() => products().filter(p => p.stock <= (p.minStockLevel || 0)).sort((a, b) => a.stock - b.stock))`
- `count = computed(() => lowStockProducts().length)`
- `criticalCount = computed(() => lowStockProducts().filter(p => p.stock <= 0).length)`
- `displayProducts = computed(() => lowStockProducts().slice(0, 3))`
- `extraCount = computed(() => Math.max(count() - 3, 0))`
- `hasAlerts = computed(() => count() > 0)`
- `hasCritical = computed(() => criticalCount() > 0)`
- `isHealthy = computed(() => count() === 0)`

**No loading state needed.** The product stream is already loaded by the time the dashboard renders (POS and toolbar widgets subscribe to it on app init). The `toSignal` initialValue of `[]` means `isHealthy` is true until real data arrives — which shows the positive state briefly before the real state appears. This is acceptable (green flash → actual state) and better than a skeleton loader for a widget that's usually positive.

---

## 10. Firestore Index Requirements

None. The product list is fetched with `orderBy('name'), limit(100)` — an index that already exists. The low stock filter is client-side.

---

## Next Step

Phase 11: Recent Activity Feed — last 5 actions by this staff across sales and check-ins.
