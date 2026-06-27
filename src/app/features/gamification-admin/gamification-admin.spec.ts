import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { GamificationAdmin } from './gamification-admin';
import { vi } from 'vitest';

describe('GamificationAdmin', () => {
  let component: GamificationAdmin;
  let fixture: ComponentFixture<GamificationAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GamificationAdmin],
      providers: [
        { provide: Firestore, useValue: {} }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GamificationAdmin);
    component = fixture.componentInstance;
    
    // Mock loadEconomyData using Vitest vi.spyOn
    vi.spyOn(component, 'loadEconomyData').mockImplementation(() => Promise.resolve());
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
