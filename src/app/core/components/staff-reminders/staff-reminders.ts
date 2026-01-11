import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { STAFF_REMINDERS, StaffReminder } from '../../constants/staff-reminders';

@Component({
    selector: 'app-staff-reminders',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './staff-reminders.html',
    styleUrl: './staff-reminders.css'
})
export class StaffRemindersComponent implements OnInit, OnDestroy {
    currentReminder = signal<StaffReminder | null>(null);
    intervalId: any;

    ngOnInit() {
        this.updateReminder();
        // Update every 1 minute (60,000 ms)
        this.intervalId = setInterval(() => this.updateReminder(), 60000);
    }

    ngOnDestroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    updateReminder() {
        // Pick a random reminder
        const randomIndex = Math.floor(Math.random() * STAFF_REMINDERS.length);
        this.currentReminder.set(STAFF_REMINDERS[randomIndex]);
    }

    getPriorityColor(priority: string): string {
        switch (priority) {
            case 'CRITICAL': return '#ef4444'; // Red
            case 'IMPORTANT': return '#f97316'; // Orange
            case 'ROUTINE': return '#3b82f6'; // Blue
            default: return '#6b7280';
        }
    }

    getPriorityIcon(priority: string): string {
        switch (priority) {
            case 'CRITICAL': return 'priority_high';
            case 'IMPORTANT': return 'notification_important';
            case 'ROUTINE': return 'info';
            default: return 'info';
        }
    }
}
