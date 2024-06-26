import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AppRoutingModule } from '@app/core/app.routes';
import { MaterialModule } from '@app/core/material.module';

@NgModule({
    declarations: [],
    imports: [CommonModule, AppRoutingModule, MaterialModule],
    exports: [CommonModule, AppRoutingModule, MaterialModule],
    providers: [],
})

export class CoreModule {}
