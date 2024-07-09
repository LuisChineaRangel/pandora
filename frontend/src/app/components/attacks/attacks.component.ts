import { Component, OnInit } from '@angular/core';
import { CoreModule, Point } from '@app/core/core.module';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { HttpResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';

import { AttacksService } from '@app/services/attacks.service';

@Component({
    selector: 'app-attacks',
    standalone: true,
    imports: [CoreModule],
    templateUrl: './attacks.component.html',
    styleUrl: './attacks.component.scss'
})

export class AttacksComponent implements OnInit {
    attackForm: FormGroup;
    attackTypes: string[] = ['SETUP', 'Pohlig-Hellman', 'Baby-Step Giant-Step'];
    attackResults: MatTableDataSource<any> = new MatTableDataSource<any>();

    selectedAttack: string = String();
    selectedCurve: string = String();

    loadingData: boolean = false;
    loadingBenchmark: boolean = false;

    errorBenchmark: string = String();

    curves_data: { [key: string]: { a: number, b: number, field: bigint, n: bigint, m: number, base: { x: bigint, y: bigint }, point_a: { x: bigint, y: bigint } } } = {
        'SECP256k1': {
            a: 0,
            b: 7,
            field: 115792089237316195423570985008687907853269984665640564039457584007908834671663n,
            n: 7917n,
            m: 89,
            base: {
                x: 121n,
                y: 3020n
            },
            point_a: {
                x: 1514n,
                y: 2234n
            }
        },
        "Curve448": {
            a: 156326,
            b: 1,
            field: 726838724295606890549323807888004534353641360687318060281490199180612328166730772686396383698676545930088884461843637361053498018365439n,
            n: 7873n,
            m: 127,
            base: {
                x: 8126n,
                y: 2849n
            },
            point_a: {
                x: 1421n,
                y: 6356n
            }
        },
        "Curve25519": {
            a: 486662,
            b: 1,
            field: 5419n,
            n: 5407n,
            m: 323,
            base: {
                x: 9n,
                y: 14781619447589544791020593568409986887264606134616475288964881837755586237401n,
            },
            point_a: {
                x: 9n,
                y: 1n
            }
        },
    };

    constructor(private fb: FormBuilder, private attackService: AttacksService) {
        this.attackForm = this.fb.group({
            attackType: ['', [Validators.required]],
            attackNumTests: ['', [Validators.required, Validators.min(1)]],
            attackNumCurves: ['', [Validators.required, Validators.min(1)]],
            attackParams: this.fb.array([])
        });
        this.attackForm.disable();
    }

    ngOnInit(): void { }

    ngAfterViewInit(): void {
        this.attackForm.get('attackNumCurves')?.valueChanges.subscribe(async (value) => {
            if (!this.loadingData) {
                this.attackParams.clear();
                for (let i = 0; i < value; i++) {
                    let params = {
                        a: ['', [Validators.required]],
                        b: ['', [Validators.required]],
                        field: ['', [Validators.required, Validators.min(2)]],
                        n: ['', [Validators.required, Validators.min(1)]],
                        base: ['', [Validators.required]],
                    }
                    if (this.selectedAttack === 'Pohlig-Hellman' || this.selectedAttack === 'Baby-Step Giant-Step')
                        Object.assign(params, { point_a: ['', [Validators.required]] });
                    if (this.selectedAttack === 'Baby-Step Giant-Step')
                        Object.assign(params, { m: ['', [Validators.required]] });
                    this.attackParams.push(this.fb.group(params));
                }
            }
            else {
                this.loadingData = false;
                if (!this.attackParams.get('attackNumTests')?.value)
                    this.attackForm.get('attackNumTests')?.setValue(1);
                if (this.selectedCurve) {
                    let curveData = this.curves_data[this.selectedCurve];
                    let data = {
                        a: [curveData.a, [Validators.required]],
                        b: [curveData.b, [Validators.required]],
                        field: [curveData.field.toString(), [Validators.required, Validators.min(2)]],
                        n: [curveData.n.toString(), [Validators.required, Validators.min(1)]],
                        base: [`(${curveData.base.x.toString()},${curveData.base.y.toString()})`, [Validators.required]],
                    }
                    if (this.selectedAttack === 'Pohlig-Hellman' || this.selectedAttack === 'Baby-Step Giant-Step')
                        Object.assign(data, { point_a: [`(${curveData.point_a.x.toString()},${curveData.point_a.y.toString()})`, [Validators.required]] });
                    if (this.selectedAttack === 'Baby-Step Giant-Step')
                        Object.assign(data, { m: [curveData.m, [Validators.required]] });
                    this.attackParams.push(this.fb.group(data));
                }
            }
        });
    }

    async loadCurveData(curve: string) {
        this.loadingData = true;
        this.selectedCurve = curve;
        let numCurves = this.attackForm.get('attackNumCurves')?.value;
        await this.attackForm.get('attackNumCurves')?.setValue(numCurves + 1);
        this.selectedCurve = String();
    }

    selectAttack(attackType: string): void {
        this.attackForm.reset();
        if (!this.attackTypes.includes(attackType)) return;
        this.selectedAttack = attackType;
        this.attackForm.enable();
        this.attackForm.get('attackType')?.setValue(attackType);
    }

    get attackParams(): FormArray {
        return this.attackForm.get('attackParams') as FormArray;
    }

    getFormKeys(formGroup: AbstractControl): string[] {
        return Object.keys((formGroup as FormGroup).controls);
    }

    async runAttackBenchmark(): Promise<void> {
        if (this.attackForm.invalid) return;
        this.errorBenchmark = String();
        this.loadingBenchmark = true;
        const attackType = this.attackForm.get('attackType')?.value;
        const attackNumTests = this.attackForm.get('attackNumTests')?.value;
        const attackNumCurves = this.attackForm.get('attackNumCurves')?.value;
        const attackParams = this.attackForm.get('attackParams') as FormArray;

        const curves: any[] = [];
        for (let i = 0; i < attackNumCurves; i++) {
            const curve = attackParams.at(i) as FormGroup;
            const a = curve.get('a')?.value;
            const b = curve.get('b')?.value;
            const field = curve.get('field')?.value;
            const n = curve.get('n')?.value;
            const m = curve.get('m')?.value;
            const base = Point.fromString(curve.get('base')?.value);
            if (this.selectedAttack === 'Pohlig-Hellman' || this.selectedAttack === 'Baby-Step Giant-Step') {
                const point_a = Point.fromString(curve.get('point_a')?.value);
                curves.push({ a, b, field, n, m, base, point_a });
            }
            else {
                curves.push({ a, b, field, n, base });
            }
        }

        let data = [];
        try {
            const res: HttpResponse<any> = await firstValueFrom(this.attackService.runAttackBenchmark(attackType, attackNumTests, attackNumCurves, curves));

            if (res.status === 200) {
                console.log(res.body.message);
                for (let result of res.body.results) {
                    data.push({
                        curve: result.curve,
                        a: result.a,
                        b: result.b,
                        field: result.field,
                        successes: result.successes,
                        failures: result.failures,
                        rate: result.rate,
                        time: result.time
                    });
                }
            }
            else {
                console.error('Attack Benchmark Failed!');
                console.error(res);
                this.errorBenchmark = `Attack Benchmark Failed! ${res.statusText}`;
            }
        }
        catch (error) {
            console.error(error);
            this.errorBenchmark = `Attack Benchmark Failed!`
        }
        this.attackResults.data = data;
        this.loadingBenchmark = false;
    }
}
