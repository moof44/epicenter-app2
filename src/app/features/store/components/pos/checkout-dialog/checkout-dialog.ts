import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';

export interface CheckoutDialogData {
    total: number;
}

export interface CheckoutDialogResult {
    paymentMethod: 'CASH' | 'GCASH';
    referenceNumber?: string;
    amountTendered?: number;
    changeDue?: number;
}

@Component({
    selector: 'app-checkout-dialog',
    imports: [
        CommonModule, MatDialogModule, MatButtonModule, MatButtonToggleModule,
        MatIconModule, MatInputModule, MatFormFieldModule, FormsModule
    ],
    templateUrl: './checkout-dialog.html',
    styleUrl: './checkout-dialog.css'
})
export class CheckoutDialog {
    readonly dialogRef = inject(MatDialogRef<CheckoutDialog>);
    readonly data = inject<CheckoutDialogData>(MAT_DIALOG_DATA);

    paymentMethod = signal<'CASH' | 'GCASH'>('CASH');
    referenceNumber = signal('');

    // Cash Calculator Logic
    amountTendered = signal<number | null>(null);

    changeDue = computed(() => {
        const tendered = this.amountTendered();
        if (tendered === null) return 0;
        return Math.max(0, tendered - this.data.total);
    });

    // Quick Cash Helpers
    setExactAmount() {
        this.amountTendered.set(this.data.total);
    }

    addCash(amount: number) {
        this.amountTendered.set(amount);
    }

    cancel(): void {
        this.dialogRef.close();
    }

    confirm(): void {
        if (this.paymentMethod() === 'GCASH' && !this.referenceNumber().trim()) {
            return;
        }

        if (this.paymentMethod() === 'CASH') {
            const tendered = this.amountTendered();
            if (tendered === null || tendered < this.data.total) { // Use explicit null check
                return; // Prevent short payment
            }
        }

        const result: CheckoutDialogResult = {
            paymentMethod: this.paymentMethod(),
            referenceNumber: this.referenceNumber().trim() || undefined,
            amountTendered: this.amountTendered() || undefined,
            changeDue: this.changeDue()
        };
        this.dialogRef.close(result);
    }
}
