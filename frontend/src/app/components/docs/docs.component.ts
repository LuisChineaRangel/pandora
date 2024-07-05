import { Component, OnInit } from '@angular/core';
import { CoreModule } from '@app/core/core.module';

@Component({
    selector: 'app-docs',
    standalone: true,
    imports: [CoreModule],
    templateUrl: './docs.component.html',
    styleUrl: './docs.component.scss'
})
export class DocsComponent implements OnInit {
    constructor() { }

    ngOnInit(): void {
    }
}
