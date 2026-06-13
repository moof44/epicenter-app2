import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

interface GymClass {
  id: string;
  name: string;
  time: string;
  duration: string;
  coach: string;
  description: string;
  muscles: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

@Component({
  selector: 'app-gym-schedule',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen text-text-primary py-4 px-2 sm:px-6 select-none animate-fade-in">
      
      <!-- Top Title and opening hours -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-bg-surface-alt pb-4">
        <div>
          <h1 class="text-2xl font-black font-oswald text-gold-primary tracking-wide uppercase">Gym Class Timetable</h1>
          <p class="text-xs text-text-secondary mt-0.5">Explore group training sessions and coach hours at Epicenter</p>
        </div>

        <div class="bg-bg-surface-alt border border-bg-surface-alt/40 px-4 py-2 rounded-xl text-xs flex flex-col gap-0.5">
          <span class="text-[9px] text-gold-light font-bold uppercase tracking-wider">Gym Operating Hours</span>
          <span class="font-bold">Weekdays: 6:00 AM - 10:00 PM</span>
          <span class="text-text-secondary">Weekends: 8:00 AM - 6:00 PM</span>
        </div>
      </div>

      <!-- Weekday Selector Toggle Row -->
      <div class="flex overflow-x-auto gap-2 py-3 mt-4 scrollbar-none">
        @for (day of weekdays; track day) {
          <button 
            (click)="activeDay.set(day)"
            [class.bg-gradient-to-b]="activeDay() === day"
            [class.from-gold-primary]="activeDay() === day"
            [class.to-gold-dark]="activeDay() === day"
            [class.text-black]="activeDay() === day"
            [class.text-text-secondary]="activeDay() !== day"
            [class.bg-bg-surface]="activeDay() !== day"
            class="px-4 py-2 rounded-xl text-xs font-bold font-oswald uppercase tracking-wider transition-all duration-150 active:scale-95 border border-bg-surface-alt flex-shrink-0"
          >
            {{ day }}
          </button>
        }
      </div>

      <!-- Class Schedules Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        @for (cls of activeDayClasses(); track cls.id) {
          <button 
            type="button"
            (click)="openClassDetails(cls)"
            class="w-full text-left card-surface flex flex-col justify-between gap-4 border border-bg-surface-alt/50 hover:border-gold-primary/30 transition-all hover:-translate-y-0.5 cursor-pointer active:scale-99 shadow-[0_4px_16px_rgba(0,0,0,0.2)] font-sans"
          >
            <div class="flex items-start justify-between gap-2 w-full">
              <div class="flex flex-col">
                <span class="text-xs font-black font-oswald uppercase text-gold-light tracking-wide">{{ cls.time }}</span>
                <h3 class="text-base font-black font-oswald uppercase text-text-primary mt-1 tracking-wide">{{ cls.name }}</h3>
              </div>
              <span 
                [class.bg-emerald-950]="cls.difficulty === 'Beginner'"
                [class.text-emerald-400]="cls.difficulty === 'Beginner'"
                [class.border-emerald-800]="cls.difficulty === 'Beginner'"
                [class.bg-yellow-950]="cls.difficulty === 'Intermediate'"
                [class.text-yellow-400]="cls.difficulty === 'Intermediate'"
                [class.border-yellow-800]="cls.difficulty === 'Intermediate'"
                [class.bg-red-950]="cls.difficulty === 'Advanced'"
                [class.text-red-400]="cls.difficulty === 'Advanced'"
                [class.border-red-900]="cls.difficulty === 'Advanced'"
                class="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border"
              >
                {{ cls.difficulty }}
              </span>
            </div>

            <div class="flex justify-between items-center text-xs border-t border-bg-surface-alt/45 pt-3 mt-1 text-text-secondary w-full">
              <div class="flex items-center gap-1.5">
                <span>⏱️</span>
                <span>{{ cls.duration }}</span>
              </div>
              <div class="flex items-center gap-1.5 font-semibold">
                <span>👤</span>
                <span>{{ cls.coach }}</span>
              </div>
            </div>
          </button>
        } @empty {
          <div class="col-span-1 md:col-span-2 card-surface flex flex-col items-center justify-center py-12 text-center text-text-secondary gap-2">
            <span class="text-2xl">💤</span>
            <span class="text-xs font-bold uppercase tracking-wider text-gold-light">No group classes scheduled</span>
            <p class="text-[10px] text-text-secondary">Gym floor and cardio facilities are open for independent workouts.</p>
          </div>
        }
      </div>

      <!-- Slide-up Bottom Sheet Details Modal -->
      @if (selectedClass()) {
        <div 
          (click)="closeDetailsFromBackdrop($event)"
          (keydown.escape)="closeClassDetails()"
          tabindex="0"
          role="button"
          aria-label="Close details"
          class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end justify-center"
        >
          <!-- Bottom Sheet Modal Content Container -->
          <div 
            class="w-full max-w-md bg-bg-surface border-t border-bg-surface-alt p-6 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.6)] flex flex-col gap-5 animate-slide-up pb-safe text-left"
          >
            <!-- Header -->
            <div class="flex justify-between items-start gap-4 border-b border-bg-surface-alt pb-4">
              <div class="flex flex-col">
                <span class="text-xs font-bold font-oswald text-gold-primary uppercase tracking-wide">{{ selectedClass()?.time }}</span>
                <h2 class="text-lg font-black font-oswald uppercase text-text-primary mt-1 tracking-wide">
                  {{ selectedClass()?.name }}
                </h2>
              </div>
              <button 
                (click)="closeClassDetails()"
                class="p-1.5 bg-bg-surface-alt rounded-lg text-text-muted hover:text-text-primary active:scale-90"
              >
                ✕
              </button>
            </div>

            <!-- Body info -->
            <div class="flex flex-col gap-4 text-xs leading-relaxed">
              <div class="flex flex-col gap-1.5">
                <span class="text-[9px] text-text-secondary font-bold uppercase tracking-wider">Coach / Trainer</span>
                <span class="text-sm font-bold text-text-primary">{{ selectedClass()?.coach }} ({{ selectedClass()?.duration }})</span>
              </div>

              <div class="flex flex-col gap-1.5">
                <span class="text-[9px] text-text-secondary font-bold uppercase tracking-wider">Session Description</span>
                <p class="text-text-secondary">{{ selectedClass()?.description }}</p>
              </div>

              <div class="flex flex-col gap-1.5">
                <span class="text-[9px] text-text-secondary font-bold uppercase tracking-wider">Target Muscle Groups</span>
                <div class="flex flex-wrap gap-1.5 mt-0.5">
                  @for (muscle of selectedClass()?.muscles; track muscle) {
                    <span class="px-2.5 py-1 bg-bg-surface-alt rounded-lg border border-bg-surface-alt/40 font-semibold text-text-primary">
                      {{ muscle }}
                    </span>
                  }
                </div>
              </div>

              <div class="flex items-center justify-between border-t border-bg-surface-alt/40 pt-4 mt-2">
                <div class="flex flex-col">
                  <span class="text-[9px] text-text-secondary font-bold uppercase tracking-wider">Difficulty Level</span>
                  <span class="font-bold text-text-primary uppercase tracking-wider font-oswald text-sm mt-0.5">
                    {{ selectedClass()?.difficulty }}
                  </span>
                </div>
                
                <button 
                  (click)="closeClassDetails()"
                  class="px-5 py-2.5 bg-gradient-to-b from-gold-primary to-gold-dark text-black border border-gold-light text-xs font-black font-oswald uppercase tracking-wider rounded-xl active:scale-95 transition-all shadow-[0_4px_16px_rgba(212,175,55,0.2)]"
                >
                  Close Details
                </button>
              </div>

            </div>

          </div>
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
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    .animate-slide-up {
      animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .scrollbar-none::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-none {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `]
})
export class GymScheduleComponent {
  readonly weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  readonly activeDay = signal<string>('Monday');

  readonly selectedClass = signal<GymClass | null>(null);

  readonly classesByDay: Record<string, GymClass[]> = {
    'Monday': [
      { id: 'm1', name: 'CrossFit Basics', time: '07:00 AM - 08:00 AM', duration: '60 mins', coach: 'Coach Leo', description: 'Master the core movements of CrossFit including squats, presses, and simple Olympic lifting drills in a controlled group setting.', muscles: ['Full Body', 'Quads', 'Shoulders'], difficulty: 'Beginner' },
      { id: 'm2', name: 'Muay Thai Kickboxing', time: '09:00 AM - 10:30 AM', duration: '90 mins', coach: 'Kru Sompot', description: 'High-intensity striking drills, elbow/knee bag work, and core development inspired by traditional Muay Thai camps.', muscles: ['Core', 'Shoulders', 'Calves'], difficulty: 'Intermediate' },
      { id: 'm3', name: 'Barbell Strength & Power', time: '05:30 PM - 06:30 PM', duration: '60 mins', coach: 'Coach Sarah', description: 'Focus on progressive overload with heavy squats, bench presses, and deadlifts. Perfect for building raw structural power.', muscles: ['Hamstrings', 'Chest', 'Glutes'], difficulty: 'Advanced' },
      { id: 'm4', name: 'HIIT Cardio Burn', time: '07:00 PM - 07:45 PM', duration: '45 mins', coach: 'Coach Jake', description: 'Fat loss class using kettlebells, rowing machines, and bodyweight intervals to push your heart rate to the max.', muscles: ['Cardio', 'Full Body'], difficulty: 'Beginner' }
    ],
    'Tuesday': [
      { id: 't1', name: 'HIIT Cardio Burn', time: '07:00 AM - 07:45 AM', duration: '45 mins', coach: 'Coach Jake', description: 'Fat loss class using kettlebells, rowing machines, and bodyweight intervals to push your heart rate to the max.', muscles: ['Cardio', 'Full Body'], difficulty: 'Beginner' },
      { id: 't2', name: 'Boxing Skills & Conditioning', time: '09:00 AM - 10:00 AM', duration: '60 mins', coach: 'Coach Romy', description: 'Footwork, punch combinations, mitt work, and core circuits tailored to boxing athletics.', muscles: ['Arms', 'Shoulders', 'Core'], difficulty: 'Beginner' },
      { id: 't3', name: 'CrossFit WOD (Workout of the Day)', time: '05:30 PM - 06:30 PM', duration: '60 mins', coach: 'Coach Leo', description: 'High-intensity CrossFit Workout of the Day focusing on metabolic conditioning and gymnastics skills.', muscles: ['Full Body', 'Cardio'], difficulty: 'Advanced' },
      { id: 't4', name: 'Ashtanga Vinyasa Yoga', time: '07:00 PM - 08:00 PM', duration: '60 mins', coach: 'Teacher Clara', description: 'A structured, flowing sequence of postures aligned with deep breathing. Improves flexbility, structural alignment, and mental focus.', muscles: ['Flexibility', 'Spine', 'Core'], difficulty: 'Intermediate' }
    ],
    'Wednesday': [
      { id: 'w1', name: 'CrossFit Basics', time: '07:00 AM - 08:00 AM', duration: '60 mins', coach: 'Coach Leo', description: 'Master the core movements of CrossFit including squats, presses, and simple Olympic lifting drills in a controlled group setting.', muscles: ['Full Body', 'Quads', 'Shoulders'], difficulty: 'Beginner' },
      { id: 'w2', name: 'Muay Thai Kickboxing', time: '09:00 AM - 10:30 AM', duration: '90 mins', coach: 'Kru Sompot', description: 'High-intensity striking drills, elbow/knee bag work, and core development inspired by traditional Muay Thai camps.', muscles: ['Core', 'Shoulders', 'Calves'], difficulty: 'Intermediate' },
      { id: 'w3', name: 'Barbell Strength & Power', time: '05:30 PM - 06:30 PM', duration: '60 mins', coach: 'Coach Sarah', description: 'Focus on progressive overload with heavy squats, bench presses, and deadlifts. Perfect for building raw structural power.', muscles: ['Hamstrings', 'Chest', 'Glutes'], difficulty: 'Advanced' },
      { id: 'w4', name: 'HIIT Cardio Burn', time: '07:00 PM - 07:45 PM', duration: '45 mins', coach: 'Coach Jake', description: 'Fat loss class using kettlebells, rowing machines, and bodyweight intervals to push your heart rate to the max.', muscles: ['Cardio', 'Full Body'], difficulty: 'Beginner' }
    ],
    'Thursday': [
      { id: 'th1', name: 'HIIT Cardio Burn', time: '07:00 AM - 07:45 AM', duration: '45 mins', coach: 'Coach Jake', description: 'Fat loss class using kettlebells, rowing machines, and bodyweight intervals to push your heart rate to the max.', muscles: ['Cardio', 'Full Body'], difficulty: 'Beginner' },
      { id: 'th2', name: 'Boxing Skills & Conditioning', time: '09:00 AM - 10:00 AM', duration: '60 mins', coach: 'Coach Romy', description: 'Footwork, punch combinations, mitt work, and core circuits tailored to boxing athletics.', muscles: ['Arms', 'Shoulders', 'Core'], difficulty: 'Beginner' },
      { id: 'th3', name: 'CrossFit WOD', time: '05:30 PM - 06:30 PM', duration: '60 mins', coach: 'Coach Leo', description: 'High-intensity CrossFit Workout of the Day focusing on metabolic conditioning and gymnastics skills.', muscles: ['Full Body', 'Cardio'], difficulty: 'Advanced' },
      { id: 'th4', name: 'Ashtanga Vinyasa Yoga', time: '07:00 PM - 08:00 PM', duration: '60 mins', coach: 'Teacher Clara', description: 'A structured, flowing sequence of postures aligned with deep breathing. Improves flexbility, structural alignment, and mental focus.', muscles: ['Flexibility', 'Spine', 'Core'], difficulty: 'Intermediate' }
    ],
    'Friday': [
      { id: 'f1', name: 'CrossFit Basics', time: '07:00 AM - 08:00 AM', duration: '60 mins', coach: 'Coach Leo', description: 'Master the core movements of CrossFit including squats, presses, and simple Olympic lifting drills in a controlled group setting.', muscles: ['Full Body', 'Quads', 'Shoulders'], difficulty: 'Beginner' },
      { id: 'f2', name: 'Muay Thai Kickboxing', time: '09:00 AM - 10:30 AM', duration: '90 mins', coach: 'Kru Sompot', description: 'High-intensity striking drills, elbow/knee bag work, and core development inspired by traditional Muay Thai camps.', muscles: ['Core', 'Shoulders', 'Calves'], difficulty: 'Intermediate' },
      { id: 'f3', name: 'Barbell Strength & Power', time: '05:30 PM - 06:30 PM', duration: '60 mins', coach: 'Coach Sarah', description: 'Focus on progressive overload with heavy squats, bench presses, and deadlifts. Perfect for building raw structural power.', muscles: ['Hamstrings', 'Chest', 'Glutes'], difficulty: 'Advanced' },
      { id: 'f4', name: 'HIIT Cardio Burn', time: '07:00 PM - 07:45 PM', duration: '45 mins', coach: 'Coach Jake', description: 'Fat loss class using kettlebells, rowing machines, and bodyweight intervals to push your heart rate to the max.', muscles: ['Cardio', 'Full Body'], difficulty: 'Beginner' }
    ],
    'Saturday': [
      { id: 's1', name: 'CrossFit Team WOD', time: '09:30 AM - 11:00 AM', duration: '90 mins', coach: 'Coach Leo', description: 'A fun, community-driven team workouts combining weightlifting, gymnastics, and endurance exercises.', muscles: ['Full Body', 'Cardio'], difficulty: 'Intermediate' },
      { id: 's2', name: 'Boxing Sparring Clinic', time: '11:30 AM - 01:00 PM', duration: '90 mins', coach: 'Coach Romy', description: 'Supervised light sparring drills focusing on defense, distance control, and tactical boxing strategy.', muscles: ['Defense', 'Core', 'Cardio'], difficulty: 'Advanced' },
      { id: 's3', name: 'Hatha Stretch Yoga', time: '03:00 PM - 04:00 PM', duration: '60 mins', coach: 'Teacher Clara', description: 'A slow-paced stretching and recovery class focused on breathing, stress relief, and muscular rehabilitation.', muscles: ['Stretching', 'Recovery', 'Flexibility'], difficulty: 'Beginner' }
    ],
    'Sunday': [] // Closed for classes, facilities open 8 AM - 6 PM
  };

  readonly activeDayClasses = computed(() => {
    return this.classesByDay[this.activeDay()] || [];
  });

  openClassDetails(cls: GymClass) {
    this.selectedClass.set(cls);
  }

  closeClassDetails() {
    this.selectedClass.set(null);
  }

  closeDetailsFromBackdrop(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closeClassDetails();
    }
  }
}
