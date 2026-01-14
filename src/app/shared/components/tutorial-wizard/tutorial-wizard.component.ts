import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { TutorialService } from '../../../core/services/tutorial.service';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
    selector: 'app-tutorial-wizard',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule],
    template: `
    <div class="tutorial-overlay" *ngIf="tutorialService.isOpen()" @fade>
      <div class="tutorial-card">
        <!-- Close Button -->
        <button mat-icon-button class="close-btn" (click)="tutorialService.close()">
          <mat-icon>close</mat-icon>
        </button>

        <!-- Header -->
        <div class="header">
          <div class="step-indicator">
            Step {{ tutorialService.currentStepIndex() + 1 }} of {{ tutorialService.activeTutorial()?.steps?.length }}
          </div>
          <h2>{{ tutorialService.getCurrentStep()?.title }}</h2>
        </div>

        <!-- Content -->
        <div class="content">
          <div class="icon-wrapper" *ngIf="tutorialService.getCurrentStep()?.icon">
            <mat-icon>{{ tutorialService.getCurrentStep()?.icon }}</mat-icon>
          </div>
          <p>{{ tutorialService.getCurrentStep()?.content }}</p>
        </div>

        <!-- Actions -->
        <div class="actions">
           <!-- Prev -->
           <button mat-button 
             *ngIf="tutorialService.currentStepIndex() > 0"
             (click)="tutorialService.previousStep()">
             Back
           </button>
           <span class="spacer"></span>
           <!-- Next / Finish -->
           <button mat-flat-button color="primary" (click)="tutorialService.nextStep()">
             {{ isLastStep() ? 'Got it!' : 'Next' }}
           </button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .tutorial-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.6);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
    }
    
    .tutorial-card {
      background: white;
      width: 90%;
      max-width: 500px;
      padding: 32px;
      border-radius: 16px;
      position: relative;
      box-shadow: 0 24px 48px rgba(0,0,0,0.2);
    }

    .close-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      color: #888;
    }

    .header {
      text-align: center;
      margin-bottom: 24px;
    }

    .step-indicator {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #666;
      margin-bottom: 8px;
    }
    
    .header h2 {
      margin: 0;
      font-size: 24px;
      color: #333;
    }

    .content {
      text-align: center;
      min-height: 120px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .icon-wrapper {
      width: 64px;
      height: 64px;
      background: #f0f0f0;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }

    .icon-wrapper mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #555;
    }

    p {
      color: #555;
      line-height: 1.6;
      font-size: 16px;
      margin: 0;
    }

    .actions {
      display: flex;
      margin-top: 32px;
      align-items: center;
    }

    .spacer {
      flex: 1;
    }
  `],
    animations: [
        trigger('fade', [
            transition(':enter', [
                style({ opacity: 0, transform: 'scale(0.95)' }),
                animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
            ]),
            transition(':leave', [
                animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))
            ])
        ])
    ]
})
export class TutorialWizardComponent {
    tutorialService = inject(TutorialService);

    isLastStep(): boolean {
        const total = this.tutorialService.activeTutorial()?.steps.length || 0;
        return this.tutorialService.currentStepIndex() === total - 1;
    }
}
