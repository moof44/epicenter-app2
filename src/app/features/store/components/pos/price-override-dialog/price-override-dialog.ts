import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';

export interface PriceOverrideDialogData {
    productName: string;
    currentPrice: number;
    originalPrice: number;
}

export interface PriceOverrideDialogResult {
    newPrice: number;
    reason: string;
}

@Component({
    selector: 'app-price-override-dialog',
    imports: [
        CommonModule, MatDialogModule, MatButtonModule, MatIconModule,
        MatInputModule, MatFormFieldModule, FormsModule
    ],
    templateUrl: './price-override-dialog.html',
    styleUrl: './price-override-dialog.css'
})
export class PriceOverrideDialog {
    readonly dialogRef = inject(MatDialogRef<PriceOverrideDialog>);
    readonly data = inject<PriceOverrideDialogData>(MAT_DIALOG_DATA);

    newPrice = signal<number>(this.data.currentPrice);
    reason = signal('');

    cancel(): void {
        this.dialogRef.close();
    }

    confirm(): void {
        const result: PriceOverrideDialogResult = {
            newPrice: this.newPrice(),
            reason: this.reason()
        };
        this.dialogRef.close(result);
    }
}
