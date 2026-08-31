import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable } from 'rxjs';
import { SettingsService } from '../../../../core/services/settings.service';
import { BadgeService } from '../../../../core/services/badge.service';
import { DiscountService } from '../../../../core/services/discount.service';
import { ProductService } from '../../../../core/services/product.service';
import { AuthService } from '../../../../core/services/auth.service';
import { BadgeDefinition } from '../../../../core/models/badge.model';
import { DiscountRule } from '../../../../core/models/discount.model';
import { Product } from '../../../../core/models/store.model';
import { fadeIn } from '../../../../core/animations/animations';

@Component({
    selector: 'app-general-settings',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatSnackBarModule,
        MatTabsModule,
        MatTableModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatChipsModule,
        MatTooltipModule
    ],
    templateUrl: './general-settings.html',
    styleUrl: './general-settings.css',
    animations: [fadeIn]
})
export class GeneralSettingsComponent implements OnInit {
    private fb = inject(FormBuilder);
    private settingsService = inject(SettingsService);
    private badgeService = inject(BadgeService);
    private discountService = inject(DiscountService);
    private productService = inject(ProductService);
    private snackBar = inject(MatSnackBar);
    private functions = inject(Functions);
    private router = inject(Router);
    authService = inject(AuthService);

    // General Settings Form
    settingsForm: FormGroup = this.fb.group({
        monthlyQuota: [0, [Validators.required, Validators.min(0)]],
        defaultDailySalaryRate: [500, [Validators.required, Validators.min(0)]]
    });

    // Badge Form
    badgeForm: FormGroup = this.fb.group({
        id: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_]+$/)]],
        name: ['', [Validators.required]],
        description: [''],
        colorHex: ['#06b6d4', [Validators.required]],
        type: ['ADMINISTRATIVE', [Validators.required]],
        visibility: ['PUBLIC', [Validators.required]]
    });

    // Discount Rule Form
    discountForm: FormGroup = this.fb.group({
        id: [''],
        name: ['', [Validators.required]],
        description: [''],
        active: [true],
        triggerType: ['TAG_BASED', [Validators.required]],
        targetTags: [[]],
        scope: ['ALL_PRODUCTS', [Validators.required]],
        applicableCategories: [[]],
        applicableProductIds: [[]],
        calculationType: ['PERCENTAGE', [Validators.required]],
        discountValue: [0, [Validators.min(0)]],
        priceLocksJson: ['{}'],
        minimumQuantity: [null, [Validators.min(1)]],
        priority: [0, [Validators.required, Validators.min(0)]]
    });

    // Data streams
    badges$: Observable<BadgeDefinition[]> = this.badgeService.getBadges();
    discounts$: Observable<DiscountRule[]> = this.discountService.getDiscounts();
    products$: Observable<Product[]> = this.productService.getProducts();

    // Table column lists
    badgeColumns = ['id', 'name', 'type', 'visibility', 'color', 'actions'];
    discountColumns = ['name', 'trigger', 'priority', 'scope', 'calc', 'status', 'actions'];

    // UI state toggles
    isSaving = false;
    isLoggingOut = false;
    isProcessingBadges = false;
    showBadgeForm = signal(false);
    showDiscountForm = signal(false);
    isEditingDiscount = signal(false);
    isEditingBadge = signal(false);

    categories = ['Training', 'Supplements', 'Drinks', 'Boxing'];

    async ngOnInit() {
        try {
            const settings = await this.settingsService.getSettingsOnce();
            this.settingsForm.patchValue(settings);
        } catch (error) {
            console.error('Error loading settings:', error);
            this.snackBar.open('Error loading settings', 'Close', { duration: 3000 });
        }
    }

    async saveSettings() {
        if (this.settingsForm.invalid) return;

        this.isSaving = true;
        try {
            await this.settingsService.saveSettings(this.settingsForm.value);
            this.snackBar.open('Settings saved successfully', 'Close', { duration: 3000 });
        } catch (error) {
            console.error('Error saving settings:', error);
            this.snackBar.open('Error saving settings', 'Close', { duration: 3000 });
        } finally {
            this.isSaving = false;
        }
    }

    async forceLogoutAll() {
        if (!confirm('ARE YOU SURE? This will immediately log out ALL users from ALL devices.')) {
            return;
        }

        this.isLoggingOut = true;
        const emergencyLogoutAll = httpsCallable(this.functions, 'emergencyLogoutAll');

        try {
            const result: any = await emergencyLogoutAll();
            this.snackBar.open(`Success: Force logged out ${result.data.userCount} users.`, 'Close', { duration: 5000 });
        } catch (error: any) {
            console.error('Force logout failed:', error);
            this.snackBar.open(`Failed: ${error.message}`, 'Close', { duration: 5000 });
        } finally {
            this.isLoggingOut = false;
        }
    }

    async retroactiveBadges() {
        if (!confirm('Are you sure you want to run the retroactive badge processing? This will analyze all gym check-ins since January 2026 for all members.')) {
            return;
        }

        this.isProcessingBadges = true;
        const retroFn = httpsCallable(this.functions, 'retroactivelyProcessAllBadges');

        try {
            const result: any = await retroFn();
            if (result.data?.success) {
                this.snackBar.open(`Success: Processed ${result.data.processedMembers} members.`, 'Close', { duration: 5000 });
            }
        } catch (error: any) {
            console.error('Retroactive badge processing failed:', error);
            this.snackBar.open(`Failed: ${error.message}`, 'Close', { duration: 5000 });
        } finally {
            this.isProcessingBadges = false;
        }
    }

    // Badge Actions
    openNewBadge() {
        this.isEditingBadge.set(false);
        this.badgeForm.reset({
            id: '',
            name: '',
            description: '',
            colorHex: '#06b6d4',
            type: 'ADMINISTRATIVE',
            visibility: 'PUBLIC'
        });
        this.badgeForm.get('id')?.enable();
        this.showBadgeForm.set(true);
    }

    editBadge(badge: BadgeDefinition) {
        this.isEditingBadge.set(true);
        this.badgeForm.patchValue(badge);
        this.badgeForm.get('id')?.disable();
        this.showBadgeForm.set(true);
    }

    async deleteBadge(badge: BadgeDefinition) {
        if (!badge.id) return;
        if (!confirm(`Are you sure you want to delete badge "${badge.name}"?`)) return;
        try {
            await this.badgeService.deleteBadgeDefinition(badge.id);
            this.snackBar.open('Badge deleted successfully', 'Close', { duration: 2000 });
        } catch (err) {
            console.error('Failed to delete badge', err);
            this.snackBar.open('Failed to delete badge', 'Close', { duration: 3000 });
        }
    }

    async saveBadge() {
        if (this.badgeForm.invalid) return;
        this.isSaving = true;

        const badgeData = this.badgeForm.getRawValue() as BadgeDefinition;
        try {
            if (this.isEditingBadge()) {
                await this.badgeService.updateBadgeDefinition(badgeData.id, badgeData);
                this.snackBar.open('Badge updated successfully', 'Close', { duration: 2000 });
            } else {
                await this.badgeService.addBadgeDefinition(badgeData);
                this.snackBar.open('Badge created successfully', 'Close', { duration: 2000 });
            }
            this.showBadgeForm.set(false);
        } catch (err) {
            console.error('Error saving badge:', err);
            this.snackBar.open('Failed to save badge', 'Close', { duration: 3000 });
        } finally {
            this.isSaving = false;
        }
    }

    // Discount Actions
    openNewDiscount() {
        this.isEditingDiscount.set(false);
        this.discountForm.reset({
            id: '',
            name: '',
            description: '',
            active: true,
            triggerType: 'TAG_BASED',
            targetTags: [],
            scope: 'ALL_PRODUCTS',
            applicableCategories: [],
            applicableProductIds: [],
            calculationType: 'PERCENTAGE',
            discountValue: 0,
            priceLocksJson: '{}',
            minimumQuantity: null,
            priority: 0
        });
        this.showDiscountForm.set(true);
    }

    editDiscount(rule: DiscountRule) {
        this.isEditingDiscount.set(true);
        const rawLocks = rule.priceLocks ? JSON.stringify(rule.priceLocks, null, 2) : '{}';
        this.discountForm.patchValue({
            ...rule,
            priceLocksJson: rawLocks,
            priority: rule.priority ?? 0
        });
        this.showDiscountForm.set(true);
    }

    async toggleDiscountActive(rule: DiscountRule) {
        if (!rule.id) return;
        try {
            await this.discountService.updateDiscountRule(rule.id, { active: !rule.active });
            this.snackBar.open(`Promo ${!rule.active ? 'activated' : 'deactivated'}`, 'Close', { duration: 2000 });
        } catch (err) {
            console.error('Failed to toggle active status', err);
            this.snackBar.open('Failed to update status', 'Close', { duration: 3000 });
        }
    }

    async deleteDiscount(rule: DiscountRule) {
        if (!rule.id) return;
        if (!confirm(`Are you sure you want to delete "${rule.name}"?`)) return;

        try {
            await this.discountService.deleteDiscountRule(rule.id);
            this.snackBar.open('Promo deleted successfully', 'Close', { duration: 2000 });
        } catch (err) {
            console.error('Failed to delete rule', err);
            this.snackBar.open('Failed to delete rule', 'Close', { duration: 3000 });
        }
    }

    async saveDiscount() {
        if (this.discountForm.invalid) return;

        let priceLocksObj = {};
        const formVal = this.discountForm.value;
        if (formVal.calculationType === 'PRICE_LOCK') {
            try {
                priceLocksObj = JSON.parse(formVal.priceLocksJson || '{}');
            } catch (e) {
                this.snackBar.open('Invalid JSON format in Price Locks field', 'Close', { duration: 3000 });
                return;
            }
        }

        this.isSaving = true;
        const discountRule: Omit<DiscountRule, 'id'> & { id?: string } = {
            name: formVal.name,
            description: formVal.description || '',
            active: formVal.active,
            triggerType: formVal.triggerType,
            targetTags: formVal.targetTags || [],
            scope: formVal.scope,
            applicableCategories: formVal.applicableCategories || [],
            applicableProductIds: formVal.applicableProductIds || [],
            calculationType: formVal.calculationType,
            discountValue: formVal.discountValue || 0,
            priceLocks: priceLocksObj,
            minimumQuantity: formVal.minimumQuantity || undefined,
            priority: formVal.priority ?? 0
        };

        try {
            if (this.isEditingDiscount()) {
                await this.discountService.updateDiscountRule(formVal.id, discountRule);
                this.snackBar.open('Promo rule updated successfully', 'Close', { duration: 2000 });
            } else {
                await this.discountService.addDiscountRule(discountRule);
                this.snackBar.open('Promo rule created successfully', 'Close', { duration: 2000 });
            }
            this.showDiscountForm.set(false);
        } catch (err) {
            console.error('Error saving promo rule:', err);
            this.snackBar.open('Failed to save promo rule', 'Close', { duration: 3000 });
        } finally {
            this.isSaving = false;
        }
    }

    goBack() {
        this.router.navigate(['/dashboard']);
    }
}
