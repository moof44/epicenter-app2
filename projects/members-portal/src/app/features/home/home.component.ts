import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FeatureCardComponent } from './components/feature-card/feature-card.component';
import { ProductCardComponent } from './components/product-card/product-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FeatureCardComponent, ProductCardComponent],
  template: `
    <div class="min-h-screen bg-bg-primary text-text-primary overflow-x-hidden font-inter">
      <!-- Top Navigation -->
      <header class="fixed top-0 left-0 right-0 z-50 bg-bg-surface/90 backdrop-blur-md border-b border-bg-surface-alt h-16 flex items-center justify-between px-6 shadow-md transition-all">
        <div class="flex items-center gap-3">
          <img src="assets/logo.png" alt="Epicenter Gym" class="w-8 h-8 filter drop-shadow">
          <span class="font-oswald text-xl font-black tracking-wider uppercase text-gold-primary">EPICENTER</span>
        </div>
        <a routerLink="/login" class="btn-primary !h-10 !text-sm !px-6 gold-glow">
          Member Login
        </a>
      </header>

      <!-- Hero Section -->
      <section class="relative h-[85vh] flex items-center justify-center text-center mt-16">
        <div class="absolute inset-0 z-0">
          <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-bg-primary z-10"></div>
          <img src="assets/hero.png" alt="Gym Hero" class="w-full h-full object-cover">
        </div>
        <div class="relative z-20 flex flex-col items-center px-4 max-w-4xl mx-auto">
          <img src="assets/logo.png" alt="Epicenter Gym Logo" class="w-32 h-32 md:w-48 md:h-48 mb-6 filter drop-shadow-[0_0_20px_rgba(212,175,55,0.3)] animate-fade-in">
          <h1 class="text-4xl md:text-6xl lg:text-7xl font-oswald font-black uppercase tracking-widest mb-4">
            Welcome to <span class="text-transparent bg-clip-text bg-gradient-to-b from-gold-light via-gold-primary to-gold-dark filter drop-shadow-md">Epicenter</span>
          </h1>
          <p class="text-lg md:text-xl text-text-secondary font-light tracking-wide mb-10 max-w-2xl">
            Premium Fitness. Science Based. Results Driven.
          </p>
          <a routerLink="/login" class="btn-primary !text-lg !px-10 !py-4 shadow-[0_4px_20px_rgba(212,175,55,0.4)] hover:shadow-[0_6px_25px_rgba(212,175,55,0.6)] transform hover:-translate-y-1 transition-all flex items-center justify-center">
            Join Now
          </a>
        </div>
      </section>

      <!-- Features Section -->
      <section class="py-20 px-6 max-w-7xl mx-auto">
        <div class="text-center mb-16 relative">
          <h2 class="text-3xl md:text-4xl font-oswald font-bold uppercase tracking-wider text-text-primary inline-block">
            Why Choose Us?
          </h2>
          <div class="w-16 h-1 bg-gold-primary mx-auto mt-4 rounded-full"></div>
        </div>
        
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
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
      <section class="py-20 px-6 max-w-7xl mx-auto bg-bg-surface-alt/30 rounded-3xl mb-20 border border-bg-surface-alt">
        <div class="text-center mb-16 relative">
          <h2 class="text-3xl md:text-4xl font-oswald font-bold uppercase tracking-wider text-text-primary inline-block">
            Memberships & Products
          </h2>
          <div class="w-16 h-1 bg-gold-primary mx-auto mt-4 rounded-full"></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
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
      
      <!-- Simple Footer -->
      <footer class="py-8 text-center text-text-muted border-t border-bg-surface-alt bg-bg-surface">
        <p class="text-sm font-oswald tracking-widest uppercase">&copy; 2026 Epicenter Gym. All Rights Reserved.</p>
      </footer>
    </div>
  `
})
export class HomeComponent { }
