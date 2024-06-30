import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CoreModule, Point } from '@app/core/core.module';
import { FormBuilder, FormControl, FormGroup, FormArray, Validators } from '@angular/forms';
import { HttpResponse } from '@angular/common/http';
import Chart, { Legend } from 'chart.js/auto';

import { UidService } from '@services/uid.service';
import { CurveService } from '@services/curve.service';
import { chartOptions, calculateConfig, displayCurve, dsConfig } from '@app/core/utils/chart';
import { primeValidator } from '@app/core/utils/validators';
import { languages, options, string_format, special, Alphabet, NumericSystem } from '@app/core/utils/alphabet';

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
    options: { [key: string]: boolean } = options;

    @ViewChild('Curve', { static: true }) curveChartRef: ElementRef<HTMLCanvasElement> | any;
    @ViewChild('Points', { static: true }) pointsChartRef: ElementRef<HTMLCanvasElement> | any;
    @ViewChild('Alphabet', { static: true }) alphabetRef: ElementRef | any;

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
    alphabet: Alphabet | NumericSystem = new Alphabet();

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
        this.selectedCategoryControl.valueChanges.subscribe((category: string) => {
            this.alphabetRef.nativeElement.value = String();
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
                            label: "ECC Points",
                            data: this.points,
                            backgroundColor: "rgba(0, 0, 255, 1)",
                            order: 99,
                        },
                    ],
                },
                options: chartOptions(-1, x_max, -1, y_max, {}, true),
            });
        }
        this.loading_points = false;
        this.baseForm.enable();
    }

    async onSubmitBase() {
        // Reset secrets form and remove all public keys and shared key from chart
        this.secretsForm.reset();
        if (this.p_chart)
            for (let i = this.p_chart.data.datasets.length - 1; i > 0; i--)
                this.p_chart.data.datasets.pop();

        if (this.baseForm.valid) {
            const formValue = this.baseForm.value;
            await this.curveService.setBase(this.uid, formValue.base).subscribe((res: HttpResponse<any>) => {
                console.log(res.body);
                this.p_chart.data.datasets[1] = {
                    label: "Base Point",
                    data: [formValue.base],
                    backgroundColor: "rgba(255, 0, 0, 1)",
                    radius: 7,
                    order: 97,
                };
                this.p_chart.update();
            });
            this.secretsForm.enable();
            this.secretsForm.get('shared')?.disable();
        }
        else {
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
                this.updateKeysChart(numParties, partyDetailsArray);
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
                    let steps: Point[] = [];
                    res.body.steps.forEach((step: string) => {
                        steps.push(new Point(JSON.parse(step).x, JSON.parse(step).y));
                    });
                    // Search dataset with label "Steps" and remove it
                    this.p_chart.data.datasets = this.p_chart.data.datasets.filter((dataset: any) => dataset.label !== `Steps for Party ${i + 1}`);
                    this.p_chart.update();

                    this.p_chart.data.datasets.push({
                        type: "line",
                        label: `Steps for Party ${i + 1}`,
                        data: steps,
                        backgroundColor: "rgba(255, 240, 0, 1)",
                        borderColor: "rgba(255, 240, 0, 0.5)",
                        radius: 5,
                        order: 98,
                        animation: false,
                        fill: false,
                    });
                    this.p_chart.update();
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

    updateKeysChart(numParties: number, partyDetailsArray: FormArray): void {
        // Search dataset with label "Public Keys" and remove all datasets after it
        this.p_chart.data.datasets = this.p_chart.data.datasets.filter((dataset: any) => dataset.label !== "Public Keys" && dataset.label !== "Shared Key");
        this.p_chart.update();

        let display_values: Point[] = [];
        for (let i = 0; i < numParties; i++) {
            let publicKey = partyDetailsArray.at(i).getRawValue().public_key;
            if (publicKey === '(O)') continue;
            display_values.push(Point.fromString(publicKey));
        }

        this.p_chart.data.datasets.push({
            label: "Public Keys",
            data: display_values,
            backgroundColor: "rgba(78, 232, 223, 1)",
            radius: 7,
            order: 2,
            animation: false,
        });

        let sharedKey = this.secretsForm.getRawValue().shared;
        if (sharedKey && sharedKey !== '(O)') {
            let sharedKey = Point.fromString(this.secretsForm.getRawValue().shared);
            this.p_chart.data.datasets.push({
                label: "Shared Key",
                data: [sharedKey],
                backgroundColor: "rgba(78, 232, 25, 1)",
                radius: 7,
                order: 1,
                animation: false,
            });
        }

        this.p_chart.update();
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

    setAlphabet(key: string) {
        if (this.selectedCategoryControl.value === "numeric")
            this.alphabet = new NumericSystem(key);
        if (this.selectedCategoryControl.value === "alphabet")
            this.alphabet = new Alphabet(key);
        this.alphabetRef.nativeElement.value = this.alphabet.toString();
    }

    setOption(key: string) {
        this.options[key] = !this.options[key];
        this.alphabetRef.nativeElement.value = this.alphabet.toString();
    }
}
