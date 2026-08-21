import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CountAndAdd } from './count-and-add';

describe('CountAndAdd', () => {
  let component: CountAndAdd;
  let fixture: ComponentFixture<CountAndAdd>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CountAndAdd]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CountAndAdd);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
