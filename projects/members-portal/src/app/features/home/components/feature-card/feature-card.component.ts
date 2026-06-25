import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-feature-card',
    standalone: true,
    template: `
    <div class="card-surface h-full flex flex-col items-center justify-center text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(212,175,55,0.2)] border border-bg-surface-alt hover:border-gold-primary/50 group min-h-[160px]">
      <i class="material-icons text-5xl text-gold-primary mb-4 group-hover:scale-110 transition-transform duration-300">{{ icon }}</i>
      <h3 class="text-lg font-oswald font-medium text-text-primary m-0 uppercase tracking-wider group-hover:text-gold-light transition-colors">{{ title }}</h3>
    </div>
  `
})
export class FeatureCardComponent {
    @Input() icon = '';
    @Input() title = '';
}
