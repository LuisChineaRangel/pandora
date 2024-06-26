import { Component, OnInit } from '@angular/core';
import { CoreModule } from '@app/core/core.module';
import { Router } from '@angular/router';
@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CoreModule],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
    title: string = 'Pandora';
    opened: boolean = false;
    uid: string = String();
    currentRoute: string = 'home';
    sidebarLinks: { label: string, route: string, icon?: string }[] = [
        { label: 'Home', route: '/home', icon: 'home' },
        { label: 'ECC Simulation', route: '/simulation', icon: 'line_axis' },
        { label: 'Documentation', route: '/documentation', icon: 'library_books' },
    ];

    constructor(private router: Router) { }

    ngOnInit(): void {
        this.opened = localStorage.getItem('opened') === 'true' ? true : false;
    }

    toggleSidebar(): void {
        this.opened = !this.opened;
        localStorage.setItem('opened', this.opened.toString());
    }

    isActive(route: string): boolean {
        return this.router.url === route;
    }
}
