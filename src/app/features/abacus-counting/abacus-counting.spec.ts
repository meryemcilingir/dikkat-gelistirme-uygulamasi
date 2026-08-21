import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AbacusCountingComponent } from './abacus-counting.component';

describe('AbacusCountingComponent', () => {
  let component: AbacusCountingComponent;
  let fixture: ComponentFixture<AbacusCountingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AbacusCountingComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(AbacusCountingComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
