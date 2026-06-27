import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GamificationLedger } from './gamification-ledger';

describe('GamificationLedger', () => {
  let component: GamificationLedger;
  let fixture: ComponentFixture<GamificationLedger>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GamificationLedger]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GamificationLedger);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
