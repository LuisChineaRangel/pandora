import { Component, OnInit } from '@angular/core';
import { CoreModule } from '@app/core/core.module';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Chart from 'chart.js/auto';

import { UidService } from '@services/uid.service';
import { CurveService } from '@services/curve.service';
import { filter } from 'rxjs';

@Component({
    selector: 'app-simulation',
    standalone: true,
    imports: [CoreModule],
    templateUrl: './simulation.component.html',
    styleUrl: './simulation.component.scss'
})
export class SimulationComponent implements OnInit {
    uid: string = String();
    curveForm: FormGroup;
    baseForm: FormGroup;

    constructor(private fb: FormBuilder, private uidService: UidService, private curveService: CurveService) {
        this.curveForm = this.fb.group({
            a: ['', [Validators.required]],
            b: ['', [Validators.required]],
            field: ['', [Validators.required]],
        });
        this.baseForm = this.fb.group({
            base: [''],
        });
    }

    ngOnInit() {
        this.uid = this.uidService.loadUid();
        this.curveForm.valueChanges.subscribe(() => {
            this.onSubmit();
        });
    }

    async onSubmit() {
        if (this.curveForm.valid) {
            const formValue = this.curveForm.value;
            await this.curveService.makeCurve(this.uid, formValue.a, formValue.b, formValue.field).subscribe(async(res) => {
                console.log(res);
                await this.curveService.getPoints(this.uid).subscribe((points) => {
                    console.log(points);
                });
            });
        }
    }
}
