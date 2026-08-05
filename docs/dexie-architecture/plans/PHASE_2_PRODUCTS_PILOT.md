# Phase 2 Implementation Plan — Pilot Read-Only Page (Store/Products in gym-app)

> **Status:** 🔴 Pending Phase 1 Completion  
> **Phase Target:** Store & Product Catalog Cache in `gym-app`  
> **Assigned Personas:** 🎨 Persona D (UI Specialist) & ⚡ Persona B (Database Specialist)  
> **Last Updated:** August 5, 2026  

---

## 📌 Executive Summary & Goals

Phase 2 migrates the Store and Product Catalog in `gym-app` to read from Dexie.js local cache (`Cache-First`).
This serves as the initial live pilot page to validate performance, zero UI flickering, instant search responsiveness, and background delta synchronization in production.

---

## 🎯 Task Checklist & Execution Tracker

### Task 2.1: Create Product Repository Layer
- [ ] Create `src/app/core/repositories/product.repository.ts`.
- [ ] Implement `getProductsLive()` using Dexie `liveQuery()`.
- [ ] Implement `getCategoriesLive()` using Dexie `liveQuery()`.
- [ ] Connect background delta sync listener from Firestore to Dexie product table.

### Task 2.2: Refactor Store/POS Components to Read from ProductRepository
- [ ] Update `src/app/features/store/components/pos/pos.component.ts` to use `ProductRepository`.
- [ ] Update `src/app/features/store/components/product-management/product-management.component.ts`.
- [ ] Ensure backward compatibility—if Dexie is empty on first load, fall back smoothly to direct fetch and seed Dexie.

### Task 2.3: User Feedback & Manual Verification
- [ ] Test offline behavior in DevTools (Disable network -> search products -> observe instant render).
- [ ] Verify multi-tab synchronization when products are edited in staff dashboard.
- [ ] Collect user feedback before advancing to Phase 3 (POS Sales Outbox).

---

## 📂 Targeted Files & Impact Radius
- `src/app/core/repositories/product.repository.ts` (NEW)
- `src/app/features/store/components/pos/pos.component.ts`
- `src/app/features/store/components/product-management/product-management.component.ts`
- `docs/dexie-architecture/plans/PHASE_2_PRODUCTS_PILOT.md` (Self-updating progress tracker)
