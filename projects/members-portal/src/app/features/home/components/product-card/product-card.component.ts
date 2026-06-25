import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-product-card',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="card-surface p-0 overflow-hidden flex flex-col h-full transition-all duration-300 hover:-translate-y-2 hover:border-gold-primary border-bg-surface-alt">
      <div class="h-48 bg-cover bg-center relative" [style.backgroundImage]="'url(' + image + ')'">
        <div class="absolute inset-0 bg-gradient-to-t from-bg-surface to-transparent"></div>
      </div>
      <div class="p-6 flex-1 flex flex-col">
        <h3 class="text-2xl font-oswald text-gold-primary mb-2 uppercase">{{ title }}</h3>
        <p class="text-xl font-bold text-text-primary mb-4" *ngIf="price">{{ price }}</p>
        
        <ul class="list-none p-0 m-0 flex-1 space-y-2 mb-6" *ngIf="features.length">
          <li *ngFor="let feature of features" class="text-text-secondary text-sm flex items-start">
            <span class="text-gold-primary mr-2 font-bold">•</span> {{ feature }}
          </li>
        </ul>
        
        <button class="btn-secondary w-full hover:bg-gold-primary hover:text-black hover:border-gold-primary transition-colors mt-auto">
          View Details
        </button>
      </div>
    </div>
  `
})
export class ProductCardComponent {
    @Input() image = '';
    @Input() title = '';
    @Input() price = '';
    @Input() features: string[] = [];
}
