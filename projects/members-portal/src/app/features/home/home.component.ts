import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeatureCardComponent } from './components/feature-card/feature-card.component';
import { ProductCardComponent } from './components/product-card/product-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FeatureCardComponent, ProductCardComponent],
  template: `
    <div class="home-container">
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <h1>Welcome to <span class="gold-text">Epicenter</span></h1>
          <p class="hero-subtitle">Premium Fitness. Science Based. Results Driven.</p>
          <button class="cta-button">Join Now</button>
        </div>
      </section>

      <!-- Features Grid -->
      <section class="section features-section">
        <h2 class="section-title">Why Choose Us?</h2>
        <div class="features-grid">
          <app-feature-card icon="wifi" title="Free Wifi"></app-feature-card>
          <app-feature-card icon="directions_car" title="Parking"></app-feature-card>
          <app-feature-card icon="aspect_ratio" title="Spacious"></app-feature-card>
          <app-feature-card icon="attach_money" title="Low Fees"></app-feature-card>
          <app-feature-card icon="health_and_safety" title="Monthly Assessment"></app-feature-card>
          <app-feature-card icon="school" title="Certified Coaches"></app-feature-card>
          <app-feature-card icon="sports_mma" title="Boxing Area"></app-feature-card>
          <app-feature-card icon="fitness_center" title="Duplicate Equipment"></app-feature-card>
          <app-feature-card icon="monitor_heart" title="Cardio Zone"></app-feature-card>
          <app-feature-card icon="science" title="Science Based"></app-feature-card>
          <app-feature-card icon="checkroom" title="Locker Rooms"></app-feature-card>
          <app-feature-card icon="videocam" title="24/7 CCTV"></app-feature-card>
        </div>
      </section>

      <!-- Products & Services -->
      <section class="section products-section">
        <h2 class="section-title">Memberships & Products</h2>
        <div class="products-grid">
          <app-product-card 
            image="assets/training.png"
            title="Personal Training"
            price="Flexible Rates"
            [features]="['Certified Coaches', 'Custom Plans', 'Results Tracking']">
          </app-product-card>
          
          <app-product-card 
            image="assets/boxing.png"
            title="Boxing & Circuit"
            price="Included"
            [features]="['Boxing Area', 'Punching Bag', 'HIIT Circuit']">
          </app-product-card>

          <app-product-card 
            image="assets/products.png"
            title="Consumables"
            price="Store Prices"
            [features]="['Protein Shakes', 'Coffee + Stevia', 'Shirataki Rice']">
          </app-product-card>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .home-container {
      background-color: var(--bg-dark);
      min-height: 100vh;
    }

    /* Hero Section */
    .hero-section {
      height: 80vh;
      background-image: url('/assets/hero.png');
      background-size: cover;
      background-position: center;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .hero-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.8));
    }

    .hero-content {
      position: relative;
      z-index: 10;
      padding: 0 1rem;
    }

    h1 {
      font-size: 3rem;
      margin-bottom: 0.5rem;
    }

    .gold-text {
      color: var(--primary-gold);
    }

    .hero-subtitle {
      font-size: 1.2rem;
      margin-bottom: 2rem;
      color: var(--text-secondary);
    }

    .cta-button {
      background: var(--primary-gold);
      color: black;
      border: none;
      padding: 1rem 2.5rem;
      font-size: 1.1rem;
      font-weight: bold;
      text-transform: uppercase;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s;
    }

    .cta-button:hover {
      background: #fff;
      color: black;
      transform: scale(1.05);
    }

    /* Sections */
    .section {
      padding: 4rem 1.5rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .section-title {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 3rem;
      color: var(--text-primary);
      position: relative;
      display: inline-block;
      left: 50%;
      transform: translateX(-50%);
    }

    .section-title::after {
      content: '';
      display: block;
      width: 60px;
      height: 3px;
      background: var(--primary-gold);
      margin: 10px auto 0;
    }

    /* Features Grid */
    .features-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr); /* Mobile: 2 columns */
      gap: 1rem;
    }

    @media (min-width: 768px) {
      .features-grid {
        grid-template-columns: repeat(4, 1fr); /* Tablet/Desktop: 4 columns */
        gap: 1.5rem;
      }
    }

    /* Products Grid */
    .products-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2rem;
    }

    @media (min-width: 768px) {
      .products-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
  `]
})
export class HomeComponent { }
