import { Component, inject, signal, computed, effect, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth/auth.service';
import { DashboardService } from '../core/services/dashboard.service';
import { EXERCISE_LIBRARY, LibraryExercise } from '../core/utils/exercise-database';

interface WorkoutSet {
  setNumber: number;
  weight: number; // kg
  reps: number;
  completed: boolean;
}

interface Exercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
}

interface CompletedWorkout {
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalVolumeKg: number;
  exercises: {
    name: string;
    sets: {
      setNumber: number;
      weight: number;
      reps: number;
      completed: boolean;
      isPR?: boolean;
    }[];
  }[];
}

@Component({
  selector: 'app-workout-notebook',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen text-text-primary py-4 px-2 sm:px-6 select-none animate-fade-in pb-32">
      
      <!-- Success Celebration Overlay -->
      <div *ngIf="showSuccessOverlay()" class="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 text-center animate-fade-in">
        <div class="max-w-md w-full card-surface border-gold-primary/30 gold-glow flex flex-col items-center gap-6 p-8 relative overflow-hidden bg-bg-surface">
          <!-- Background pulse glows -->
          <div class="absolute -top-24 -left-24 w-48 h-48 bg-gold-primary/10 rounded-full blur-3xl"></div>
          <div class="absolute -bottom-24 -right-24 w-48 h-48 bg-gold-primary/10 rounded-full blur-3xl"></div>

          <span class="text-6xl animate-bounce">👑</span>
          <h2 class="text-3xl font-black font-oswald text-gold-light uppercase tracking-wide">Workout Complete!</h2>
          <p class="text-xs text-text-secondary -mt-2">Excellent session! Your training has been synced to the cloud.</p>
          
          <!-- Stats Row -->
          <div class="grid grid-cols-2 gap-4 w-full bg-bg-surface-alt/50 p-4 rounded-2xl border border-bg-surface-alt">
            <div class="flex flex-col items-center">
              <span class="text-[10px] text-text-muted font-bold uppercase tracking-wider">Total Volume</span>
              <span class="text-lg font-black text-gold-primary font-oswald">{{ totalVolume() }} kg</span>
            </div>
            <div class="flex flex-col items-center">
              <span class="text-[10px] text-text-muted font-bold uppercase tracking-wider">Duration</span>
              <span class="text-lg font-black text-white font-oswald">{{ elapsedTime() }}</span>
            </div>
          </div>

          <!-- PRs Achieved Section -->
          <div class="w-full flex flex-col gap-2.5 text-left">
            <h3 class="text-xs font-bold font-oswald text-gold-primary uppercase tracking-wider border-b border-bg-surface-alt pb-1.5 flex items-center justify-between">
              <span>🏆 Personal Records Set</span>
              <span class="bg-gold-dim text-gold-primary text-[10px] px-2 py-0.5 rounded-full font-bold font-inter">
                {{ achievedPRs().length }}
              </span>
            </h3>
            
            <div class="max-h-48 overflow-y-auto pr-1 flex flex-col gap-1.5 scrollbar-custom">
              @if (achievedPRs().length === 0) {
                <p class="text-xs text-text-muted italic py-2 text-center">No personal bests beaten today, but consistency is key!</p>
              } @else {
                @for (pr of achievedPRs(); track pr.name) {
                  <div class="flex items-center justify-between bg-gold-dim/10 border border-gold-primary/20 rounded-xl p-2.5">
                    <div class="flex items-center gap-2">
                      <span class="text-sm">{{ pr.emoji }}</span>
                      <span class="text-xs font-bold text-white uppercase font-oswald">{{ pr.name }}</span>
                    </div>
                    <span class="text-xs font-bold text-gold-light font-oswald">{{ pr.weight }} kg x {{ pr.reps }}</span>
                  </div>
                }
              }
            </div>
          </div>

          <button (click)="closeSuccessOverlay()" class="w-full btn-primary font-bold text-sm tracking-wider uppercase mt-4">
            Done
          </button>
        </div>
      </div>

      <!-- Naming / Confirm Finish Modal -->
      <div *ngIf="showFinishModal()" class="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4 animate-fade-in">
        <div class="max-w-sm w-full card-surface border-bg-surface-alt flex flex-col gap-5 p-6 bg-bg-surface">
          <div>
            <h3 class="text-lg font-bold font-oswald text-gold-primary uppercase tracking-wider">Finish Workout</h3>
            <p class="text-xs text-text-secondary mt-1">Ready to log this workout? Give it a name to sync with your fitness history.</p>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="workout-name" class="text-[9px] text-text-secondary font-bold uppercase tracking-wider">Workout Name</label>
            <input 
              id="workout-name"
              type="text" 
              [(ngModel)]="workoutNameInput" 
              placeholder="e.g. Leg Day Power"
              class="w-full h-10 px-3 rounded-xl bg-bg-surface-alt border border-bg-surface-alt text-text-primary focus:border-gold-primary focus:outline-none text-xs transition-colors"
            />
          </div>

          <div class="flex gap-3">
            <button (click)="showFinishModal.set(false)" class="flex-1 btn-secondary text-xs uppercase font-bold tracking-wider">
              Cancel
            </button>
            <button (click)="submitCompletedWorkout()" [disabled]="isSaving()" class="flex-1 btn-primary text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-1">
              <span *ngIf="isSaving()" class="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Top Header & Stats -->
      <div class="flex flex-col gap-4 border-b border-bg-surface-alt pb-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-black font-oswald text-gold-primary tracking-wide uppercase">Daily Workout Log</h1>
            <p class="text-xs text-text-secondary mt-0.5">Track your independent workouts. Saved locally on your phone.</p>
          </div>
          <div class="flex items-center gap-2">
            <button 
              (click)="showTemplatesPanel.update(v => !v)"
              class="px-4 py-2 border border-bg-surface-alt bg-bg-surface text-text-primary text-xs font-bold font-oswald uppercase tracking-wider rounded-xl transition-all hover:bg-bg-surface-alt"
            >
              📂 Templates
            </button>
            <button 
              *ngIf="exercises().length > 0"
              (click)="clearRoutine()"
              class="px-4 py-2 border border-red-900/60 bg-red-950/20 text-red-400 text-xs font-bold font-oswald uppercase tracking-wider rounded-xl active:scale-95 transition-all hover:bg-red-950/40"
            >
              Clear
            </button>
          </div>
        </div>

        <!-- Live Performance Stats Widget -->
        <div class="grid grid-cols-3 gap-2.5 sm:gap-4 mt-2">
          <!-- Volume -->
          <div class="bg-bg-surface border border-bg-surface-alt rounded-2xl p-3 flex flex-col items-center justify-center text-center">
            <span class="text-[9px] text-text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
              🏋️‍♂️ Volume
            </span>
            <span class="text-sm sm:text-base font-black text-gold-primary font-oswald mt-1">
              {{ totalVolume() }} <span class="text-[10px] text-text-muted font-normal font-sans">kg</span>
            </span>
          </div>

          <!-- Time -->
          <div class="bg-bg-surface border border-bg-surface-alt rounded-2xl p-3 flex flex-col items-center justify-center text-center">
            <span class="text-[9px] text-text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
              ⏱️ Duration
            </span>
            <span class="text-sm sm:text-base font-black text-white font-oswald mt-1">
              {{ elapsedTime() }}
            </span>
          </div>

          <!-- Progress / Sets -->
          <div class="bg-bg-surface border border-bg-surface-alt rounded-2xl p-3 flex flex-col items-center justify-center text-center">
            <span class="text-[9px] text-text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
              ✅ Progress
            </span>
            <span class="text-sm sm:text-base font-black text-emerald-400 font-oswald mt-1">
              {{ completedSetsCount() }}/{{ totalSetsCount() }} <span class="text-[10px] text-text-muted font-normal font-sans">sets</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Templates Management Drawer/Panel -->
      <div *ngIf="showTemplatesPanel()" class="card-surface mt-4 border-gold-primary/20 flex flex-col gap-4 animate-fade-in bg-bg-surface-alt/25">
        <div class="flex justify-between items-center border-b border-bg-surface-alt pb-2">
          <h3 class="text-sm font-bold font-oswald text-gold-light uppercase tracking-wider">Routine Templates</h3>
          <button (click)="showTemplatesPanel.set(false)" class="text-[10px] font-bold text-text-secondary hover:text-white uppercase font-oswald tracking-wider">
            Close
          </button>
        </div>

        <!-- Save Current Workout as Template -->
        <div class="flex flex-col gap-2">
          <label class="text-[9px] text-text-secondary font-bold uppercase tracking-wider">Save Current Routine as Template</label>
          <div class="flex gap-2">
            <input 
              type="text" 
              [(ngModel)]="newTemplateName" 
              placeholder="Template Name, e.g. Chest/Tricep Hypertrophy"
              class="flex-1 h-9 px-3 rounded-xl bg-bg-surface border border-bg-surface-alt text-text-primary text-xs focus:border-gold-primary focus:outline-none"
            />
            <button 
              (click)="saveActiveAsTemplate()" 
              [disabled]="exercises().length === 0"
              class="h-9 btn-primary text-xs px-4 uppercase font-bold tracking-wider rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </div>

        <!-- Load Existing Templates -->
        <div class="flex flex-col gap-2 mt-2">
          <label class="text-[9px] text-text-secondary font-bold uppercase tracking-wider">My Saved Templates ({{ templates().length }})</label>
          <div class="flex flex-col gap-1.5 max-h-40 overflow-y-auto scrollbar-custom">
            @if (templates().length === 0) {
              <p class="text-xs text-text-muted italic py-1">No templates saved yet. Create a routine and save it above!</p>
            } @else {
              @for (tpl of templates(); track tpl.id) {
                <div 
                  (click)="loadTemplateById(tpl.id)"
                  class="flex justify-between items-center bg-bg-surface border border-bg-surface-alt rounded-xl p-2.5 cursor-pointer hover:border-gold-primary/30 transition-all animate-fade-in"
                >
                  <div class="flex flex-col">
                    <span class="text-xs font-bold text-white uppercase font-oswald">{{ tpl.name }}</span>
                    <span class="text-[9px] text-text-secondary mt-0.5">{{ tpl.exercises.length }} exercises</span>
                  </div>
                  <button 
                    (click)="deleteTemplate(tpl.id, $event)"
                    class="w-7 h-7 flex items-center justify-center rounded-lg border border-red-900/30 bg-red-950/20 text-red-400 text-xs hover:bg-red-950/50 transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              }
            }
          </div>
        </div>
      </div>

      <!-- Add Exercise Form -->
      <div class="card-surface mt-6 flex flex-col gap-4 relative bg-bg-surface">
        <h2 class="text-sm font-bold font-oswald text-gold-light uppercase tracking-wider">Add Exercise</h2>
        
        <form (submit)="addExercise()" class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <!-- Exercise Name with Autocomplete dropdown (focusout wrapper) -->
          <div class="flex flex-col gap-1.5 sm:col-span-2 relative" (focusout)="onFocusOut($event)">
            <label for="ex-name" class="text-[9px] text-text-secondary font-bold uppercase tracking-wider font-inter">Exercise Name</label>
            <input 
              id="ex-name"
              type="text" 
              [ngModel]="newExName()" 
              (ngModelChange)="newExName.set($event)" 
              (focus)="showAutocomplete.set(true)"
              name="newExName" 
              placeholder="Search exercise library or type custom..." 
              required
              autocomplete="off"
              class="w-full h-10 px-3 rounded-xl bg-bg-surface-alt border border-bg-surface-alt text-text-primary placeholder-text-muted focus:border-gold-primary focus:outline-none text-xs transition-colors"
            />

            <!-- Autocomplete Suggestions List -->
            <div 
              *ngIf="showAutocomplete() && filteredExercises().length > 0" 
              class="autocomplete-dropdown absolute left-0 right-0 top-full mt-1.5 z-30 bg-bg-surface border border-bg-surface-alt rounded-2xl shadow-2xl max-h-56 overflow-y-auto p-1.5 flex flex-col gap-1 gold-glow border-gold-primary/20 scrollbar-custom"
            >
              @for (ex of filteredExercises(); track ex.name) {
                <button 
                  type="button"
                  (mousedown)="selectExerciseFromLibrary(ex)"
                  (click)="selectExerciseFromLibrary(ex)"
                  class="w-full flex items-center justify-between p-2 hover:bg-bg-surface-alt rounded-xl text-left transition-colors"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-sm">{{ ex.emoji }}</span>
                    <span class="text-xs font-bold text-white font-inter">{{ ex.name }}</span>
                  </div>
                  <span class="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-inter" [ngClass]="getCategoryClass(ex.category)">
                    {{ ex.category }}
                  </span>
                </button>
              }
            </div>
          </div>

          <!-- Sets Count -->
          <div class="flex flex-col gap-1.5">
            <label for="ex-sets" class="text-[9px] text-text-secondary font-bold uppercase tracking-wider font-inter">Sets</label>
            <input 
              id="ex-sets"
              type="number" 
              [(ngModel)]="newExSets" 
              name="newExSets" 
              min="1" 
              max="20"
              required
              class="w-full h-10 px-3 rounded-xl bg-bg-surface-alt border border-bg-surface-alt text-text-primary focus:border-gold-primary focus:outline-none text-xs transition-colors font-bold font-inter"
            />
          </div>

          <button 
            type="submit" 
            class="h-10 btn-primary font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5"
          >
            <span>Add Exercise</span>
          </button>
        </form>
      </div>

      <!-- Exercises Routine List -->
      @if (exercises().length === 0) {
        <div class="card-surface mt-6 flex flex-col items-center justify-center py-16 text-center text-text-secondary gap-3 bg-bg-surface-alt/10 border-dashed border-bg-surface-alt">
          <span class="text-4xl">🏋️‍♂️</span>
          <span class="text-sm font-bold uppercase tracking-wider text-gold-light">Your Workout is Empty</span>
          <p class="text-xs text-text-secondary max-w-sm mt-1 font-inter">
            Add exercises above to start logging your sets, reps, and weights. Keep track of your workout on the gym floor!
          </p>
        </div>
      } @else {
        
        <div class="flex flex-col gap-4 mt-6">
          @for (ex of exercises(); track ex.id; let exIdx = $index) {
            <div class="card-surface flex flex-col gap-4 border border-bg-surface-alt/60 hover:border-gold-primary/20 transition-all relative overflow-hidden bg-bg-surface">
              
              <!-- Exercise Header -->
              <div class="flex justify-between items-center border-b border-bg-surface-alt pb-3">
                <div class="flex items-center gap-2.5">
                  <span class="w-6 h-6 rounded-full bg-gold-dim border border-gold-primary/30 flex items-center justify-center text-xs font-bold text-gold-primary font-oswald">
                    {{ exIdx + 1 }}
                  </span>
                  <div class="flex flex-col">
                    <div class="flex items-center gap-1.5">
                      <span class="text-sm font-bold font-oswald uppercase tracking-wide text-text-primary">
                        {{ getExerciseMeta(ex.name).emoji }} {{ ex.name }}
                      </span>
                      <span class="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-inter" [ngClass]="getCategoryClass(getExerciseMeta(ex.name).category)">
                        {{ getExerciseMeta(ex.name).category }}
                      </span>
                    </div>
                  </div>
                </div>
                
                <button 
                  (click)="removeExercise(ex.id)"
                  class="text-[10px] font-bold text-text-secondary hover:text-red-400 font-oswald uppercase tracking-wider transition-colors"
                >
                  Remove
                </button>
              </div>

              <!-- Sets Logs Row -->
              <div class="flex flex-col gap-2">
                
                <!-- Set Columns Header -->
                <div class="grid grid-cols-4 text-[9px] text-text-secondary font-bold uppercase tracking-wider px-2 font-inter">
                  <span>Set</span>
                  <span>Weight (kg)</span>
                  <span>Reps</span>
                  <span class="text-right">Completed</span>
                </div>

                <!-- Set Logs List -->
                @for (set of ex.sets; track set.setNumber; let setIdx = $index) {
                  <div 
                    [class.bg-emerald-950/10]="set.completed"
                    [class.border-emerald-900/30]="set.completed"
                    class="grid grid-cols-4 items-center bg-bg-surface-alt/30 border border-bg-surface-alt/25 rounded-xl p-2 transition-all hover:bg-bg-surface-alt/55"
                  >
                    <div class="flex items-center gap-1 text-xs font-bold text-text-secondary px-2 font-inter">
                      <span>#{{ set.setNumber }}</span>
                      <span 
                        *ngIf="set.completed && isPersonalRecord(ex.name, set.weight, set.reps)"
                        class="text-xs animate-pulse text-gold-light" 
                        title="Personal Record! 👑"
                      >
                        👑
                      </span>
                    </div>
                    
                    <!-- Weight Input -->
                    <div class="flex items-center gap-1">
                      <input 
                        type="number" 
                        [(ngModel)]="set.weight"
                        (ngModelChange)="saveRoutine()"
                        min="0"
                        placeholder="0"
                        class="w-14 h-8 px-2 rounded-lg bg-bg-surface border border-bg-surface-alt text-text-primary focus:border-gold-primary focus:outline-none text-xs transition-colors font-bold font-inter"
                      />
                    </div>

                    <!-- Reps Input -->
                    <div class="flex items-center gap-1">
                      <input 
                        type="number" 
                        [(ngModel)]="set.reps"
                        (ngModelChange)="saveRoutine()"
                        min="0"
                        placeholder="0"
                        class="w-14 h-8 px-2 rounded-lg bg-bg-surface border border-bg-surface-alt text-text-primary focus:border-gold-primary focus:outline-none text-xs transition-colors font-bold font-inter"
                      />
                    </div>

                    <!-- Tick Checkbox -->
                    <div class="flex justify-end px-2">
                      <button 
                        (click)="toggleSetCompletion(ex.id, set.setNumber)"
                        [class.bg-emerald-500]="set.completed"
                        [class.border-emerald-400]="set.completed"
                        [class.text-black]="set.completed"
                        [class.bg-bg-surface-alt]="!set.completed"
                        [class.border-bg-surface-alt]="!set.completed"
                        [class.text-transparent]="!set.completed"
                        class="w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-black transition-all active:scale-90"
                      >
                        ✓
                      </button>
                    </div>

                  </div>
                }

                <!-- Add/Remove Set Buttons inside card -->
                <div class="flex items-center gap-2 justify-end mt-2 pt-2 border-t border-bg-surface-alt/50">
                  <button 
                    (click)="removeSetFromExercise(ex.id)"
                    [disabled]="ex.sets.length <= 1"
                    class="px-2.5 py-1 text-[9px] font-bold text-red-400 border border-red-950/20 bg-red-950/10 rounded-lg hover:bg-red-950/30 transition-all uppercase tracking-wider font-oswald disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    - Set
                  </button>
                  <button 
                    (click)="addSetToExercise(ex.id)"
                    class="px-2.5 py-1 text-[9px] font-bold text-emerald-400 border border-emerald-950/20 bg-emerald-950/10 rounded-lg hover:bg-emerald-950/30 transition-all uppercase tracking-wider font-oswald"
                  >
                    + Set
                  </button>
                </div>

              </div>

            </div>
          }
        </div>

        <!-- Finish Workout Button -->
        <div class="mt-8 flex justify-center pb-8">
          <button 
            (click)="openFinishWorkoutModal()"
            [disabled]="completedSetsCount() === 0"
            class="w-full sm:w-80 btn-primary py-3 uppercase tracking-wider font-bold text-sm h-12 flex items-center justify-center gap-1.5 shadow-xl gold-glow border-gold-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            🏁 Finish Workout
          </button>
        </div>

      }

      <!-- Rest Timer Floating Overlay Widget -->
      <div 
        *ngIf="restTimerActive()" 
        class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-30 card-surface border-gold-primary/30 gold-glow p-4 animate-slide-up flex flex-col gap-3 bg-bg-surface"
      >
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-1.5">
            <span class="animate-spin text-gold-primary text-xs">⌛</span>
            <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider font-inter">Rest Timer</span>
          </div>
          <span class="text-[10px] text-text-muted font-bold font-inter">
            Default: {{ restTimeTotal() }}s
          </span>
        </div>

        <!-- Time Digits -->
        <div class="flex items-center justify-between">
          <span class="text-3xl font-black text-white font-oswald tracking-wide flex items-baseline">
            {{ restTimeRemaining() }} <span class="text-xs text-text-secondary ml-1 font-sans font-normal">seconds left</span>
          </span>
          
          <!-- Quick Adjust Duration controls -->
          <div class="flex items-center gap-1">
            <button 
              (click)="adjustDefaultRestTime(-10)"
              class="w-7 h-7 flex items-center justify-center bg-bg-surface-alt border border-bg-surface-alt hover:border-gold-primary/20 text-[10px] text-white font-bold rounded-lg transition-colors"
              title="-10s from rest interval"
            >
              -10
            </button>
            <button 
              (click)="adjustDefaultRestTime(10)"
              class="w-7 h-7 flex items-center justify-center bg-bg-surface-alt border border-bg-surface-alt hover:border-gold-primary/20 text-[10px] text-white font-bold rounded-lg transition-colors"
              title="+10s to rest interval"
            >
              +10
            </button>
          </div>
        </div>

        <!-- Timer Linear Progress Bar -->
        <div class="progress-bar-track">
          <div 
            class="progress-bar-fill"
            [style.width.%]="(restTimeRemaining() / restTimeTotal()) * 100"
          ></div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2">
          <button 
            (click)="stopRestTimer()" 
            class="flex-1 h-8 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 text-red-400 text-[10px] font-bold font-oswald uppercase tracking-wider rounded-lg transition-colors"
          >
            Skip Rest
          </button>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .animate-slide-up {
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Scrollbar Styling */
    .scrollbar-custom::-webkit-scrollbar {
      width: 4px;
    }
    .scrollbar-custom::-webkit-scrollbar-track {
      background: transparent;
    }
    .scrollbar-custom::-webkit-scrollbar-thumb {
      background: var(--bg-surface-alt);
      border-radius: 9999px;
    }
    .scrollbar-custom::-webkit-scrollbar-thumb:hover {
      background: var(--gold-dim);
    }

    /* Category Badges Styling */
    .cat-chest { background-color: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }
    .cat-back { background-color: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); }
    .cat-legs { background-color: rgba(139, 92, 246, 0.1); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.2); }
    .cat-shoulders { background-color: rgba(245, 158, 11, 0.1); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.2); }
    .cat-arms { background-color: rgba(6, 182, 212, 0.1); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.2); }
    .cat-core { background-color: rgba(236, 72, 153, 0.1); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.2); }
    .cat-custom { background-color: rgba(113, 113, 122, 0.1); color: #a1a1aa; border: 1px solid rgba(113, 113, 122, 0.2); }

    .progress-bar-track {
      width: 100%;
      height: 6px;
      background-color: var(--bg-surface-alt);
      border-radius: 9999px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(to right, var(--gold-primary), var(--gold-light));
      transition: width 1s linear;
    }
  `]
})
export class WorkoutNotebookComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);

  readonly exercises = signal<Exercise[]>([]);
  readonly templates = signal<{ id: string; name: string; exercises: Exercise[] }[]>([]);

  // Add Form Inputs
  newExName = signal('');
  newExSets = 4;
  showAutocomplete = signal<boolean>(false);

  // Time & Volume trackers
  elapsedTime = signal<string>('00:00');
  private elapsedTimeIntervalId: any;

  // Rest Timer state
  restTimeTotal = signal<number>(90);
  restTimeRemaining = signal<number>(90);
  restTimerActive = signal<boolean>(false);
  private restIntervalId: any;

  // Templates Management Drawer
  showTemplatesPanel = signal<boolean>(false);
  newTemplateName = '';

  // Finish Workout modals
  showFinishModal = signal<boolean>(false);
  workoutNameInput = '';
  isSaving = signal<boolean>(false);
  showSuccessOverlay = signal<boolean>(false);
  achievedPRs = signal<{ name: string; weight: number; reps: number; emoji: string }[]>([]);

  // Key selectors for member storage keys in localStorage
  private get startTimeStorageKey(): string {
    const memberId = this.authService.memberProfile()?.memberId || 'guest';
    return `epicenter_workout_start_${memberId}`;
  }

  private get storageKey(): string {
    const memberId = this.authService.memberProfile()?.memberId || 'guest';
    return `epicenter_workout_${memberId}`;
  }

  private get templatesStorageKey(): string {
    const memberId = this.authService.memberProfile()?.memberId || 'guest';
    return `epicenter_workout_templates_${memberId}`;
  }

  // Computed fields
  readonly totalVolume = computed(() => {
    let vol = 0;
    for (const ex of this.exercises()) {
      for (const s of ex.sets) {
        if (s.completed) {
          vol += (s.weight || 0) * (s.reps || 0);
        }
      }
    }
    return vol;
  });

  readonly totalSetsCount = computed(() => {
    let count = 0;
    for (const ex of this.exercises()) {
      count += ex.sets.length;
    }
    return count;
  });

  readonly completedSetsCount = computed(() => {
    let count = 0;
    for (const ex of this.exercises()) {
      for (const s of ex.sets) {
        if (s.completed) {
          count++;
        }
      }
    }
    return count;
  });

  readonly filteredExercises = computed(() => {
    const query = this.newExName().trim().toLowerCase();
    if (!query) {
      // Show popular compound movements by default when input is focused but empty
      return [
        { name: 'Barbell Bench Press', category: 'Chest', emoji: '💪' },
        { name: 'Barbell Back Squat', category: 'Legs', emoji: '🏋️' },
        { name: 'Lat Pulldown', category: 'Back', emoji: '⬇️' },
        { name: 'Barbell Overhead Press', category: 'Shoulders', emoji: '🏋️' },
        { name: 'Dumbbell Bicep Curl', category: 'Arms', emoji: '💪' },
        { name: 'Cable Tricep Pushdown (Rope)', category: 'Arms', emoji: '🪢' },
        { name: 'Plank', category: 'Core', emoji: '🧱' },
        { name: 'Barbell Romanian Deadlift', category: 'Legs', emoji: '💀' }
      ] as LibraryExercise[];
    }
    return EXERCISE_LIBRARY.filter(ex => 
      ex.name.toLowerCase().includes(query) || 
      ex.category.toLowerCase().includes(query)
    ).slice(0, 8);
  });

  constructor() {
    // Automatically load data when profile resolved
    effect(() => {
      const memberId = this.authService.memberProfile()?.memberId;
      if (memberId) {
        this.loadRoutine();
        this.loadTemplates();
        this.startElapsedTimeTimer();
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    this.startElapsedTimeTimer();
  }

  ngOnDestroy() {
    if (this.elapsedTimeIntervalId) clearInterval(this.elapsedTimeIntervalId);
    if (this.restIntervalId) clearInterval(this.restIntervalId);
  }

  loadRoutine() {
    const raw = localStorage.getItem(this.storageKey);
    if (raw) {
      try {
        this.exercises.set(JSON.parse(raw));
      } catch (err) {
        console.error('Failed to parse cached routine:', err);
        this.exercises.set([]);
      }
    } else {
      this.exercises.set([]);
    }
  }

  saveRoutine() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.exercises()));
  }

  addExercise() {
    if (!this.newExName().trim()) return;

    const sets: WorkoutSet[] = [];
    for (let i = 1; i <= this.newExSets; i++) {
      sets.push({
        setNumber: i,
        weight: 0,
        reps: 0,
        completed: false
      });
    }

    const newEx: Exercise = {
      id: Math.random().toString(36).substring(2, 9),
      name: this.newExName().trim(),
      sets
    };

    this.exercises.update(exs => [...exs, newEx]);
    
    // Set start time if it is the first exercise
    if (!localStorage.getItem(this.startTimeStorageKey)) {
      localStorage.setItem(this.startTimeStorageKey, new Date().toISOString());
      this.startElapsedTimeTimer();
    }

    this.saveRoutine();

    // Reset inputs
    this.newExName.set('');
    this.newExSets = 4;
    this.showAutocomplete.set(false);
  }

  removeExercise(exId: string) {
    this.exercises.update(exs => exs.filter(e => e.id !== exId));
    this.saveRoutine();
    
    // If no exercises left, reset/clear timer
    if (this.exercises().length === 0) {
      localStorage.removeItem(this.startTimeStorageKey);
      this.elapsedTime.set('00:00');
    }
  }

  toggleSetCompletion(exId: string, setNum: number) {
    let triggeredRest = false;

    this.exercises.update(exs => exs.map(e => {
      if (e.id === exId) {
        return {
          ...e,
          sets: e.sets.map(s => {
            if (s.setNumber === setNum) {
              const newCompleted = !s.completed;
              if (newCompleted) {
                triggeredRest = true;
              }
              return { ...s, completed: newCompleted };
            }
            return s;
          })
        };
      }
      return e;
    }));
    this.saveRoutine();

    if (triggeredRest) {
      this.startRestTimer();
    }
  }

  addSetToExercise(exId: string) {
    this.exercises.update(exs => exs.map(e => {
      if (e.id === exId) {
        const nextSetNum = e.sets.length + 1;
        const lastSet = e.sets[e.sets.length - 1];
        return {
          ...e,
          sets: [...e.sets, {
            setNumber: nextSetNum,
            weight: lastSet ? lastSet.weight : 0,
            reps: lastSet ? lastSet.reps : 0,
            completed: false
          }]
        };
      }
      return e;
    }));
    this.saveRoutine();
  }

  removeSetFromExercise(exId: string) {
    this.exercises.update(exs => exs.map(e => {
      if (e.id === exId && e.sets.length > 1) {
        return {
          ...e,
          sets: e.sets.slice(0, -1)
        };
      }
      return e;
    }));
    this.saveRoutine();
  }

  clearRoutine() {
    if (confirm('Are you sure you want to clear your daily routine log?')) {
      this.exercises.set([]);
      localStorage.removeItem(this.startTimeStorageKey);
      this.elapsedTime.set('00:00');
      this.saveRoutine();
      this.stopRestTimer();
    }
  }

  // Autocomplete Helpers
  selectExerciseFromLibrary(ex: LibraryExercise) {
    this.newExName.set(ex.name);
    this.showAutocomplete.set(false);
  }

  onFocusOut(event: FocusEvent) {
    const currentTarget = event.currentTarget as HTMLElement;
    const relatedTarget = event.relatedTarget as HTMLElement;
    
    // Close the suggestions dropdown if focus has left the autocomplete container entirely
    if (!currentTarget.contains(relatedTarget)) {
      this.showAutocomplete.set(false);
    }
  }

  getExerciseMeta(name: string): { category: string; emoji: string } {
    const found = EXERCISE_LIBRARY.find(ex => ex.name.toLowerCase() === name.toLowerCase());
    if (found) return { category: found.category, emoji: found.emoji };
    return { category: 'Custom', emoji: '🏋️‍♂️' };
  }

  getCategoryClass(category: string): string {
    switch (category.toLowerCase()) {
      case 'chest': return 'cat-chest';
      case 'back': return 'cat-back';
      case 'legs': return 'cat-legs';
      case 'shoulders': return 'cat-shoulders';
      case 'arms': return 'cat-arms';
      case 'core': return 'cat-core';
      default: return 'cat-custom';
    }
  }

  // Rest Timer Controller
  startRestTimer() {
    this.stopRestTimer();
    this.restTimeRemaining.set(this.restTimeTotal());
    this.restTimerActive.set(true);
    
    this.restIntervalId = setInterval(() => {
      this.restTimeRemaining.update(r => {
        if (r <= 1) {
          clearInterval(this.restIntervalId);
          this.restTimerActive.set(false);
          this.playBeepSound();
          if ('vibrate' in navigator) {
            navigator.vibrate([150, 100, 150]);
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  }

  stopRestTimer() {
    if (this.restIntervalId) {
      clearInterval(this.restIntervalId);
      this.restIntervalId = null;
    }
    this.restTimerActive.set(false);
  }

  adjustDefaultRestTime(amount: number) {
    this.restTimeTotal.update(t => Math.max(10, t + amount));
    // If active, adjust the remaining time
    if (this.restTimerActive()) {
      this.restTimeRemaining.update(r => Math.max(0, r + amount));
    }
  }

  playBeepSound() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const playTone = (time: number, freq: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        
        gainNode.gain.setValueAtTime(0.15, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);
        
        osc.start(time);
        osc.stop(time + duration);
      };
      
      const now = ctx.currentTime;
      playTone(now, 880, 0.15); // A5 note
      playTone(now + 0.2, 880, 0.15); // A5 double beep
    } catch (err) {
      console.warn('Web Audio API beep failed:', err);
    }
  }

  // Elapsed Time clock
  startElapsedTimeTimer() {
    if (this.elapsedTimeIntervalId) {
      clearInterval(this.elapsedTimeIntervalId);
    }
    
    this.elapsedTimeIntervalId = setInterval(() => {
      let startStr = localStorage.getItem(this.startTimeStorageKey);
      if (!startStr) {
        if (this.exercises().length > 0) {
          startStr = new Date().toISOString();
          localStorage.setItem(this.startTimeStorageKey, startStr);
        } else {
          this.elapsedTime.set('00:00');
          return;
        }
      }
      
      const start = new Date(startStr);
      const diffMs = new Date().getTime() - start.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const hrs = Math.floor(diffSecs / 3600);
      const mins = Math.floor((diffSecs % 3600) / 60);
      const secs = diffSecs % 60;
      
      const pad = (n: number) => n.toString().padStart(2, '0');
      if (hrs > 0) {
        this.elapsedTime.set(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
      } else {
        this.elapsedTime.set(`${pad(mins)}:${pad(secs)}`);
      }
    }, 1000);
  }

  // Templates Management
  loadTemplates() {
    const raw = localStorage.getItem(this.templatesStorageKey);
    if (raw) {
      try {
        this.templates.set(JSON.parse(raw));
      } catch (err) {
        console.error('Failed to parse templates:', err);
        this.templates.set([]);
      }
    } else {
      this.templates.set([]);
    }
  }

  saveActiveAsTemplate() {
    const name = this.newTemplateName.trim();
    if (!name) return;
    const currentExercises = this.exercises();
    if (currentExercises.length === 0) return;

    const templateExercises = currentExercises.map(ex => ({
      id: Math.random().toString(36).substring(2, 9),
      name: ex.name,
      sets: ex.sets.map(s => ({
        setNumber: s.setNumber,
        weight: s.weight,
        reps: s.reps,
        completed: false
      }))
    }));

    const newTemplate = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      exercises: templateExercises
    };

    this.templates.update(t => [...t, newTemplate]);
    localStorage.setItem(this.templatesStorageKey, JSON.stringify(this.templates()));
    
    this.newTemplateName = '';
    this.showTemplatesPanel.set(false);
  }

  loadTemplateById(tplId: string) {
    const found = this.templates().find(t => t.id === tplId);
    if (!found) return;

    if (this.exercises().length > 0 && !confirm('Discard current active workout session and load this template?')) {
      return;
    }

    const clonedExercises = JSON.parse(JSON.stringify(found.exercises));
    this.exercises.set(clonedExercises);
    localStorage.setItem(this.storageKey, JSON.stringify(clonedExercises));
    
    const nowStr = new Date().toISOString();
    localStorage.setItem(this.startTimeStorageKey, nowStr);
    
    this.showTemplatesPanel.set(false);
    this.startElapsedTimeTimer();
  }

  deleteTemplate(tplId: string, event: Event) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this template?')) {
      this.templates.update(tpls => tpls.filter(t => t.id !== tplId));
      localStorage.setItem(this.templatesStorageKey, JSON.stringify(this.templates()));
    }
  }

  // PR checking
  isPersonalRecord(exerciseName: string, weight: number, reps: number): boolean {
    if (weight <= 0 || reps <= 0) return false;
    const pbs = this.dashboardService.memberData()?.personalBests || {};
    const key = exerciseName.toLowerCase().trim();
    const pb = pbs[key];
    if (!pb) return true;
    return weight > pb.weight || (weight === pb.weight && reps > pb.reps);
  }

  // Completion Overlay Handlers
  openFinishWorkoutModal() {
    const now = new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    this.workoutNameInput = `Workout - ${monthNames[now.getMonth()]} ${now.getDate()}`;
    this.showFinishModal.set(true);
  }

  async submitCompletedWorkout() {
    if (this.completedSetsCount() === 0) return;
    this.isSaving.set(true);
    
    try {
      const now = new Date();
      const startStr = localStorage.getItem(this.startTimeStorageKey) || now.toISOString();
      const start = new Date(startStr);
      
      const durationMs = now.getTime() - start.getTime();
      const durationMinutes = Math.max(1, Math.round(durationMs / (1000 * 60)));

      const dateStr = now.getFullYear() + '-' + 
        String(now.getMonth() + 1).padStart(2, '0') + '-' + 
        String(now.getDate()).padStart(2, '0');

      // Tag PR status
      const prsList: any[] = [];
      const updatedExercises = this.exercises().map(ex => {
        const setsWithPRStatus = ex.sets.map(s => {
          const pr = s.completed && this.isPersonalRecord(ex.name, s.weight, s.reps);
          if (pr) {
            prsList.push({
              name: ex.name,
              weight: s.weight,
              reps: s.reps,
              emoji: this.getExerciseMeta(ex.name).emoji
            });
          }
          return {
            ...s,
            isPR: pr
          };
        });
        return {
          name: ex.name,
          sets: setsWithPRStatus
        };
      });

      // Group and get absolute best PR for each exercise
      const uniquePRsMap = new Map<string, any>();
      prsList.forEach(pr => {
        const key = pr.name.toLowerCase().trim();
        const existing = uniquePRsMap.get(key);
        if (!existing || pr.weight > existing.weight || (pr.weight === existing.weight && pr.reps > existing.reps)) {
          uniquePRsMap.set(key, pr);
        }
      });
      const uniquePRs = Array.from(uniquePRsMap.values());

      const workoutPayload: CompletedWorkout = {
        name: this.workoutNameInput.trim() || 'Workout Log',
        date: dateStr,
        startTime: start.toISOString(),
        endTime: now.toISOString(),
        durationMinutes,
        totalVolumeKg: this.totalVolume(),
        exercises: updatedExercises
      };

      await this.dashboardService.saveCompletedWorkout(workoutPayload);

      this.achievedPRs.set(uniquePRs);
      this.showFinishModal.set(false);
      this.showSuccessOverlay.set(true);

      // Clear local state
      this.exercises.set([]);
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.startTimeStorageKey);
      this.stopRestTimer();
      
    } catch (err) {
      console.error('Failed to save workout:', err);
      alert('Could not sync workout to cloud. Please check connection and try again.');
    } finally {
      this.isSaving.set(false);
    }
  }

  closeSuccessOverlay() {
    this.showSuccessOverlay.set(false);
    this.elapsedTime.set('00:00');
  }
}
