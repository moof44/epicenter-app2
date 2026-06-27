# Agent Rules & Constraints

## Change Audit & Safety Protocol

Before finishing any task, you must audit the changes to ensure:
1. **Protect already working system**: The existing functionality and configurations of the system must be fully preserved and protected.
2. **No breaking changes**: The modifications must not introduce compiler errors, runtime exceptions, or any unintended side-effects.
3. **Not a stopper**: Under no circumstances should the changes block or serve as a blocker to the runtime operation of the kiosk check-in, bookings, or other active services.

## UI/UX & Mobile Development Guidelines (Learnings from Daily Quests)

1. **Wait for Manual Testing**: NEVER commit or push code after implementing complex features or making UI changes until the user has explicitly verified the functionality manually.
2. **Touch Target Sizing**: On mobile screens, draggable elements and buttons must have comfortable touch targets (minimum 40-50px width/height). Do not use compact/tiny pixel sizes for interactive draggable items.
3. **Mobile Screen Limits**: Always strictly calculate Flex/Grid layouts and gap spacing to ensure components do not overflow narrow mobile viewports (e.g., iPhone SE at 320px width). The maximum inner width of a modal container should never exceed ~256px without wrapping.
4. **Forgiving Drop Zones**: For drag-and-drop mechanics, never require pixel-perfect collision with tiny targets. Drop zones should be massive (e.g., "anywhere on the right half of the screen") to accommodate clumsy finger gestures.
5. **Absolute Position Math Constraints**: When using `position: absolute` with calculated offsets inside a container with `overflow: hidden`, always verify mathematically that the maximum generated offset + element width does not exceed the container width, otherwise elements will silently clip out of view.
6. **Async Mobile State (Change Detection)**: In Angular, mobile browsers may throttle `setTimeout` or lose Zone.js context for background timers. Always explicitly call `this.cdr.detectChanges()` inside background timeouts if they update visual state.
7. **Hardware APIs (Haptics)**: Hardware APIs like `navigator.vibrate` will often throw silent, uncaught exceptions on desktop environments or restricted iframes, instantly crashing the thread and breaking subsequent code (like timers). **Always wrap hardware API calls in strict `try-catch` blocks.**
8. **Drag Coordinate Math**: Always calculate `clientX/Y` drag offsets relative to the specific, immediate game board/arena container (`getBoundingClientRect()`), never relative to the top-level viewport or outer modal, to prevent offset desyncs when scrolling or resizing.
