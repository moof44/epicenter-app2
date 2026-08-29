import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ShiftScheduleService, formatShiftSchedule, formatTime12Hour } from '../../../../core/services/shift-schedule.service';
import { ShiftDefinition } from '../../../../core/models/shift-schedule.model';

@Component({
  selector: 'app-shift-definition-modal',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatDialogModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatCheckboxModule, MatSnackBarModule
  ],
  templateUrl: './shift-definition-modal.html',
  styleUrl: './shift-definition-modal.css'
})
export class ShiftDefinitionModalComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<ShiftDefinitionModalComponent>);
  private scheduleService = inject(ShiftScheduleService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  formatShiftSchedule = formatShiftSchedule;
  formatTime12Hour = formatTime12Hour;

  shifts = signal<ShiftDefinition[]>([]);
  isEditing = signal<boolean>(false);
  editingId: string | null = null;
  isSaving = signal<boolean>(false);

  shiftForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    startTime: ['08:00', [Validators.required]],
    endTime: ['15:00', [Validators.required]],
    requiredHours: [7, [Validators.required, Validators.min(1)]],
    isFlexible: [false],
    colorHex: ['#0284c7']
  });

  colorOptions = [
    { label: 'Amber', hex: '#f59e0b' },
    { label: 'Sky Blue', hex: '#0284c7' },
    { label: 'Purple', hex: '#8b5cf6' },
    { label: 'Emerald', hex: '#10b981' },
    { label: 'Rose', hex: '#f43f5e' },
    { label: 'Indigo', hex: '#6366f1' },
    { label: 'Slate', hex: '#64748b' }
  ];

  ngOnInit(): void {
    this.loadShifts();
  }

  loadShifts(): void {
    this.scheduleService.getShiftDefinitions().subscribe(list => {
      this.shifts.set(list || []);
    });
  }

  startNewShift(): void {
    this.isEditing.set(true);
    this.editingId = null;
    this.shiftForm.reset({
      name: '',
      startTime: '08:00',
      endTime: '15:00',
      requiredHours: 7,
      isFlexible: false,
      colorHex: '#0284c7'
    });
  }

  editShift(shift: ShiftDefinition): void {
    this.isEditing.set(true);
    this.editingId = shift.id;
    this.shiftForm.patchValue({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      requiredHours: shift.requiredHours || 7,
      isFlexible: !!shift.isFlexible,
      colorHex: shift.colorHex || '#0284c7'
    });
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.editingId = null;
  }

  async saveShift(): Promise<void> {
    if (this.shiftForm.invalid) return;

    this.isSaving.set(true);
    const formVal = this.shiftForm.value;

    try {
      await this.scheduleService.saveShiftDefinition({
        id: this.editingId || undefined,
        name: formVal.name,
        startTime: formVal.isFlexible ? 'Flexible' : formVal.startTime,
        endTime: formVal.isFlexible ? 'Flexible' : formVal.endTime,
        requiredHours: Number(formVal.requiredHours || 7),
        isFlexible: !!formVal.isFlexible,
        colorHex: formVal.colorHex || '#0284c7',
        isActive: true
      });

      this.snackBar.open('Shift schedule saved successfully!', 'Close', { duration: 3000 });
      this.isEditing.set(false);
      this.editingId = null;
      this.loadShifts();
    } catch (err: any) {
      this.snackBar.open(err.message || 'Failed to save shift', 'Close', { duration: 4000 });
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteShift(shift: ShiftDefinition): Promise<void> {
    if (confirm(`Are you sure you want to deactivate "${shift.name}"?`)) {
      try {
        await this.scheduleService.deleteShiftDefinition(shift.id);
        this.snackBar.open('Shift deactivated', 'Close', { duration: 3000 });
        this.loadShifts();
      } catch (err: any) {
        this.snackBar.open(err.message || 'Failed to deactivate shift', 'Close', { duration: 4000 });
      }
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
