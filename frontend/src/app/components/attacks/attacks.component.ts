import { Component, OnInit } from '@angular/core';
import { CoreModule, Point } from '@app/core/core.module';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { HttpResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';

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

    timeCounter: number = 0;

    errorBenchmark: string = String();

    curves_data: { [key: string]: { a: number, b: number, field: bigint, n: bigint, m: bigint, base: { x: bigint, y: bigint }, point_a: { x: bigint, y: bigint } } } = {
        'SECP256k1': {
            a: 0,
            b: 7,
            field: 115792089237316195423570985008687907853269984665640564039457584007908834671663n,
            n: 115792089237316195423570985008687907852837564279074904382605163141518161494337n,
            m: 340282366920938463463374607431768211455n,
            base: {
                x: 55066263022277343669578718895168534326250603453777594175500187360389116729240n,
                y: 32670510020758816978083085130507043184471273380659243275938904335757337482424n
            },
            point_a: {
                x: 21505829891763648114329055987619236494102133314575206970830385799158076338148n,
                y: 98003708678762621233683240503080860129026887322874138805529884920309963580118n
            }
        },
        "Curve448": {
            a: 156326,
            b: 1,
            field: 726838724295606890549323807888004534353641360687318060281490199180612328166730772686396383698676545930088884461843637361053498018365439n,
            n: 181709681073901722637330951972001133588410340171829515070372549795146003961539585716195755291692375963310293709091662304773755859649779n,
            m: 13479973333575319897333507543509815336818572211270286240551805124607n,
            base: {
                x: 5n,
                y: 35529392678556817526412750235081380130778569647988843218951531421051415125751n
            },
            point_a: {
                x: 673936523416081290120999371900466516106892990230349438597177751580130783170072725784790104836128219552803615584400462895047441936417157n,
                y: 191099231317703370060376051215513305468496789003104951808806869610090342268001519132838072492690955095788869794160354756677723211506674n,
            }
        },
        "Curve25519": {
            a: 486662,
            b: 1,
            field: 57896044618658097711785492504343953926634992332820282019728792003956564819949n,
            n: 7237005577332262213973186563042994240857116359379907606001950938285454250989n,
            m: 85070591730234615865843651857942052864n,
            base: {
                x: 9n,
                y: 28948022309329048855892746252171976963363056481941560715954676764349967630337n
            },
            point_a: {
                x: 11230807594379268910086358485694694951419473881869873502205616924862643004978n,
                y: 37007179164428750567294559964401039446177820452377850298166352325267280363192n
            }
        },
    };

    isVertical: boolean = false;

    constructor(private fb: FormBuilder, private attackService: AttacksService, private breakpointObserver: BreakpointObserver) {
        this.attackForm = this.fb.group({
            attackType: ['', [Validators.required]],
            attackNumTests: ['', [Validators.required, Validators.min(1)]],
            attackNumCurves: ['', [Validators.required, Validators.min(1)]],
            attackParams: this.fb.array([])
        });
        this.attackForm.disable();
    }

    ngOnInit(): void {
        this.breakpointObserver.observe(['(max-width: 600px)']).subscribe((state: BreakpointState) => {
            this.isVertical = state.matches;
        });
    }

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
                        Object.assign(data, { m: [curveData.m.toString(), [Validators.required]] });
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
        this.timeCounter = 0;
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
        let intervalId = setInterval(() => {
            this.timeCounter++;
        }, 1000);
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
        if (intervalId)
            clearInterval(intervalId);
        this.attackResults.data = data;
        this.loadingBenchmark = false;
    }
}
