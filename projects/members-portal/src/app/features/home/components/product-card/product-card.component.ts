import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-product-card',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="product-card">
      <div class="product-image" [style.backgroundImage]="'url(' + image + ')'"></div>
      <div class="product-content">
        <h3 class="product-title">{{ title }}</h3>
        <p class="product-price" *ngIf="price">{{ price }}</p>
        <ul class="product-features" *ngIf="features.length">
          <li *ngFor="let feature of features">
            <span class="bullet">•</span> {{ feature }}
          </li>
        </ul>
        <button class="cta-button">View Details</button>
      </div>
    </div>
  `,
    styles: [`
    .product-card {
      background: var(--surface-card);
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border-subtle);
      transition: all 0.3s ease;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .product-card:hover {
      border-color: var(--primary-gold);
      transform: translateY(-5px);
    }

    .product-image {
      height: 200px;
      background-size: cover;
      background-position: center;
      position: relative;
    }

    .product-image::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 50%;
      background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
    }

    .product-content {
      padding: 1.5rem;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .product-title {
      font-size: 1.4rem;
      color: var(--primary-gold);
      margin: 0 0 0.5rem 0;
      font-family: 'Oswald', sans-serif;
    }

    .product-price {
      font-size: 1.2rem;
      color: var(--text-primary);
      font-weight: bold;
      margin-bottom: 1rem;
    }

    .product-features {
      list-style: none;
      padding: 0;
      margin: 0 0 1.5rem 0;
      flex: 1;
    }

    .product-features li {
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
      display: flex;
      align-items: flex-start;
      font-size: 0.9rem;
    }

    .bullet {
      color: var(--primary-gold);
      margin-right: 0.5rem;
    }

    .cta-button {
      background: transparent;
      border: 1px solid var(--primary-gold);
      color: var(--primary-gold);
      width: 100%;
      padding: 0.8rem;
      text-transform: uppercase;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s;
    }

    .cta-button:hover {
      background: var(--primary-gold);
      color: black;
    }
  `]
})
export class ProductCardComponent {
    @Input() image: string = '';
    @Input() title: string = '';
    @Input() price: string = '';
    @Input() features: string[] = [];
}
