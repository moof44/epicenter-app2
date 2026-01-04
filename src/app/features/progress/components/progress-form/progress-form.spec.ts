import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProgressForm } from './progress-form';
import { ProgressService } from '../../../../core/services/progress.service';
import { Router, ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { vi } from 'vitest';

describe('ProgressForm', () => {
  let component: ProgressForm;
  let fixture: ComponentFixture<ProgressForm>;
  let progressServiceMock: any;
  let routerMock: any;
  let activatedRouteMock: any;

  beforeEach(async () => {
    progressServiceMock = {
      addEntry: vi.fn().mockResolvedValue({})
    };

    activatedRouteMock = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue('123')
        }
      }
    };

    await TestBed.configureTestingModule({
      imports: [ProgressForm],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: ProgressService, useValue: progressServiceMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressForm);
    component = fixture.componentInstance;
    
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    routerMock = router;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.memberId).toBe('123');
  });

  it('should initialize the form with empty required fields', () => {
    expect(component.form).toBeDefined();
    expect(component.form.valid).toBeFalsy();
    expect(component.form.get('weight')?.hasError('required')).toBeTruthy();
  });

  it('should be valid when all fields are filled correctly', () => {
    component.form.patchValue({
      weight: 70,
      bodyFat: 20,
      visceralFat: 5,
      muscleMass: 40,
      bmi: 22,
      metabolism: 1500,
      bodyAge: 25
    });
    expect(component.form.valid).toBeTruthy();
  });

  it('should not submit if form is invalid', async () => {
    await component.onSubmit();
    expect(progressServiceMock.addEntry).not.toHaveBeenCalled();
  });

  it('should submit data and navigate on success', async () => {
    component.form.patchValue({
      weight: 70,
      bodyFat: 20,
      visceralFat: 5,
      muscleMass: 40,
      bmi: 22,
      metabolism: 1500,
      bodyAge: 25
    });

    await component.onSubmit();

    expect(component.loading).toBeTruthy(); // It was set to true during submit
    expect(progressServiceMock.addEntry).toHaveBeenCalledWith('123', expect.objectContaining({
      weight: 70,
      bodyFat: 20
    }));
    expect(routerMock.navigate).toHaveBeenCalledWith(['/members', '123', 'progress']);
  });

  it('should handle error during submission', async () => {
    progressServiceMock.addEntry.mockRejectedValue(new Error('Failed'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    component.form.patchValue({
      weight: 70,
      bodyFat: 20,
      visceralFat: 5,
      muscleMass: 40,
      bmi: 22,
      metabolism: 1500,
      bodyAge: 25
    });

    await component.onSubmit();

    expect(component.loading).toBeFalsy();
    expect(console.error).toHaveBeenCalled();
  });
});
