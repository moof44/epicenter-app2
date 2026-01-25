import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-feature-card',
    standalone: true,
    template: `
    <div class="feature-card">
      <i class="material-icons feature-icon">{{ icon }}</i>
      <h3 class="feature-title">{{ title }}</h3>
    </div>
  `,
    styles: [`
    .feature-card {
      background: var(--surface-card);
      border: 1px solid var(--border-gold);
      border-radius: 8px;
      padding: 1.5rem;
      text-align: center;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .feature-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 4px 20px rgba(212, 175, 55, 0.2);
    }

    .feature-icon {
      font-size: 3rem;
      color: var(--primary-gold);
      margin-bottom: 1rem;
    }

    .feature-title {
      font-size: 1.1rem;
      font-weight: 500;
      color: var(--text-primary);
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  `]
})
export class FeatureCardComponent {
    @Input() icon: string = '';
    @Input() title: string = '';
}
