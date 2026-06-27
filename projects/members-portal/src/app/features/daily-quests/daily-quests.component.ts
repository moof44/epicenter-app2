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

  // 4. Drink 2-3L water (Plant game)
  waterAmount = 0;
  isDraggingWaterCan = false;
  waterCanX = 125;
  waterCanY = 15;
  isPouring = false;
  droplets: { x: number; y: number; id: number }[] = [];
  private dropletIdCounter = 0;
  private waterInterval: any = null;

  // 5. Hit protein target (Barbell game)
  targetProtein = 60;
  currentProtein = 0;
  loadedPlatesLeft: number[] = [];
  loadedPlatesRight: number[] = [];
  isLifting = false;
  isLiftComplete = false;

  // Plate Drag state
  isDraggingPlate: number | null = null;
  plateDragStartX = 0;
  plateDragStartY = 0;
  plateDragX = 0;
  plateDragY = 0;

  // 6. Calorie Deficit (Scale game)
  leftPanWeight = 2000;
  rightPanWeight = 1500;
  scaleAngle = 25; // starts tilted (left heavy)
  placedWeights: number[] = [];
  isDraggingWeight: number | null = null;
  weightDragX = 0;
  weightDragY = 0;

  // 7. 3 Veggies/Fruits (Blender game)
  blenderIngredients: string[] = [];
  isBlending = false;
  smoothieFilled = false;
  glassColor = '';
  isDraggingIngredient: string | null = null;
  ingredientDragX = 0;
  ingredientDragY = 0;

  // 8. Zero Sugar (Smash sugar game)
  sugarTaps = 0;
  isShattered = false;
  particles: { x: number; y: number; vx: number; vy: number; alpha: number; size: number }[] = [];
  private particlesInterval: any = null;

  // 9. Sleep (Charge Body Battery)
  isDraggingPlug = false;
  plugX = 30;
  plugY = 120;
  isPluggedIn = false;
  batteryCharge = 10;
  private batteryInterval: any = null;

  // 10. No Screens (Power Down Screen)
  isDraggingLever = false;
  leverPos = 0;
  isScreenOff = false;

  // 11. Meditation (Float the Balloon)
  isBreathing = false;
  breathPhase: 'inhale' | 'hold' | 'exhale' = 'inhale';
  breathProgress = 0;
  meditationCycles = 0;
  balloonY = 0;
  private meditationInterval: any = null;

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
      } catch {
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
    } else if (questId === 'water_plant') {
      this.waterAmount = 0;
      this.waterCanX = 125;
      this.waterCanY = 15;
      this.isPouring = false;
      this.droplets = [];
    } else if (questId === 'protein_barbell') {
      this.currentProtein = 0;
      this.loadedPlatesLeft = [];
      this.loadedPlatesRight = [];
      this.isLifting = false;
      this.isLiftComplete = false;
      this.isDraggingPlate = null;
    } else if (questId === 'calorie_deficit') {
      this.leftPanWeight = 2000;
      this.rightPanWeight = 1500;
      this.scaleAngle = 25;
      this.placedWeights = [];
      this.isDraggingWeight = null;
    } else if (questId === 'veggies_fruits') {
      this.blenderIngredients = [];
      this.isBlending = false;
      this.smoothieFilled = false;
      this.glassColor = '';
      this.isDraggingIngredient = null;
    } else if (questId === 'zero_sugar') {
      this.sugarTaps = 0;
      this.isShattered = false;
      this.particles = [];
      if (this.particlesInterval) {
        clearInterval(this.particlesInterval);
        this.particlesInterval = null;
      }
    } else if (questId === 'sleep') {
      this.isDraggingPlug = false;
      this.plugX = 30;
      this.plugY = 120;
      this.isPluggedIn = false;
      this.batteryCharge = 10;
      if (this.batteryInterval) {
        clearInterval(this.batteryInterval);
        this.batteryInterval = null;
      }
    } else if (questId === 'no_screens') {
      this.isDraggingLever = false;
      this.leverPos = 0;
      this.isScreenOff = false;
    } else if (questId === 'meditation') {
      this.isBreathing = false;
      this.breathPhase = 'inhale';
      this.breathProgress = 0;
      this.meditationCycles = 0;
      this.balloonY = 0;
      if (this.meditationInterval) {
        clearInterval(this.meditationInterval);
        this.meditationInterval = null;
      }
    }
  }

  closeGame() {
    this.stopPouringParticles();
    if (this.particlesInterval) {
      clearInterval(this.particlesInterval);
      this.particlesInterval = null;
    }
    if (this.batteryInterval) {
      clearInterval(this.batteryInterval);
      this.batteryInterval = null;
    }
    if (this.meditationInterval) {
      clearInterval(this.meditationInterval);
      this.meditationInterval = null;
    }
    this.particles = [];
    this.activeGame = null;
    this.gameCompletedSuccess = false;
  }

  triggerSuccess() {
    this.gameCompletedSuccess = true;
    
    // Play a lightweight visual haptic buzz (confetti effect simulated via CSS or simple overlay trigger)
    this.vibrate([100, 30, 100]);
    
    // Force angular change detection for mobile browsers where async timeouts might drop Zone context
    if (this.cdr) {
      this.cdr.detectChanges();
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

  private vibrate(pattern: number | number[]) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore haptic failures (e.g. on iframe restrictions or desktop)
      }
    }
  }

  // --- Global Event Handlers for Dragging ---

  onGlobalMove(event: MouseEvent | TouchEvent) {
    if (this.isDraggingRunner) {
      this.handleRunnerMove(event);
    } else if (this.isDraggingJoint) {
      this.handleJointMove(event);
    } else if (this.isWipingFog) {
      this.handleFogWipe(event);
    } else if (this.isDraggingWaterCan) {
      this.handleWaterCanMove(event);
    } else if (this.isDraggingPlate) {
      this.handlePlateMove(event);
    } else if (this.isDraggingWeight) {
      this.handleWeightMove(event);
    } else if (this.isDraggingIngredient) {
      this.handleIngredientMove(event);
    } else if (this.isDraggingPlug) {
      this.handlePlugMove(event);
    } else if (this.isDraggingLever) {
      this.handleLeverMove(event);
    }
  }

  onGlobalUp() {
    this.isDraggingRunner = false;
    this.isDraggingJoint = false;
    this.isWipingFog = false;
    
    if (this.isDraggingWaterCan) {
      this.isDraggingWaterCan = false;
      this.isPouring = false;
      this.stopPouringParticles();
    }
    
    if (this.isDraggingPlate) {
      this.handlePlateRelease();
    }
    
    if (this.isDraggingWeight) {
      this.handleWeightRelease();
    }
    
    if (this.isDraggingIngredient) {
      this.handleIngredientRelease();
    }
    
    if (this.isDraggingPlug) {
      this.handlePlugRelease();
    }
    
    if (this.isDraggingLever) {
      this.handleLeverRelease();
    }
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
    const relativeX = ((clientX - rect.left) / (rect.width || 200)) * 200;
    const relativeY = ((clientY - rect.top) / (rect.height || 250)) * 250;
    
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
    
    // Calculate client offset position
    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;
    
    // Map client coordinates to the canvas internal resolution (280x200)
    const canvasX = (relativeX / (rect.width || 280)) * canvas.width;
    const canvasY = (relativeY / (rect.height || 200)) * canvas.height;
    
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, 22, 0, Math.PI * 2);
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

  // --- 4. Drink 2-3L water (Plant game helper methods) ---

  startWaterCanDrag(event: MouseEvent | TouchEvent) {
    if (this.gameCompletedSuccess) return;
    event.preventDefault();
    this.isDraggingWaterCan = true;
    
    const container = document.querySelector('.plant-stage-area') as HTMLElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    
    const clientX = this.getEventX(event);
    const clientY = this.getEventY(event);
    
    this.waterCanX = clientX - rect.left - 25; // 25 is half of 50px element width
    this.waterCanY = clientY - rect.top - 25;
  }

  private handleWaterCanMove(moveEvent: MouseEvent | TouchEvent) {
    if (moveEvent.cancelable) {
      moveEvent.preventDefault();
    }
    const container = document.querySelector('.plant-stage-area') as HTMLElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    
    const clientX = this.getEventX(moveEvent);
    const clientY = this.getEventY(moveEvent);
    
    // Clamp inside plant-stage-area boundaries (280x200)
    this.waterCanX = Math.max(0, Math.min(rect.width - 50, clientX - rect.left - 25));
    this.waterCanY = Math.max(0, Math.min(rect.height - 50, clientY - rect.top - 25));
    
    // Check if can is above the pot (X: 60 to 200)
    // The can itself is 50px wide. Its left edge is waterCanX.
    if (this.waterCanX >= 60 && this.waterCanX <= 200) {
      this.isPouring = true;
      this.startPouringParticles();
    } else {
      this.isPouring = false;
      this.stopPouringParticles();
    }
  }

  startPouringParticles() {
    if (this.waterInterval) return;
    
    this.waterInterval = setInterval(() => {
      // 1. Increment water amount
      if (this.waterAmount < 100) {
        this.waterAmount = Math.min(100, this.waterAmount + 1);
        
        // Trigger success at 100%
        if (this.waterAmount === 100 && !this.gameCompletedSuccess) {
          this.triggerSuccess();
          this.isPouring = false;
          this.stopPouringParticles();
        }
      }
      
      // 2. Generate droplets (nozzle is around top-left of the rotated watering can)
      const nozzleX = this.waterCanX + 10;
      const nozzleY = this.waterCanY + 25;
      
      if (this.waterAmount < 100) {
        this.droplets.push({
          x: nozzleX + (Math.random() * 14 - 7),
          y: nozzleY,
          id: this.dropletIdCounter++
        });
      }
      
      // 3. Update existing droplets (falling down)
      this.droplets = this.droplets
        .map(d => ({ ...d, y: d.y + 6 }))
        .filter(d => d.y < 175); // hit soil
        
    }, 50);
  }

  stopPouringParticles() {
    if (this.waterInterval) {
      clearInterval(this.waterInterval);
      this.waterInterval = null;
    }
  }

  // Plant SVG Getters for Morph/Scales
  get plantStemPath(): string {
    const pct = this.waterAmount;
    if (pct < 65) {
      const progress = pct / 65; // 0 to 1
      const bend = -45 * (1 - progress);
      const height = 45 * progress;
      const targetX = 140 + bend;
      const targetY = 175 - height;
      return `M 140,175 Q ${140 + bend / 2},${175 - height / 2} ${targetX},${targetY}`;
    } else {
      const progress = (pct - 65) / 35; // 0 to 1
      const height = 45 + 50 * progress;
      const targetY = 175 - height;
      return `M 140,175 Q 140,${175 - 45 / 2} 140,${targetY}`;
    }
  }

  get plantFlowerTransform(): string {
    if (this.waterAmount < 65) return 'translate(140px, 175px) scale(0)';
    const progress = (this.waterAmount - 65) / 35;
    const height = 45 + 50 * progress;
    const targetY = 175 - height;
    return `translate(140px, ${targetY}px) scale(${progress})`;
  }

  get leaf1Scale(): number {
    return Math.min(1, this.waterAmount / 50);
  }

  get leaf2Scale(): number {
    if (this.waterAmount < 50) return 0;
    return Math.min(1, (this.waterAmount - 50) / 30);
  }

  get leaf2Transform(): string {
    if (this.waterAmount < 50) return 'translate(140px, 175px) scale(0)';
    const pct = Math.min(65, this.waterAmount);
    const progress = pct / 65;
    const bend = -45 * (1 - progress);
    const height = 45 * progress;
    const leafX = 140 + bend;
    const leafY = 175 - height;
    return `translate(${leafX}px, ${leafY}px) scale(${this.leaf2Scale})`;
  }

  // --- 5. Hit protein target (Barbell game helper methods) ---

  startPlateDrag(event: MouseEvent | TouchEvent, weight: number) {
    if (this.gameCompletedSuccess || this.isLifting) return;
    event.preventDefault();
    this.isDraggingPlate = weight;
    this.updatePlateDragPos(event);
  }

  private handlePlateMove(moveEvent: MouseEvent | TouchEvent) {
    if (moveEvent.cancelable) {
      moveEvent.preventDefault();
    }
    this.updatePlateDragPos(moveEvent);
  }

  private updatePlateDragPos(event: MouseEvent | TouchEvent) {
    const container = document.querySelector('.barbell-game-container') as HTMLElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    
    const clientX = this.getEventX(event);
    const clientY = this.getEventY(event);
    
    this.plateDragX = clientX - rect.left;
    this.plateDragY = clientY - rect.top;
  }

  private handlePlateRelease() {
    if (!this.isDraggingPlate) return;
    
    const arena = document.querySelector('.barbell-arena') as HTMLElement;
    const container = document.querySelector('.barbell-game-container') as HTMLElement;
    
    if (arena && container) {
      const arenaRect = arena.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      const clientX = this.plateDragX + containerRect.left;
      const clientY = this.plateDragY + containerRect.top;
      
      // Check if dropped inside the barbell-arena bounds
      if (
        clientX >= arenaRect.left &&
        clientX <= arenaRect.right &&
        clientY >= arenaRect.top &&
        clientY <= arenaRect.bottom
      ) {
        // Did they drop it on the left or right half?
        const centerX = arenaRect.left + arenaRect.width / 2;
        if (clientX < centerX) {
          if (this.loadedPlatesLeft.length < 4) {
            this.loadedPlatesLeft.push(this.isDraggingPlate);
            this.currentProtein += this.isDraggingPlate;
          }
        } else {
          if (this.loadedPlatesRight.length < 4) {
            this.loadedPlatesRight.push(this.isDraggingPlate);
            this.currentProtein += this.isDraggingPlate;
          }
        }
      }
    }
    
    this.isDraggingPlate = null;
  }

  removePlate(side: 'left' | 'right', index: number) {
    if (this.isLifting || this.gameCompletedSuccess) return;
    if (side === 'left') {
      const removed = this.loadedPlatesLeft.splice(index, 1)[0];
      this.currentProtein -= removed;
    } else {
      const removed = this.loadedPlatesRight.splice(index, 1)[0];
      this.currentProtein -= removed;
    }
  }

  liftBarbell() {
    if (this.isLifting || this.currentProtein < this.targetProtein) return;
    this.isLifting = true;
    
    this.vibrate([150, 50, 150]);
    
    setTimeout(() => {
      this.isLiftComplete = true;
      this.triggerSuccess();
    }, 1800);
  }

  // --- 6. Calorie Deficit (Scale game) helper methods ---

  startWeightDrag(event: MouseEvent | TouchEvent, weight: number) {
    if (this.gameCompletedSuccess) return;
    event.preventDefault();
    this.isDraggingWeight = weight;
    this.updateWeightDragPos(event);
  }

  private handleWeightMove(event: MouseEvent | TouchEvent) {
    this.updateWeightDragPos(event);
  }

  private updateWeightDragPos(event: MouseEvent | TouchEvent) {
    const container = document.querySelector('.scales-game-container') as HTMLElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    this.weightDragX = this.getEventX(event) - rect.left;
    this.weightDragY = this.getEventY(event) - rect.top;
  }

  private handleWeightRelease() {
    if (!this.isDraggingWeight) return;
    const arena = document.querySelector('.scales-arena') as HTMLElement;
    const container = document.querySelector('.scales-game-container') as HTMLElement;
    if (arena && container) {
      const arenaRect = arena.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const clientX = this.weightDragX + containerRect.left;
      const clientY = this.weightDragY + containerRect.top;

      // Drop check anywhere inside the scales arena
      if (
        clientX >= arenaRect.left &&
        clientX <= arenaRect.right &&
        clientY >= arenaRect.top &&
        clientY <= arenaRect.bottom
      ) {
        const centerX = arenaRect.left + arenaRect.width / 2;
        // Drop on the right side of the arena snaps it to the right pan
        if (clientX > centerX) {
          this.placedWeights.push(this.isDraggingWeight);
          this.recalculateScale();
        }
      }
    }
    this.isDraggingWeight = null;
  }

  removeWeight(index: number) {
    if (this.gameCompletedSuccess) return;
    this.placedWeights.splice(index, 1);
    this.recalculateScale();
  }

  private recalculateScale() {
    const sum = this.placedWeights.reduce((a, b) => a + b, 0);
    this.rightPanWeight = 1500 + sum;
    
    // Scale balance angle. Max tilt is 25 degrees.
    // Balanced at 2000. Diff = left - right
    const diff = this.leftPanWeight - this.rightPanWeight;
    this.scaleAngle = Math.max(-25, Math.min(25, diff / 20));
    
    if (this.rightPanWeight === this.leftPanWeight) {
      this.triggerSuccess();
    }
    this.cdr.detectChanges();
  }

  // --- 7. 3 Veggies/Fruits (Blender game) helper methods ---

  startIngredientDrag(event: MouseEvent | TouchEvent, item: string) {
    if (this.gameCompletedSuccess || this.isBlending) return;
    event.preventDefault();
    this.isDraggingIngredient = item;
    this.updateIngredientDragPos(event);
  }

  private handleIngredientMove(event: MouseEvent | TouchEvent) {
    this.updateIngredientDragPos(event);
  }

  private updateIngredientDragPos(event: MouseEvent | TouchEvent) {
    const container = document.querySelector('.blender-game-container') as HTMLElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    this.ingredientDragX = this.getEventX(event) - rect.left;
    this.ingredientDragY = this.getEventY(event) - rect.top;
  }

  private handleIngredientRelease() {
    if (!this.isDraggingIngredient) return;
    const jar = document.querySelector('.blender-jar') as HTMLElement;
    const container = document.querySelector('.blender-game-container') as HTMLElement;
    if (jar && container) {
      const jarRect = jar.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const clientX = this.ingredientDragX + containerRect.left;
      const clientY = this.ingredientDragY + containerRect.top;

      if (
        clientX >= jarRect.left &&
        clientX <= jarRect.right &&
        clientY >= jarRect.top &&
        clientY <= jarRect.bottom
      ) {
        this.blenderIngredients.push(this.isDraggingIngredient);
      }
    }
    this.isDraggingIngredient = null;
    this.cdr.detectChanges();
  }

  startBlending() {
    if (this.isBlending || this.blenderIngredients.length < 3) return;
    this.isBlending = true;
    
    // Choose smoothie color based on ingredients
    const colors: Record<string, string> = {
      '🍓': 'linear-gradient(180deg, #f43f5e 0%, #be123c 100%)', // red
      '🍌': 'linear-gradient(180deg, #fef08a 0%, #eab308 100%)', // yellow/banana
      '🥬': 'linear-gradient(180deg, #4ade80 0%, #166534 100%)', // green/spinach
      '🥕': 'linear-gradient(180deg, #f97316 0%, #c2410c 100%)', // orange/carrot
      '🍎': 'linear-gradient(180deg, #ef4444 0%, #991b1b 100%)'  // apple/red
    };
    
    // Find the dominant color
    let primaryColor = colors['🥬'];
    for (const item of this.blenderIngredients) {
      if (colors[item]) {
        primaryColor = colors[item];
        break;
      }
    }
    this.glassColor = primaryColor;
    
    // Play light vibration
    this.vibrate([100, 50, 100, 50, 200]);
    
    // Blending animation duration 2.5s
    setTimeout(() => {
      this.isBlending = false;
      this.smoothieFilled = true;
      this.triggerSuccess();
      this.cdr.detectChanges();
    }, 2500);
    this.cdr.detectChanges();
  }

  // --- 8. Zero Sugar (Smash the Sugar) helper methods ---

  smashSugar(event: MouseEvent) {
    if (this.isShattered || this.gameCompletedSuccess) return;
    this.sugarTaps++;
    
    // Trigger vibration tap
    this.vibrate(30);
    
    // Trigger particle explosion shards
    const canvas = document.getElementById('sugarParticlesCanvas') as HTMLCanvasElement;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      this.spawnSugarParticles(x, y);
      this.initParticlesAnimation(false); // Start loop without shatter burst
    }

    if (this.sugarTaps >= 10) {
      this.isShattered = true;
      this.vibrate([100, 30, 250]);
      this.initParticlesAnimation(true); // Trigger full shatter burst
    }
    this.cdr.detectChanges();
  }

  spawnSugarParticles(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1, // slight upward bias
        alpha: 1.0,
        size: 2 + Math.random() * 4
      });
    }
  }

  initParticlesAnimation(triggerShatter = false) {
    const canvas = document.getElementById('sugarParticlesCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Setup canvas size
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== (rect.width || 280) || canvas.height !== (rect.height || 200)) {
      canvas.width = rect.width || 280;
      canvas.height = rect.height || 200;
    }
    
    // Explode sugar block on shatter
    if (triggerShatter) {
      for (let i = 0; i < 40; i++) {
        const px = canvas.width / 2 + (Math.random() * 40 - 20);
        const py = canvas.height / 2 + (Math.random() * 40 - 20);
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 6;
        this.particles.push({
          x: px,
          y: py,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          alpha: 1.0,
          size: 3 + Math.random() * 5
        });
      }
    }

    if (this.particlesInterval) return; // already running!

    this.particlesInterval = setInterval(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update & render particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.alpha -= 0.02; // fade
        
        if (p.alpha <= 0 || p.y > canvas.height) {
          this.particles.splice(i, 1);
          continue;
        }
        
        ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
        ctx.shadowBlur = 3;
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      
      // Clean up interval if no particles left
      if (this.particles.length === 0) {
        clearInterval(this.particlesInterval);
        this.particlesInterval = null;
      }
    }, 1000 / 60); // 60 FPS
  }

  claimShield() {
    if (this.gameCompletedSuccess) return;
    this.triggerSuccess();
  }

  // --- 9. Sleep (Charge Body Battery) helper methods ---

  startPlugDrag(event: MouseEvent | TouchEvent) {
    if (this.gameCompletedSuccess || this.isPluggedIn) return;
    event.preventDefault();
    this.isDraggingPlug = true;
    this.updatePlugDragPos(event);
  }

  private handlePlugMove(event: MouseEvent | TouchEvent) {
    this.updatePlugDragPos(event);
  }

  private updatePlugDragPos(event: MouseEvent | TouchEvent) {
    const arena = document.querySelector('.sleep-arena') as HTMLElement;
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    this.plugX = this.getEventX(event) - rect.left - 20;
    this.plugY = this.getEventY(event) - rect.top - 20;
  }

  private handlePlugRelease() {
    this.isDraggingPlug = false;
    
    const socket = document.querySelector('.wall-socket-box') as HTMLElement;
    const arena = document.querySelector('.sleep-arena') as HTMLElement;
    if (socket && arena) {
      const socketRect = socket.getBoundingClientRect();
      const arenaRect = arena.getBoundingClientRect();
      const currentX = this.plugX + arenaRect.left + 20;
      const currentY = this.plugY + arenaRect.top + 20;

      if (
        currentX >= socketRect.left - 25 &&
        currentX <= socketRect.right + 25 &&
        currentY >= socketRect.top - 25 &&
        currentY <= socketRect.bottom + 25
      ) {
        this.isPluggedIn = true;
        this.vibrate([100, 50, 100]);
        this.startChargingBattery();
      } else {
        this.plugX = 30;
        this.plugY = 120;
      }
    }
  }

  private startChargingBattery() {
    if (this.batteryInterval) clearInterval(this.batteryInterval);
    
    this.batteryInterval = setInterval(() => {
      if (this.batteryCharge < 100) {
        this.batteryCharge += 5;
        this.vibrate(30);
        this.cdr.detectChanges();
      } else {
        clearInterval(this.batteryInterval);
        this.batteryInterval = null;
        this.triggerSuccess();
        this.cdr.detectChanges();
      }
    }, 120);
  }

  // --- 10. No Screens (Power Down Screen) helper methods ---

  startLeverDrag(event: MouseEvent | TouchEvent) {
    if (this.gameCompletedSuccess || this.isScreenOff) return;
    event.preventDefault();
    this.isDraggingLever = true;
    this.updateLeverDragPos(event);
  }

  private handleLeverMove(event: MouseEvent | TouchEvent) {
    this.updateLeverDragPos(event);
  }

  private updateLeverDragPos(event: MouseEvent | TouchEvent) {
    const slot = document.querySelector('.lever-track-slot') as HTMLElement;
    if (!slot) return;
    const rect = slot.getBoundingClientRect();
    const currentY = this.getEventY(event) - rect.top;
    this.leverPos = Math.max(0, Math.min(60, currentY));
  }

  private handleLeverRelease() {
    this.isDraggingLever = false;
    
    if (this.leverPos >= 50) {
      this.leverPos = 60;
      this.isScreenOff = true;
      this.vibrate([50, 30, 80]);
      this.triggerSuccess();
    } else {
      this.leverPos = 0;
    }
    this.cdr.detectChanges();
  }

  // --- 11. Meditation (Float the Balloon) helper methods ---

  startInhale(event: MouseEvent | TouchEvent) {
    if (this.gameCompletedSuccess || this.isBreathing) return;
    event.preventDefault();
    this.isBreathing = true;
    this.breathPhase = 'inhale';
    this.breathProgress = 0;
    
    if (this.meditationInterval) clearInterval(this.meditationInterval);
    
    const releaseHandler = () => {
      this.stopInhale();
      window.removeEventListener('mouseup', releaseHandler);
      window.removeEventListener('touchend', releaseHandler);
    };
    window.addEventListener('mouseup', releaseHandler);
    window.addEventListener('touchend', releaseHandler);

    this.meditationInterval = setInterval(() => {
      if (this.breathPhase === 'inhale') {
        if (this.breathProgress < 100) {
          this.breathProgress += 4;
          this.vibrate(20);
          this.cdr.detectChanges();
        } else {
          this.breathPhase = 'hold';
          this.vibrate([80, 40]);
          this.cdr.detectChanges();
          
          setTimeout(() => {
            if (this.isBreathing && this.breathPhase === 'hold') {
              this.breathPhase = 'exhale';
              this.cdr.detectChanges();
            }
          }, 1200);
        }
      } else if (this.breathPhase === 'exhale') {
        if (this.breathProgress > 0) {
          this.breathProgress -= 4;
          this.cdr.detectChanges();
        } else {
          this.meditationCycles++;
          this.vibrate([100, 30, 100]);
          this.balloonY = this.meditationCycles * 40;
          this.cdr.detectChanges();
          
          if (this.meditationCycles >= 2) {
            clearInterval(this.meditationInterval);
            this.meditationInterval = null;
            this.isBreathing = false;
            this.balloonY = 150;
            
            setTimeout(() => {
              this.triggerSuccess();
              this.cdr.detectChanges();
            }, 500);
          } else {
            this.breathPhase = 'inhale';
          }
        }
      }
    }, 100);
  }

  private stopInhale() {
    if (!this.isBreathing || this.gameCompletedSuccess) return;
    
    if (this.breathPhase === 'inhale' || this.breathPhase === 'hold') {
      this.isBreathing = false;
      this.breathProgress = 0;
      this.breathPhase = 'inhale';
      if (this.meditationInterval) {
        clearInterval(this.meditationInterval);
        this.meditationInterval = null;
      }
      this.cdr.detectChanges();
    } else {
      this.isBreathing = false;
      this.cdr.detectChanges();
    }
  }
}
