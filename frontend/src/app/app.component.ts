import { Component, HostListener, OnInit } from '@angular/core';
import { CoreModule } from '@app/core/core.module';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

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
        { label: 'ECC Simulation', route: '/simulation', icon: 'line_axis' },
        { label: 'Attacks', route: '/attacks', icon: 'security' },
        // { label: 'Documentation', route: '/docs', icon: 'library_books' },
    ];

    constructor(private router: Router, private uidService: UidService) { }

    async ngOnInit(): Promise<void> {
        this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
            this.checkViewPortAndToggleSidebar();
        });
        await this.uidService.getUid().subscribe((uid: string) => {
            this.uidService.saveUid(uid);
        });
        this.opened = localStorage.getItem('opened') === 'true';
    }

    @HostListener('window:resize')
    onResize(): void {
        this.checkViewPortAndToggleSidebar();
    }

    checkViewPortAndToggleSidebar(): void {
        const vpWidth = window.innerWidth;
        if (vpWidth <= 600) {
            this.opened = false;
        }
    }

    toggleSidebar(): void {
        this.opened = !this.opened;
        this.opened ? localStorage.setItem('opened', 'true') : localStorage.removeItem('opened');
    }

    isActive(route: string): boolean {
        return this.router.url === route;
    }
}
