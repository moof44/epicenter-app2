import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { PaymentMethod, SplitPaymentDetails } from '../../../../../core/models/store.model';

export interface CheckoutDialogData {
    total: number;
}

export interface CheckoutDialogResult {
    paymentMethod: PaymentMethod;
    referenceNumber?: string;
    amountTendered?: number;
    changeDue?: number;
    cashAmount?: number;
    gcashAmount?: number;
    splitDetails?: SplitPaymentDetails;
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

    paymentMethod = signal<PaymentMethod>('CASH');
    referenceNumber = signal('');

    // Cash Calculator Logic (Full Cash)
    amountTendered = signal<number | null>(null);

    changeDue = computed(() => {
        const tendered = this.amountTendered();
        if (tendered === null) return 0;
        return Math.max(0, tendered - this.data.total);
    });

    // Split Payment Logic (Combination of Cash + GCash)
    splitCashAmount = signal<number | null>(Math.round(this.data.total / 2));
    splitGcashAmount = signal<number | null>(this.data.total - Math.round(this.data.total / 2));
    splitGcashRef = signal('');
    splitCashTendered = signal<number | null>(null);

    splitAllocatedTotal = computed(() => {
        const cash = Number(this.splitCashAmount() || 0);
        const gcash = Number(this.splitGcashAmount() || 0);
        return cash + gcash;
    });

    splitRemainingBalance = computed(() => {
        return this.data.total - this.splitAllocatedTotal();
    });

    isSplitBalanced = computed(() => {
        const cash = Number(this.splitCashAmount() || 0);
        const gcash = Number(this.splitGcashAmount() || 0);
        return cash > 0 && gcash > 0 && Math.abs(cash + gcash - this.data.total) < 0.01;
    });

    splitCashChangeDue = computed(() => {
        const tendered = this.splitCashTendered();
        const cashDue = Number(this.splitCashAmount() || 0);
        if (tendered === null || tendered < cashDue) return 0;
        return Math.max(0, tendered - cashDue);
    });

    onPaymentMethodChange(method: PaymentMethod) {
        this.paymentMethod.set(method);
        if (method === 'SPLIT') {
            // Initialize with 50/50 split default
            const half = Math.round(this.data.total / 2);
            this.splitCashAmount.set(half);
            this.splitGcashAmount.set(this.data.total - half);
        }
    }

    onSplitCashInput(val: any) {
        const cashVal = val === '' || val === null || val === undefined ? null : Number(val);
        this.splitCashAmount.set(cashVal);
        if (cashVal !== null && !isNaN(cashVal)) {
            const remainder = Math.max(0, this.data.total - cashVal);
            this.splitGcashAmount.set(remainder);
        }
    }

    onSplitGcashInput(val: any) {
        const gcashVal = val === '' || val === null || val === undefined ? null : Number(val);
        this.splitGcashAmount.set(gcashVal);
        if (gcashVal !== null && !isNaN(gcashVal)) {
            const remainder = Math.max(0, this.data.total - gcashVal);
            this.splitCashAmount.set(remainder);
        }
    }

    setSplitExactCash() {
        if (this.splitCashAmount()) {
            this.splitCashTendered.set(this.splitCashAmount());
        }
    }

    setSplitCashPreset(amount: number) {
        this.splitCashTendered.set(amount);
    }

    // Quick Cash Helpers (Full Cash)
    setExactAmount() {
        this.amountTendered.set(this.data.total);
    }

    addCash(amount: number) {
        this.amountTendered.set(amount);
    }

    cancel(): void {
        this.dialogRef.close();
    }

    get isConfirmDisabled(): boolean {
        const method = this.paymentMethod();

        if (method === 'GCASH') {
            return !this.referenceNumber().trim();
        }

        if (method === 'CASH') {
            const tendered = this.amountTendered();
            return tendered === null || tendered < this.data.total;
        }

        if (method === 'SPLIT') {
            if (!this.isSplitBalanced()) return true;
            if (!this.splitGcashRef().trim()) return true;
            const cashPart = Number(this.splitCashAmount() || 0);
            const tendered = this.splitCashTendered();
            // If tendered entered, must be >= cashPart
            if (tendered !== null && tendered < cashPart) return true;
        }

        return false;
    }

    confirm(): void {
        const method = this.paymentMethod();

        if (method === 'GCASH') {
            if (!this.referenceNumber().trim()) return;
            const result: CheckoutDialogResult = {
                paymentMethod: 'GCASH',
                referenceNumber: this.referenceNumber().trim(),
                amountTendered: this.data.total,
                changeDue: 0,
                cashAmount: 0,
                gcashAmount: this.data.total
            };
            this.dialogRef.close(result);
            return;
        }

        if (method === 'CASH') {
            const tendered = this.amountTendered();
            if (tendered === null || tendered < this.data.total) return;
            const result: CheckoutDialogResult = {
                paymentMethod: 'CASH',
                amountTendered: tendered,
                changeDue: this.changeDue(),
                cashAmount: this.data.total,
                gcashAmount: 0
            };
            this.dialogRef.close(result);
            return;
        }

        if (method === 'SPLIT') {
            if (!this.isSplitBalanced() || !this.splitGcashRef().trim()) return;
            const cashPart = Number(this.splitCashAmount() || 0);
            const gcashPart = Number(this.splitGcashAmount() || 0);
            const tendered = this.splitCashTendered();

            const splitDetails: SplitPaymentDetails = {
                cashAmount: cashPart,
                gcashAmount: gcashPart,
                referenceNumber: this.splitGcashRef().trim(),
                cashTendered: tendered ?? cashPart,
                changeDue: this.splitCashChangeDue()
            };

            const result: CheckoutDialogResult = {
                paymentMethod: 'SPLIT',
                referenceNumber: this.splitGcashRef().trim(),
                amountTendered: tendered ?? cashPart,
                changeDue: this.splitCashChangeDue(),
                cashAmount: cashPart,
                gcashAmount: gcashPart,
                splitDetails
            };
            this.dialogRef.close(result);
        }
    }
}
