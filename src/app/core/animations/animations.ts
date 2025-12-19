import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

export const fadeIn = trigger('fadeIn', [
    transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
    ]),
]);

export const slideInOut = trigger('slideInOut', [
    transition('* <=> *', [
        style({ position: 'relative' }),
        query(':enter, :leave', [
            style({
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
            }),
        ], { optional: true }),
        query(':enter', [
            style({ left: '10px', opacity: 0 }),
        ], { optional: true }),
        query(':leave', [
            animate('300ms ease-out', style({ left: '-10px', opacity: 0 })),
        ], { optional: true }),
        query(':enter', [
            animate('300ms ease-out', style({ left: '0', opacity: 1 })),
        ], { optional: true }),
    ]),
]);

export const staggerList = trigger('staggerList', [
    transition('* => *', [
        query(':enter', [
            style({ opacity: 0, transform: 'translateY(10px)' }),
            stagger('50ms', [
                animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
            ]),
        ], { optional: true }),
    ]),
]);
