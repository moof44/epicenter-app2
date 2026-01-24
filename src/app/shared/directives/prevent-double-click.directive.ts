import { Directive, HostListener, Input, ElementRef, Renderer2, Output, EventEmitter, inject } from '@angular/core';

@Directive({
    selector: '[appPreventDoubleClick]',
    standalone: true
})
export class PreventDoubleClickDirective {
    @Input() throttleTime = 2000; // Default 2 seconds throttle
    @Output() throttledClick = new EventEmitter<Event>();

    private el = inject(ElementRef);
    private renderer = inject(Renderer2);

    constructor() { }

    @HostListener('click', ['$event'])
    clickEvent(event: Event) {
        event.preventDefault();
        event.stopPropagation();

        if (this.el.nativeElement.getAttribute('disabled') === 'true' || this.el.nativeElement.disabled) {
            return;
        }

        // Emit the click event
        this.throttledClick.emit(event);

        // Disable the button
        this.renderer.setAttribute(this.el.nativeElement, 'disabled', 'true');
        this.renderer.addClass(this.el.nativeElement, 'disabled-click');

        // Re-enable after throttle time
        setTimeout(() => {
            this.renderer.removeAttribute(this.el.nativeElement, 'disabled');
            this.renderer.removeClass(this.el.nativeElement, 'disabled-click');
        }, this.throttleTime);
    }
}
