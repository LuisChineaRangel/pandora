import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CoreModule, Point } from '@app/core/core.module';
import { FormBuilder, FormControl, FormGroup, FormArray, Validators } from '@angular/forms';
import { HttpResponse } from '@angular/common/http';
import Chart from 'chart.js/auto';

import { UidService } from '@services/uid.service';
import { CurveService } from '@services/curve.service';
import { chartOptions, calculateConfig, displayCurve, dsConfig } from '@app/core/utils/chart';
import { primeValidator } from '@app/core/utils/validators';
import { languages, string_format, special, Alphabet, NumericSystem } from '@app/core/utils/alphabet';

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
    secretsForm: FormGroup;
    points: Point[] = [];
    languages: { [key: string]: string } = languages;
    numericSystems: { [key: string]: string | number } = { ...string_format, ...special };

    @ViewChild('Curve', { static: true }) curveChartRef: ElementRef<HTMLCanvasElement> | any;
    @ViewChild('Points', { static: true }) pointsChartRef: ElementRef<HTMLCanvasElement> | any;

    c_chart: any;
    p_chart: any;

    loading_curve: boolean = false;
    loading_points: boolean = false;

    curves_data: { [key: string]: { a: number, b: number, field?: number } } = {
        'SECP256k1': { a: 0, b: 7 },
        'Curve448': { a: 1, b: 2 },
        'Curve25519': { a: 5, b: 7 },
    };

    selectedCategoryControl: FormControl = new FormControl();
    alphabet: string = String();

    constructor(private fb: FormBuilder, private uidService: UidService, private curveService: CurveService) {
        this.curveForm = this.fb.group({
            a: ['', [Validators.required]],
            b: ['', [Validators.required]],
            field: ['', [Validators.required, Validators.min(2), primeValidator()]],
        });
        this.baseForm = this.fb.group({
            base: ['', [Validators.required]],
        });
        this.baseForm.disable();
        this.secretsForm = this.fb.group({
            num_parties: ['', [Validators.required, Validators.min(2), Validators.max(5)]],
            partyDetails: this.fb.array([]),
            shared: [''],
        });
        this.secretsForm.disable();
    }

    async ngOnInit() {
        this.uid = this.uidService.loadUid();
        await this.uidService.renewUid(this.uid).subscribe((uid: string) => {
            this.uidService.saveUid(uid);
        });
    }

    ngAfterViewInit() {
        this.curveForm.valueChanges.subscribe(() => {
            this.onSubmitCurve();
        });
        this.baseForm.valueChanges.subscribe(() => {
            this.onSubmitBase();
        });
        this.secretsForm.get('num_parties')?.valueChanges.subscribe((numParties: number) => {
            this.updatePartyDetails(numParties);
        });
    }

    loadCurveData(curve: string) {
        this.curveForm.patchValue(this.curves_data[curve]);
        this.onSubmitCurve();
    }

    async onSubmitCurve() {
        if (this.curveForm.valid) {
            const formValue = this.curveForm.value;
            await this.curveService.makeCurve(this.uid, formValue.a, formValue.b, formValue.field).subscribe(async (res: HttpResponse<string>) => {
                console.log(res.body);
                this.drawCChart();
                await this.curveService.getPoints(this.uid).subscribe(async (res: any) => {
                    this.points = res.points.map((data: string) => {
                        const point = JSON.parse(data);
                        return new Point(point.x, point.y);
                    });
                    this.drawPChart();
                });
            });
            this.baseForm.reset();
            this.baseForm.enable();
        }
        else {
            this.baseForm.reset();
            this.baseForm.disable();
            this.secretsForm.reset();
            this.secretsForm.disable();
        }
    }

    drawCChart() {
        this.loading_curve = true;
        const config = calculateConfig(this.curveForm.value.a, this.curveForm.value.b);
        const [f_half, s_half] = displayCurve(this.curveForm.value.a, this.curveForm.value.b, config);
        const ctx = this.curveChartRef.nativeElement.getContext('2d');
        if (ctx) {
            this.c_chart?.destroy();
            this.c_chart = new Chart(ctx, {
                type: "line",
                data: {
                    datasets: [
                        dsConfig(f_half),
                        dsConfig(s_half),
                    ],
                },
                options: chartOptions(-config.range, config.range, -config.range, config.range, {
                    point: { radius: 0 },
                }),
            });
        }
        this.loading_curve = false;
    }

    drawPChart() {
        this.loading_points = true;
        const x_max = Math.max(...this.points.map(({ x }) => x)) + 1;
        const y_max = Math.max(...this.points.map(({ y }) => y)) + 1;
        const ctx = this.pointsChartRef.nativeElement.getContext('2d');
        if (ctx) {
            this.p_chart?.destroy();
            this.p_chart = new Chart(ctx, {
                type: "scatter",
                data: {
                    datasets: [
                        {
                            data: this.points,
                            backgroundColor: "rgba(0, 0, 255, 1)",
                            order: 2,
                        },
                    ],
                },
                options: chartOptions(-1, x_max, -1, y_max),
            });
        }
        this.loading_points = false;
        this.baseForm.enable();
    }

    async onSubmitBase() {
        if (this.baseForm.valid) {
            const formValue = this.baseForm.value;
            await this.curveService.setBase(this.uid, formValue.base).subscribe((res: HttpResponse<any>) => {
                console.log(res.body);
            });
            this.secretsForm.reset();
            this.secretsForm.enable();
            this.secretsForm.get('shared')?.disable();
        }
        else {
            this.secretsForm.reset();
            this.secretsForm.disable();
        }
    }

    updatePartyDetails(numParties: number): void {
        const partyDetailsArray = this.secretsForm.get('partyDetails') as FormArray;
        while (partyDetailsArray.length !== 0)
            partyDetailsArray.removeAt(0);
        for (let i = 0; i < numParties; i++) {
            partyDetailsArray.push(this.createPartyFormGroup());
            partyDetailsArray.at(i).get('public_key')?.valueChanges.subscribe(async () => {
                await this.getSharedKey(partyDetailsArray);
            });
            partyDetailsArray.at(i).get('private_key')?.valueChanges.subscribe(async (privateKey: number) => {
                await this.getPublicKey(i, privateKey, partyDetailsArray);
            });
            partyDetailsArray.at(i).get('public_key')?.disable();
        }
    }

    async getPublicKey(i: number, privateKey: number, partyDetailsArray: FormArray): Promise<void> {
        if (partyDetailsArray.at(i).get('private_key')?.valid) {
            await this.curveService.getPublicKey(this.uid, i, privateKey).subscribe((res: HttpResponse<any>) => {
                if (res.status === 200) {
                    console.log(res.body.message);
                    let publicKey = JSON.parse(res.body.public_key);
                    partyDetailsArray.at(i).get('public_key')?.setValue(`(${publicKey.x}, ${publicKey.y})`);
                }
                else if (res.status === 204) {
                    console.log("Invalid private key");
                    partyDetailsArray.at(i).get('public_key')?.setValue('(O)');
                }
            });
        }
        return Promise.resolve();
    }

    async getSharedKey(partyDetailsArray: FormArray): Promise<void> {
        for (let i = 0; i < partyDetailsArray.length; i++)
            if (!partyDetailsArray.at(i).get('private_key')?.valid) return Promise.resolve();

        let public_keys = [];
        for (let i = 0; i < partyDetailsArray.length; i++)
            public_keys.push(Point.fromString(partyDetailsArray.at(i).getRawValue().public_key));

        // If all public keys are available
        if (public_keys.length === partyDetailsArray.length) {
            let break_flag = false;
            // Calculate shared key between all parties
            let sharedKey = public_keys[0];
            for (let i = 1; i < partyDetailsArray.length; i++) {
                const privateKey = partyDetailsArray.at(i).get('private_key')?.value;
                await this.curveService.getSharedKey(this.uid, i, privateKey, sharedKey.toJSON()).subscribe((res: HttpResponse<any>) => {
                    if (res.status === 200) {
                        console.log(res.body.message);
                        sharedKey = new Point(res.body.shared_key.x, res.body.shared_key.y);
                    }
                    else if (res.status === 204) {
                        break_flag = true;
                        console.log("Invalid private key");
                        this.secretsForm.get('shared')?.setValue('(O)');
                    }
                    else {
                        break_flag = true;
                        console.log(res.body);
                    }
                });
                if (break_flag) break;
            }
            if (!break_flag)
                this.secretsForm.get('shared')?.setValue(`(${sharedKey.x}, ${sharedKey.y})`);
        }
        return Promise.resolve();
    }

    createPartyFormGroup(): FormGroup {
        return this.fb.group({
            private_key: ['', [Validators.required, Validators.min(1)]],
            public_key: ['', [Validators.required]],
        });
    }

    get partyDetails(): FormArray {
        return this.secretsForm.get('partyDetails') as FormArray;
    }

    onCategoryChange(category: string) {
        this.selectedCategoryControl.setValue(category);
    }

    setAlphabet(key : string) {
        this.alphabet = key;

    }
}
