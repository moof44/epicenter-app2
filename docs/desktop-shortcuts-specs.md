# Desktop Launchers Implementation Plan

## Goal
Provide one-click desktop shortcuts to independently start and stop development servers for **Gym App** and **Members Portal**, with automatic browser launch, dedicated default ports, and dynamic port collision handling.

## Requirements Verified
1. **Automatic Desktop Deployment**: Generated `.lnk` shortcuts directly into the user's Desktop directory (`C:\Users\Master\Desktop\`).
2. **Clear Identification**:
   - Distinct titles: `Epicenter - Gym App` vs. `Epicenter - Members Portal`.
   - Dedicated branding icons mapped to respective project `favicon.ico` files.
   - Distinct console banner headers in different accent colors.
3. **Dedicated Ports**:
   - Gym App: `4200`
   - Members Portal: `4300`
4. **Port In-Use Detection & Fallback**:
   - Checks TCP port availability using .NET sockets before startup.
   - If occupied, automatically searches sequentially and logs a clear notice specifying the fallback port allocated.
5. **Automatic Browser Launch**:
   - Runs `ng serve` with the `--open` flag.
6. **Clean Termination**:
   - Dedicated terminal window that can be closed anytime or stopped with `Ctrl+C`.

## Implemented Files
- [`scripts/find-available-port.ps1`](file:///e:/Programming/epicenter-app2/scripts/find-available-port.ps1): Detects socket port availability and finds next available port.
- [`scripts/run-app.ps1`](file:///e:/Programming/epicenter-app2/scripts/run-app.ps1): Core orchestrator handling banner display, port detection, and Angular CLI launch.
- [`scripts/start-gym-app.bat`](file:///e:/Programming/epicenter-app2/scripts/start-gym-app.bat): Shell entrypoint for Gym App.
- [`scripts/start-members-portal.bat`](file:///e:/Programming/epicenter-app2/scripts/start-members-portal.bat): Shell entrypoint for Members Portal.
- [`scripts/deploy-shortcuts.ps1`](file:///e:/Programming/epicenter-app2/scripts/deploy-shortcuts.ps1): Automates creation/re-creation of desktop shortcuts.
