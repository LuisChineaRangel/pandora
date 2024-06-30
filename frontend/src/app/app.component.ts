import { Component, OnInit } from '@angular/core';
import { CoreModule } from '@app/core/core.module';
import { Router } from '@angular/router';

import { UidService } from '@services/uid.service';

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
    currentRoute: string = 'home';
    sidebarLinks: { label: string, route: string, icon?: string }[] = [
        { label: 'Home', route: '/home', icon: 'home' },
        { label: 'ECC Simulation', route: '/simulation', icon: 'line_axis' },
        { label: 'Documentation', route: '/documentation', icon: 'library_books' },
    ];

    constructor(private router: Router, private uidService: UidService) { }

    async ngOnInit(): Promise<void> {
        await this.uidService.getUid().subscribe((uid: string) => {
            this.uidService.saveUid(uid);
        });
        this.opened = localStorage.getItem('opened') === 'true';
    }

    toggleSidebar(): void {
        this.opened = !this.opened;
        this.opened ? localStorage.setItem('opened', 'true') : localStorage.removeItem('opened');
    }

    isActive(route: string): boolean {
        return this.router.url === route;
    }
}
