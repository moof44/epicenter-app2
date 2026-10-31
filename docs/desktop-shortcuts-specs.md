# Local Development Shortcuts & Runners Specification

> **Target Audience**: Future AI Agents and Developers across any chat or development session.  
> **Source Location**: `docs/desktop-shortcuts-specs.md`  
> **Executable Scripts**: `scripts/` directory  

---

## 1. Executive Summary & Purpose

In this repository, development spans two main applications:
1. **Gym App (`gym-app`)**: Staff, Admin, Kiosk Check-In, and POS management.
2. **Members Portal (`members-portal`)**: Member-facing portal application located under `projects/members-portal`.

To eliminate the friction of manually running CLI commands, managing terminal processes, or debugging port collision errors, a dedicated **1-Click Desktop Shortcut Launcher** subsystem has been implemented. Any developer or AI agent can launch, test, or re-deploy these shortcuts.

---

## 2. Architecture & File Registry

| File Path | Role | Description |
| :--- | :--- | :--- |
| [`scripts/find-available-port.ps1`](file:///e:/Programming/epicenter-app2/scripts/find-available-port.ps1) | **Port Detector** | Scans TCP loopback listeners to ensure designated port is free; dynamically walks sequential ports up to +100 if occupied. |
| [`scripts/run-app.ps1`](file:///e:/Programming/epicenter-app2/scripts/run-app.ps1) | **Orchestrator** | Branded runner setting window titles, calling the port finder, and initiating `npx ng serve` with `--open`. |
| [`scripts/start-gym-app.bat`](file:///e:/Programming/epicenter-app2/scripts/start-gym-app.bat) | **Gym App Launcher** | Double-clickable batch wrapper for Gym App (`DefaultPort: 4200`). |
| [`scripts/start-members-portal.bat`](file:///e:/Programming/epicenter-app2/scripts/start-members-portal.bat) | **Members Portal Launcher** | Double-clickable batch wrapper for Members Portal (`DefaultPort: 4300`). |
| [`scripts/deploy-shortcuts.ps1`](file:///e:/Programming/epicenter-app2/scripts/deploy-shortcuts.ps1) | **Desktop Deployment** | Uses Windows Script Host (`WScript.Shell`) to generate/repair `.lnk` files on the user's desktop with appropriate `.ico` icons. |

---

## 3. Desktop Shortcuts Manifest

When deployed, the following two shortcuts reside on the Windows Desktop (`[Environment]::GetFolderPath("Desktop")`):

### 3.1 `Epicenter - Gym App.lnk`
- **Target**: `scripts\start-gym-app.bat`
- **Default Port**: `4200`
- **Icon Source**: `public\favicon.ico`
- **Browser Auto-Open**: Yes (`--open` flag passed to `ng serve`)
- **Working Directory**: Project root (`e:\Programming\epicenter-app2`)

### 3.2 `Epicenter - Members Portal.lnk`
- **Target**: `scripts\start-members-portal.bat`
- **Default Port**: `4300`
- **Icon Source**: `projects\members-portal\public\favicon.ico`
- **Browser Auto-Open**: Yes (`--open` flag passed to `ng serve members-portal`)
- **Working Directory**: Project root (`e:\Programming\epicenter-app2`)

---

## 4. How It Works (Step-by-Step Flow)

```
[User clicks Desktop Shortcut]
             │
             ▼
[.bat Wrapper launches run-app.ps1 with -App and -DefaultPort]
             │
             ▼
[find-available-port.ps1 attempts TcpListener on target port]
             │
     ┌───────┴───────┐
     │ Port is FREE? │
     └───────┬───────┘
            / \
       YES /   \ NO
          /     \
         ▼       ▼
[Use Default]   [Scan next sequential port (+1, +2, ...)]
         │       [Print red/green notice in console stating alternative port]
         │       │
         └───┬───┘
             ▼
[Launch `npx ng serve [app] --port <selectedPort> --open`]
             │
             ▼
[Browser opens automatically to http://localhost:<selectedPort>]
             │
             ▼
[To exit: User presses Ctrl+C or closes the console window]
```

---

## 5. Port Conflict & Dynamic Port Handling

If Port 4200 or 4300 is already in use by a background task, Docker, an existing dev server, or another service:
1. `find-available-port.ps1` catches the socket collision without crashing.
2. It tests subsequent ports (e.g., `4201`, `4202` or `4301`, `4302`).
3. `run-app.ps1` displays a prominent notification:
   ```text
   [NOTICE] Port 4200 is currently IN USE.
   [INFO] Automatically allocated alternative Port: 4201
   [INFO] Target Local URL: http://localhost:4201
   ```
4. The Angular CLI launches on that available port and automatically opens the browser at the newly selected port.

---

## 6. How AI Agents or Developers Can Re-Deploy Shortcuts

If the desktop shortcuts are ever deleted, moved, or a new developer machine is cloned, run the deployment command from the workspace root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-shortcuts.ps1
```

This will automatically create both `.lnk` files on the current user's desktop with their icons and paths correctly configured.

---

## 7. Direct Console Execution (Alternative)

If you prefer to run them via terminal without clicking the desktop:

- **Gym App**:
  ```powershell
  scripts\start-gym-app.bat
  ```
- **Members Portal**:
  ```powershell
  scripts\start-members-portal.bat
  ```
