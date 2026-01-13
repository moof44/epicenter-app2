# UX/UI Design Guidelines

This document outlines the core design principles for the Epicenter application, ensuring a consistent, accessible, and high-quality user experience, especially on mobile devices.

## Core Principles

### 1. Clarity and Simplicity
**Goal**: Minimize "cognitive load" (mental effort).
- **Guideline**: Eliminate unnecessary elements. Keep screens focused.
- **Why**: Prevents user frustration and errors.

### 2. Consistency
**Goal**: Build trust and predictability.
- **Guideline**: Use standardized patterns (e.g., hamburger menus, standard icons, consistent colors).
- **Why**: Users can apply knowledge from other apps to this one, reducing the learning curve.

### 3. Accessibility
**Goal**: Usable by everyone.
- **Guideline**: 
  - High color contrast.
  - Readable typography (font size and weight).
  - Support for screen readers (semantic HTML).
- **Why**: Non-negotiable standard in modern web development.

### 4. Visual Hierarchy
**Goal**: Guide the user's eye.
- **Guideline**: Use size, color, and placement to highlight the most important action or information.
- **Why**: Helps users instantly understand what to do next.

### 5. Immediate Feedback
**Goal**: Confirm system status.
- **Guideline**: Every interaction (tap, click) must trigger a visible response (animation, ripple, color change) or haptic feedback.
- **Why**: Users need to know their command was received.

## Mobile-Specific Guidelines

### 6. Screen Real Estate
**Context**: Mobile screens are small (320px - 430px width).
- **Guideline**: Avoid multi-window views. Use full-screen layouts or clean component swaps.
- **Why**: Preventing severe visual clutter.

### 7. Single-Tasking Focus
**Context**: Human cognitive limitations.
- **Guideline**: Show one interface/task at a time.
- **Why**: Helps users reach a "flow state" and complete tasks faster with fewer errors.

### 8. Reducing Cognitive Overload
**Context**: Limited attention span.
- **Guideline**: Focus on one chief function per page.
- **Why**: Reduces the mental energy required to make decisions.

### 9. Touch Interaction
**Context**: Fingertips are less precise than mouse cursors.
- **Guideline**: Ensure "touch targets" are large enough (min 44x44px or 7-10mm).
- **Why**: Prevents accidental taps and frustration.

### 10. Progressive Disclosure
**Context**: Complex information on small screens.
- **Guideline**: Show only necessary information for the current step. Hide advanced options in submenus or expandable sections.
- **Why**: Keeps the initial view clean and approachable while still supporting power users.
