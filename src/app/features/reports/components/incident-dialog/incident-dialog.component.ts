import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { IncidentService } from '../../../../core/services/incident.service';
import { AuthService } from '../../../../core/services/auth.service';
import { IncidentReport, IncidentCategory, IncidentSeverity, IncidentStatus } from '../../../../core/models/incident.model';
import { toLocalDateStr } from '../../../../core/utils/date.utils';

export interface IncidentDialogData {
  incident?: IncidentReport;
  defaultDate?: string;
}

@Component({
  selector: 'app-incident-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './incident-dialog.component.html',
  styleUrl: './incident-dialog.component.css'
})
export class IncidentDialogComponent {
  dialogRef = inject(MatDialogRef<IncidentDialogComponent>);
  data: IncidentDialogData = inject(MAT_DIALOG_DATA) || {};
  private fb = inject(FormBuilder);
  private incidentService = inject(IncidentService);
  private authService = inject(AuthService);

  isEditMode = Boolean(this.data.incident);
  isSubmitting = signal(false);

  categories: { label: string; value: IncidentCategory }[] = [
    { label: '⚙️ Equipment Breakdown', value: 'EQUIPMENT' },
    { label: '🏢 Facility / Infrastructure', value: 'FACILITY' },
    { label: '👤 Member Rules / Behavior', value: 'MEMBER_BEHAVIOR' },
    { label: '🩹 Safety & Medical Injury', value: 'SAFETY_INJURY' },
    { label: '💵 Cash & Register Variance', value: 'CASH_FINANCIAL' },
    { label: '👥 Staff & Operations', value: 'STAFF_OPERATIONAL' },
    { label: '📝 Other Incident', value: 'OTHER' }
  ];

  severities: { label: string; value: IncidentSeverity; colorClass: string }[] = [
    { label: 'Low', value: 'LOW', colorClass: 'badge-low' },
    { label: 'Medium', value: 'MEDIUM', colorClass: 'badge-med' },
    { label: 'High', value: 'HIGH', colorClass: 'badge-high' },
    { label: 'Critical', value: 'CRITICAL', colorClass: 'badge-crit' }
  ];

  statuses: { label: string; value: IncidentStatus }[] = [
    { label: 'Open (Needs Action)', value: 'OPEN' },
    { label: 'Investigating', value: 'INVESTIGATING' },
    { label: 'Resolved', value: 'RESOLVED' },
    { label: 'Closed (Audited)', value: 'CLOSED' }
  ];

  form = this.fb.group({
    title: [this.data.incident?.title || '', [Validators.required, Validators.maxLength(100)]],
    category: [this.data.incident?.category || 'EQUIPMENT', [Validators.required]],
    severity: [this.data.incident?.severity || 'MEDIUM', [Validators.required]],
    incidentDate: [this.data.incident?.incidentDate || this.data.defaultDate || toLocalDateStr(new Date()), [Validators.required]],
    incidentTime: [this.data.incident?.incidentTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })],
    location: [this.data.incident?.location || ''],
    description: [this.data.incident?.description || '', [Validators.required, Validators.minLength(10)]],
    involvedPersonsStr: [(this.data.incident?.involvedPersons || []).join(', ')],
    status: [this.data.incident?.status || 'OPEN'],
    resolutionNotes: [this.data.incident?.resolutionNotes || '']
  });

  async onSubmit() {
    if (this.form.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const val = this.form.value;
    const user = this.authService.userProfile();
    const uid = user?.uid || 'anonymous';
    const name = user?.displayName || user?.email || 'Staff';

    const involved = (val.involvedPersonsStr || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    try {
      if (this.isEditMode && this.data.incident?.id) {
        await this.incidentService.updateIncident(this.data.incident.id, {
          title: val.title!,
          category: val.category as IncidentCategory,
          severity: val.severity as IncidentSeverity,
          status: val.status as IncidentStatus,
          incidentDate: val.incidentDate!,
          incidentTime: val.incidentTime || '',
          location: val.location || '',
          description: val.description!,
          involvedPersons: involved,
          resolutionNotes: val.resolutionNotes || '',
          resolvedByUid: (val.status === 'RESOLVED' || val.status === 'CLOSED') ? uid : null,
          resolvedByName: (val.status === 'RESOLVED' || val.status === 'CLOSED') ? name : null
        });
      } else {
        await this.incidentService.createIncident({
          title: val.title!,
          category: val.category as IncidentCategory,
          severity: val.severity as IncidentSeverity,
          incidentDate: val.incidentDate!,
          incidentTime: val.incidentTime || '',
          location: val.location || '',
          description: val.description!,
          reportedByUid: uid,
          reportedByName: name,
          involvedPersons: involved
        });
      }

      this.dialogRef.close(true);
    } catch (err) {
      console.error('[IncidentDialog] Save failed:', err);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onCancel() {
    this.dialogRef.close(false);
  }
}
