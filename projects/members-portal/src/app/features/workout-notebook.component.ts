import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth/auth.service';

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

@Component({
  selector: 'app-workout-notebook',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen text-text-primary py-4 px-2 sm:px-6 select-none animate-fade-in">
      
      <!-- Top Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-bg-surface-alt pb-4">
        <div>
          <h1 class="text-2xl font-black font-oswald text-gold-primary tracking-wide uppercase">Daily Workout Log</h1>
          <p class="text-xs text-text-secondary mt-0.5">Track your independent workouts. Saved locally on your phone.</p>
        </div>
        <button 
          *ngIf="exercises().length > 0"
          (click)="clearRoutine()"
          class="px-4 py-2 border border-red-900/60 bg-red-950/20 text-red-400 text-xs font-bold font-oswald uppercase tracking-wider rounded-xl active:scale-95 transition-all self-start sm:self-center hover:bg-red-950/40"
        >
          Clear Routine
        </button>
      </div>

      <!-- Add Exercise Form Card -->
      <div class="card-surface mt-6 flex flex-col gap-4">
        <h2 class="text-sm font-bold font-oswald text-gold-light uppercase tracking-wider">Add Exercise</h2>
        
        <form (submit)="addExercise()" class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <!-- Exercise Name -->
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label for="ex-name" class="text-[9px] text-text-secondary font-bold uppercase tracking-wider">Exercise Name</label>
            <input 
              id="ex-name"
              type="text" 
              [(ngModel)]="newExName" 
              name="newExName" 
              placeholder="e.g. Barbell Squats" 
              required
              class="w-full h-10 px-3 rounded-xl bg-bg-surface-alt border border-bg-surface-alt text-text-primary placeholder-text-muted focus:border-gold-primary focus:outline-none text-xs transition-colors"
            />
          </div>

          <!-- Sets Count -->
          <div class="flex flex-col gap-1.5">
            <label for="ex-sets" class="text-[9px] text-text-secondary font-bold uppercase tracking-wider">Sets</label>
            <input 
              id="ex-sets"
              type="number" 
              [(ngModel)]="newExSets" 
              name="newExSets" 
              min="1" 
              max="20"
              required
              class="w-full h-10 px-3 rounded-xl bg-bg-surface-alt border border-bg-surface-alt text-text-primary focus:border-gold-primary focus:outline-none text-xs transition-colors"
            />
          </div>

          <button 
            type="submit" 
            class="h-10 btn-primary font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5"
          >
            Add
          </button>
        </form>
      </div>

      <!-- Exercises Routine List -->
      @if (exercises().length === 0) {
        <div class="card-surface mt-6 flex flex-col items-center justify-center py-16 text-center text-text-secondary gap-3">
          <span class="text-3xl">🏋️‍♂️</span>
          <span class="text-sm font-bold uppercase tracking-wider text-gold-light">Your Routine is Empty</span>
          <p class="text-xs text-text-secondary max-w-sm mt-1">
            Add exercises above to start logging your sets, reps, and weights. Keep track of your workout on the gym floor!
          </p>
        </div>
      } @else {
        
        <div class="flex flex-col gap-4 mt-6">
          @for (ex of exercises(); track ex.id; let exIdx = $index) {
            <div class="card-surface flex flex-col gap-4 border border-bg-surface-alt/60 hover:border-gold-primary/20 transition-all">
              
              <!-- Exercise Header -->
              <div class="flex justify-between items-center border-b border-bg-surface-alt pb-3">
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-full bg-gold-dim border border-gold-primary/30 flex items-center justify-center text-xs font-bold text-gold-primary font-oswald">
                    {{ exIdx + 1 }}
                  </span>
                  <span class="text-sm font-bold font-oswald uppercase tracking-wide text-text-primary">{{ ex.name }}</span>
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
                <div class="grid grid-cols-4 text-[9px] text-text-secondary font-bold uppercase tracking-wider px-2">
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
                    class="grid grid-cols-4 items-center bg-bg-surface-alt/30 border border-bg-surface-alt/25 rounded-xl p-2 transition-all"
                  >
                    <span class="text-xs font-bold text-text-secondary px-2">#{{ set.setNumber }}</span>
                    
                    <!-- Weight Input -->
                    <input 
                      type="number" 
                      [(ngModel)]="set.weight"
                      (ngModelChange)="saveRoutine()"
                      min="0"
                      class="w-16 h-8 px-2 rounded-lg bg-bg-surface-alt border border-bg-surface-alt text-text-primary focus:border-gold-primary focus:outline-none text-xs transition-colors"
                    />

                    <!-- Reps Input -->
                    <input 
                      type="number" 
                      [(ngModel)]="set.reps"
                      (ngModelChange)="saveRoutine()"
                      min="0"
                      class="w-16 h-8 px-2 rounded-lg bg-bg-surface-alt border border-bg-surface-alt text-text-primary focus:border-gold-primary focus:outline-none text-xs transition-colors"
                    />

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
                        class="w-6 h-6 rounded-lg border flex items-center justify-center text-xs font-black transition-all active:scale-90"
                      >
                        ✓
                      </button>
                    </div>

                  </div>
                }

              </div>

            </div>
          }
        </div>

      }

    </div>
  `,
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class WorkoutNotebookComponent {
  private authService = inject(AuthService);

  readonly exercises = signal<Exercise[]>([]);

  // Add Form Inputs
  newExName = '';
  newExSets = 4;

  // Key selector for member workouts in localStorage
  private get storageKey(): string {
    const memberId = this.authService.memberProfile()?.memberId || 'guest';
    return `epicenter_workout_${memberId}`;
  }

  constructor() {
    // Automatically load data when profile resolved
    effect(() => {
      const memberId = this.authService.memberProfile()?.memberId;
      if (memberId) {
        this.loadRoutine();
      }
    }, { allowSignalWrites: true });
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
    if (!this.newExName.trim()) return;

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
      name: this.newExName.trim(),
      sets
    };

    this.exercises.update(exs => [...exs, newEx]);
    this.saveRoutine();

    // Reset inputs
    this.newExName = '';
    this.newExSets = 4;
  }

  removeExercise(exId: string) {
    this.exercises.update(exs => exs.filter(e => e.id !== exId));
    this.saveRoutine();
  }

  toggleSetCompletion(exId: string, setNum: number) {
    this.exercises.update(exs => exs.map(e => {
      if (e.id === exId) {
        return {
          ...e,
          sets: e.sets.map(s => {
            if (s.setNumber === setNum) {
              return { ...s, completed: !s.completed };
            }
            return s;
          })
        };
      }
      return e;
    }));
    this.saveRoutine();
  }

  clearRoutine() {
    if (confirm('Are you sure you want to clear your daily routine log?')) {
      this.exercises.set([]);
      this.saveRoutine();
    }
  }
}
