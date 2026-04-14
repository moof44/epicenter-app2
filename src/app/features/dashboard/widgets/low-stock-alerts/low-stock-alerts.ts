import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProductService } from '../../../../core/services/product.service';

@Component({
    selector: 'app-low-stock-alerts',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './low-stock-alerts.html',
    styleUrl: './low-stock-alerts.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LowStockAlertsWidget {
    private productService = inject(ProductService);
    private router = inject(Router);

    private products = toSignal(this.productService.getProducts(), { initialValue: [] });

    lowStockProducts = computed(() =>
        this.products()
            .filter(p => p.stock <= (p.minStockLevel || 0))
            .sort((a, b) => a.stock - b.stock)
    );

    count = computed(() => this.lowStockProducts().length);
    criticalCount = computed(() => this.lowStockProducts().filter(p => p.stock <= 0).length);
    displayProducts = computed(() => this.lowStockProducts().slice(0, 3));
    extraCount = computed(() => Math.max(this.count() - 3, 0));
    hasAlerts = computed(() => this.count() > 0);
    hasCritical = computed(() => this.criticalCount() > 0);
    isHealthy = computed(() => this.count() === 0 && this.products().length > 0);

    navigateToManage(): void {
        this.router.navigate(['/store/manage']);
    }
}
