import { inject, Injectable } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private breakpointObserver = inject(BreakpointObserver);

  /**
   * Reactive signal that is true when the screen size matches mobile or tablet.
   * We observe (max-width: 1024px) to make sure both mobile viewports and portrait tablets (like iPad)
   * get the mobile/tablet bottom navigation bar/drawer shell rather than desktop sidebar.
   */
  readonly isMobile = toSignal(
    this.breakpointObserver.observe('(max-width: 1024px)').pipe(
      map(result => result.matches)
    ),
    { initialValue: false }
  );
}
