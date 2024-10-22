import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ClipboardModule } from '@angular/cdk/clipboard';

import { AppRoutingModule } from '@app/core/app.routes';
import { MaterialModule } from '@app/core/material.module';
export { Point } from '@app/core/utils/point';
export { Alphabet } from '@app/core/utils/alphabet';

@NgModule({
    declarations: [],
    imports: [CommonModule, AppRoutingModule, MaterialModule, ReactiveFormsModule, ClipboardModule],
    exports: [CommonModule, AppRoutingModule, MaterialModule, ReactiveFormsModule, ClipboardModule],
    providers: [],
})

export class CoreModule { }
