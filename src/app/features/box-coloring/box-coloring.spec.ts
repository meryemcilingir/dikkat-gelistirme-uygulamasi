import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BoxColoringComponent } from './box-coloring.component';

describe('BoxColoringComponent', () => {
  let component: BoxColoringComponent;
  let fixture: ComponentFixture<BoxColoringComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoxColoringComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(BoxColoringComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
