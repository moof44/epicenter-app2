import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { CashRegisterService } from '../../../../core/services/cash-register.service';
import { ShiftControlModal } from '../shift-control-modal/shift-control-modal';

@Component({
  selector: 'app-shift-status-widget',
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule, MatTooltipModule],
  templateUrl: './shift-status-widget.html',
  styleUrl: './shift-status-widget.css'
})
export class ShiftStatusWidget {
  private cashRegisterService = inject(CashRegisterService);
  private dialog = inject(MatDialog);
  private breakpointObserver = inject(BreakpointObserver);

  currentShift$ = this.cashRegisterService.currentShift$;
  isMobile = false;

  constructor() {
    this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
      this.isMobile = result.matches;
    });
  }

  openShiftModal(): void {
    this.dialog.open(ShiftControlModal, {
      width: this.isMobile ? '100vw' : '500px',
      maxWidth: this.isMobile ? '100vw' : '90vw',
      disableClose: true,
      panelClass: this.isMobile ? 'mobile-dialog' : ''
    });
  }
}
