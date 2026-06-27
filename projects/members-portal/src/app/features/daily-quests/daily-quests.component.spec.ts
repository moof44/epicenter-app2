import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyQuests } from './daily-quests';

describe('DailyQuests', () => {
  let component: DailyQuests;
  let fixture: ComponentFixture<DailyQuests>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyQuests]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailyQuests);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
