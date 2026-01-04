import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MemberForm } from './member-form';
import { MemberService } from '../../../../core/services/member.service';
import { Router, ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { vi } from 'vitest';

describe('MemberForm', () => {
  let component: MemberForm;
  let fixture: ComponentFixture<MemberForm>;
  let memberServiceMock: any;
  let routerMock: any;
  let activatedRouteMock: any;

  beforeEach(async () => {
    memberServiceMock = {
      getMember: vi.fn().mockReturnValue(of({ id: '123', name: 'John Doe', gender: 'Male', membershipStatus: 'Active', birthday: new Date() })),
      addMember: vi.fn().mockResolvedValue({ id: '456' }),
      updateMember: vi.fn().mockResolvedValue(undefined)
    };

    activatedRouteMock = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue(null) // Default to 'New' mode
        }
      }
    };

    await TestBed.configureTestingModule({
      imports: [MemberForm],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: MemberService, useValue: memberServiceMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MemberForm);
    component = fixture.componentInstance;
    
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    routerMock = router;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.isEditMode).toBeFalsy();
  });

  it('should initialize form invalid', () => {
    expect(component.form.valid).toBeFalsy();
  });

  it('should submit new member when valid', async () => {
    component.form.patchValue({
      name: 'Jane Doe',
      address: '123 St',
      contactNumber: '555-1234',
      gender: 'Female',
      birthday: new Date('1990-01-01'),
      membershipStatus: 'Active'
    });

    await component.onSubmit();
    
    expect(memberServiceMock.addMember).toHaveBeenCalled();
    expect(memberServiceMock.updateMember).not.toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/members']);
  });

  it('should load member in edit mode', () => {
     // Re-configure for edit mode would require restarting test env or overriding provider?
     // Or we can just call loadMember manually if we want to test that method logic.
     // But to test ngOnInit logic we need to mock ActivatedRoute BEFORE component init.
     // We can create a separate describe block or just override properties.
  });

  describe('Edit Mode', () => {
      beforeEach(() => {
          // Reset component for edit mode test?
          // Since TestBed is static per test suite usually unless reset. 
          // Vitest beforeEach runs before EACH test so we can override there? 
          // But TestBed setup is inside beforeEach.
          // To override for specific test:
          activatedRouteMock.snapshot.paramMap.get.mockReturnValue('123');
          // Re-create component
          fixture = TestBed.createComponent(MemberForm);
          component = fixture.componentInstance;
          fixture.detectChanges(); 
      });

      it('should initialize in edit mode', () => {
          expect(component.isEditMode).toBeTruthy();
          expect(memberServiceMock.getMember).toHaveBeenCalledWith('123');
      });

      it('should submit update when valid', async () => {
          component.form.patchValue({
            name: 'John Doe Updated',
            address: '123 St',
            contactNumber: '555-1234',
            gender: 'Male',
            birthday: new Date('1990-01-01'),
            membershipStatus: 'Active'
          });

          await component.onSubmit();
          expect(memberServiceMock.updateMember).toHaveBeenCalledWith('123', expect.any(Object));
          expect(memberServiceMock.addMember).not.toHaveBeenCalled();
      });
  });


  describe('Corner Cases', () => {
      it('should handle firestore timestamps in loadMember', () => {
          const mockTimestamp = { seconds: 1672531200, nanoseconds: 0 }; // 2023-01-01
          memberServiceMock.getMember.mockReturnValue(of({ 
              id: '123', 
              name: 'Test',
              birthday: mockTimestamp, 
              expiration: mockTimestamp 
          }));
          
          component.loadMember('123');
          
          const val = component.form.value;
          expect(val.birthday).toBeInstanceOf(Date);
          expect(val.expiration).toBeInstanceOf(Date);
          expect(val.birthday.getFullYear()).toBe(2023);
      });

      it('should handle standard dates (no seconds) in loadMember', () => {
          const date = new Date('2023-01-01');
          memberServiceMock.getMember.mockReturnValue(of({ 
              id: '123', 
              name: 'Test',
              birthday: date, 
              expiration: null 
          }));
          
          component.loadMember('123');
          
          const val = component.form.value;
          expect(val.birthday).toEqual(date);
          expect(val.expiration).toBeNull();
      });

      it('should handle error on submit', async () => {
           memberServiceMock.addMember.mockRejectedValue(new Error('Fail'));
           const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
           
           component.isEditMode = false;
           component.form.patchValue({
              name: 'Jane Doe',
              address: '123 St',
              contactNumber: '555-1234',
              gender: 'Female',
              birthday: new Date('1990-01-01'),
              membershipStatus: 'Active'
           });
           
           await component.onSubmit();
           
           expect(spy).toHaveBeenCalled();
           expect(component.loading).toBe(false);
      });

      it('should render validation errors when fields are touched', async () => {
          const nameControl = component.form.get('name');
          nameControl?.markAsTouched();
          fixture.detectChanges();
          
          const error = fixture.nativeElement.querySelector('mat-error');
          expect(error).toBeTruthy();
          expect(error.textContent).toContain('required');
      });
  });
});
