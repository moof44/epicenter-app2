import { trigger, transition, style, animate } from '@angular/animations';

export const rowAnimation = trigger('rowAnimation', [
  transition(':enter', [
    style({ height: 0, opacity: 0, transform: 'translateY(-8px)', overflow: 'hidden' }),
    animate('200ms cubic-bezier(0.16, 1, 0.3, 1)', style({ height: '*', opacity: 1, transform: 'translateY(0)' }))
  ]),
  transition(':leave', [
    style({ height: '*', opacity: 1, overflow: 'hidden' }),
    animate('150ms cubic-bezier(0.16, 1, 0.3, 1)', style({ height: 0, opacity: 0, transform: 'translateY(-8px)' }))
  ])
]);

export const drawerAnimation = trigger('drawerAnimation', [
  transition(':enter', [
    style({ transform: 'translateY(20px)', opacity: 0 }),
    animate('250ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
  ]),
  transition(':leave', [
    style({ transform: 'translateY(0)', opacity: 1 }),
    animate('200ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateY(20px)', opacity: 0 }))
  ])
]);
