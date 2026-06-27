import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-daily-quests',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './daily-quests.component.html',
  styleUrl: './daily-quests.component.css',
})
export class DailyQuestsComponent implements OnInit {
  isPledgeAccepted = false;
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  // Track open/closed state of categories
  expandedCategories: { [key: string]: boolean } = {
    activity: false,
    nutrition: false,
    recovery: false
  };

  completedQuests: { [key: string]: boolean } = {};
  activeGame: string | null = null;
  gameCompletedSuccess = false;

  // 1. Walk steps runner state
  runnerPos = 0;
  isDraggingRunner = false;
  private runnerDragStartX = 0;
  private baseRunnerPos = 0;
  maxTrackWidth = 240; // track boundary width - runner width

  // 2. Stretching joint state
  jointX = 135;
  jointY = 140;
  isDraggingJoint = false;
  showStretchLibrary = false;

  // 3. Outdoors fog wipe state
  isWipingFog = false;

  ngOnInit() {
    const pledgeStatus = localStorage.getItem('somatic_pledge_accepted');
    if (pledgeStatus === 'true') {
      this.isPledgeAccepted = true;
    }
    
    // Load completed quests
    const completedStr = localStorage.getItem('daily_quests_completed');
    if (completedStr) {
      try {
        this.completedQuests = JSON.parse(completedStr);
      } catch (e) {
        this.completedQuests = {};
      }
    }
  }

  acceptPledge() {
    this.isPledgeAccepted = true;
    localStorage.setItem('somatic_pledge_accepted', 'true');
  }

  toggleCategory(category: string) {
    this.expandedCategories[category] = !this.expandedCategories[category];
  }

  // --- Game Modal Handlers ---

  openGame(questId: string) {
    this.activeGame = questId;
    this.gameCompletedSuccess = false;
    
    // Reset specific game states
    if (questId === 'walk_steps') {
      this.runnerPos = 0;
    } else if (questId === 'stretching') {
      this.jointX = 135;
      this.jointY = 140;
      this.showStretchLibrary = false;
    } else if (questId === 'outdoors') {
      this.initFogCanvas();
    }
  }

  closeGame() {
    this.activeGame = null;
    this.gameCompletedSuccess = false;
  }

  triggerSuccess() {
    this.gameCompletedSuccess = true;
    
    // Play a lightweight visual haptic buzz (confetti effect simulated via CSS or simple overlay trigger)
    if (navigator.vibrate) {
      navigator.vibrate([100, 30, 100]);
    }
  }

  completeQuest(questId: string) {
    this.completedQuests[questId] = true;
    localStorage.setItem('daily_quests_completed', JSON.stringify(this.completedQuests));
    this.closeGame();
  }

  private getEventX(event: MouseEvent | TouchEvent): number {
    if ('touches' in event && event.touches && event.touches.length > 0) {
      return event.touches[0].clientX;
    }
    if ('changedTouches' in event && event.changedTouches && event.changedTouches.length > 0) {
      return event.changedTouches[0].clientX;
    }
    return (event as MouseEvent).clientX;
  }

  private getEventY(event: MouseEvent | TouchEvent): number {
    if ('touches' in event && event.touches && event.touches.length > 0) {
      return event.touches[0].clientY;
    }
    if ('changedTouches' in event && event.changedTouches && event.changedTouches.length > 0) {
      return event.changedTouches[0].clientY;
    }
    return (event as MouseEvent).clientY;
  }

  // --- Global Event Handlers for Dragging ---

  onGlobalMove(event: MouseEvent | TouchEvent) {
    if (this.isDraggingRunner) {
      this.handleRunnerMove(event);
    } else if (this.isDraggingJoint) {
      this.handleJointMove(event);
    } else if (this.isWipingFog) {
      this.handleFogWipe(event);
    }
  }

  onGlobalUp() {
    this.isDraggingRunner = false;
    this.isDraggingJoint = false;
    this.isWipingFog = false;
  }

  // --- 1. Walk 8,000 steps (Runner drag) ---

  startRunnerDrag(event: MouseEvent | TouchEvent) {
    if (this.gameCompletedSuccess) return;
    event.preventDefault();
    this.isDraggingRunner = true;
    
    this.runnerDragStartX = this.getEventX(event);
    this.baseRunnerPos = this.runnerPos;
  }

  private handleRunnerMove(moveEvent: MouseEvent | TouchEvent) {
    if (moveEvent.cancelable) {
      moveEvent.preventDefault();
    }
    
    const trackEl = document.querySelector('.running-track') as HTMLElement;
    if (!trackEl) return;
    const rect = trackEl.getBoundingClientRect();
    
    const currentX = this.getEventX(moveEvent);
    
    // Calculate the delta movement in pixels and convert to a percentage of the track
    const deltaX = currentX - this.runnerDragStartX;
    const pctDelta = (deltaX / (rect.width || 240)) * 100;
    
    // Update the percentage position based on where it started, clamped 0% to 90%
    this.runnerPos = Math.max(0, Math.min(90, this.baseRunnerPos + pctDelta));
    
    // Target is 80% of track (where ribbon visually breaks)
    if (this.runnerPos >= 80 && !this.gameCompletedSuccess) {
      this.triggerSuccess();
      // Allow runner to visually continue to 90
      if (this.runnerPos >= 90) {
        this.runnerPos = 90;
      }
    }
  }

  // --- 2. 15 min Stretching (SVG Joint snap) ---

  startJointDrag(event: MouseEvent | TouchEvent) {
    if (this.gameCompletedSuccess) return;
    event.preventDefault();
    this.isDraggingJoint = true;
  }

  private handleJointMove(moveEvent: MouseEvent | TouchEvent) {
    if (moveEvent.cancelable) {
      moveEvent.preventDefault();
    }
    
    const svgEl = document.querySelector('.stretching-svg') as SVGElement;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    
    const clientX = this.getEventX(moveEvent);
    const clientY = this.getEventY(moveEvent);
    
    // Convert screen pixels to 200x250 SVG viewport viewBox coordinates
    let relativeX = ((clientX - rect.left) / (rect.width || 200)) * 200;
    let relativeY = ((clientY - rect.top) / (rect.height || 250)) * 250;
    
    this.jointX = Math.max(10, Math.min(190, relativeX));
    this.jointY = Math.max(10, Math.min(240, relativeY));
    
    // Target correct pose joint is at cx="150" cy="30"
    const dx = this.jointX - 150;
    const dy = this.jointY - 30;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist <= 18 && !this.gameCompletedSuccess) {
      this.jointX = 150;
      this.jointY = 30;
      this.triggerSuccess();
    }
  }

  // --- 3. 30 min Outdoors (Canvas fog wiping) ---

  initFogCanvas() {
    setTimeout(() => {
      const canvas = document.getElementById('fogCanvas') as HTMLCanvasElement;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Fill canvas with fog color
      ctx.fillStyle = '#334155'; // Slate-700
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add text guides
      ctx.fillStyle = '#94a3b8'; // Slate-400
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Rub to wipe the fog away ☁️', canvas.width / 2, canvas.height / 2);
    }, 80);
  }

  startFogWipe(event: MouseEvent | TouchEvent) {
    if (this.gameCompletedSuccess) return;
    event.preventDefault();
    this.isWipingFog = true;
  }

  private handleFogWipe(moveEvent: MouseEvent | TouchEvent) {
    if (moveEvent.cancelable) {
      moveEvent.preventDefault();
    }
    
    const canvas = document.getElementById('fogCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    
    const clientX = this.getEventX(moveEvent);
    const clientY = this.getEventY(moveEvent);
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    
    this.checkFogCleared(canvas, ctx);
  }

  private checkFogCleared(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imgData.data;
    let transparentCount = 0;
    
    // Check pixel alpha channel values (every 32nd pixel to save performance)
    for (let i = 3; i < pixels.length; i += 32) {
      if (pixels[i] === 0) {
        transparentCount++;
      }
    }
    
    const totalCheckPixels = pixels.length / 32;
    const clearedRatio = transparentCount / totalCheckPixels;
    
    if (clearedRatio >= 0.7 && !this.gameCompletedSuccess) {
      this.triggerSuccess();
      canvas.style.transition = 'opacity 0.8s ease-out';
      canvas.style.opacity = '0';
    }
  }
}
