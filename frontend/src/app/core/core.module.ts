import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from '@app/core/app.routes';
import { MaterialModule } from '@app/core/material.module';
export { Point } from '@app/core/utils/point';
export { Alphabet } from '@app/core/utils/alphabet';

@NgModule({
    declarations: [],
    imports: [CommonModule, AppRoutingModule, MaterialModule, ReactiveFormsModule],
    exports: [CommonModule, AppRoutingModule, MaterialModule, ReactiveFormsModule],
    providers: [],
})

export class CoreModule { }
