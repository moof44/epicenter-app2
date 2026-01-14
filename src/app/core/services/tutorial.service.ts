import { Injectable, signal } from '@angular/core';
import { TutorialDef, TutorialStep } from '../models/tutorial.model';

@Injectable({
    providedIn: 'root'
})
export class TutorialService {
    private readonly STORAGE_KEY = 'completed_tutorials';

    // State
    activeTutorial = signal<TutorialDef | null>(null);
    currentStepIndex = signal(0);
    isOpen = signal(false);

    private tutorials: Record<string, TutorialDef> = {};

    constructor() { }

    registerTutorial(tutorial: TutorialDef) {
        this.tutorials[tutorial.id] = tutorial;
    }

    startTutorial(id: string, force = false) {
        if (!force && this.hasSeenTutorial(id)) {
            return;
        }

        const tutorial = this.tutorials[id];
        if (tutorial) {
            this.activeTutorial.set(tutorial);
            this.currentStepIndex.set(0);
            this.isOpen.set(true);
        }
    }

    nextStep() {
        const tutorial = this.activeTutorial();
        if (!tutorial) return;

        if (this.currentStepIndex() < tutorial.steps.length - 1) {
            this.currentStepIndex.update(i => i + 1);
        } else {
            this.completeTutorial();
        }
    }

    previousStep() {
        if (this.currentStepIndex() > 0) {
            this.currentStepIndex.update(i => i - 1);
        }
    }

    completeTutorial() {
        const tutorial = this.activeTutorial();
        if (tutorial) {
            this.markAsSeen(tutorial.id);
        }
        this.close();
    }

    close() {
        this.isOpen.set(false);
        this.activeTutorial.set(null);
        this.currentStepIndex.set(0);
    }

    hasSeenTutorial(id: string): boolean {
        const seen = this.getSeenTutorials();
        return seen.has(id);
    }

    private markAsSeen(id: string) {
        const seen = this.getSeenTutorials();
        seen.add(id);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(Array.from(seen)));
    }

    private getSeenTutorials(): Set<string> {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? new Set(JSON.parse(data)) : new Set();
        } catch {
            return new Set();
        }
    }

    getCurrentStep(): TutorialStep | null {
        const tutorial = this.activeTutorial();
        const index = this.currentStepIndex();
        if (tutorial && tutorial.steps[index]) {
            return tutorial.steps[index];
        }
        return null;
    }
}
