import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-start-page',
    standalone: true,
    templateUrl: './start-page.component.html',
    styleUrl: './start-page.component.scss',
})
export class StartPageComponent implements OnInit {
    private auth = inject(AuthService);

    ngOnInit(): void {
        this.auth.goHome();
    }
}
