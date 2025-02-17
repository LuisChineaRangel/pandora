import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CoreModule, Point } from '@app/core/core.module';
import { FormBuilder, FormControl, FormGroup, FormArray, Validators } from '@angular/forms';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { HttpResponse } from '@angular/common/http';
import Chart, { ChartConfiguration } from 'chart.js/auto';
import { MatTableDataSource } from '@angular/material/table';
import { Clipboard } from '@angular/cdk/clipboard';

import { UidService } from '@services/uid.service';
import { CurveService } from '@services/curve.service';
import { chartOptions, calculateConfig, displayCurve, dsConfig } from '@app/core/utils/chart';
import { primeValidator } from '@app/core/utils/validators';
import { languages, options, string_format, special, Alphabet, NumericSystem } from '@app/core/utils/alphabet';
import { firstValueFrom } from 'rxjs';


export interface EncryptionTable {
    character: string;
    encoded: string;
    encrypted?: string;
}

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
    sendForm: FormGroup;
    receiveForm: FormGroup;
    selectedCategoryControl: FormControl = new FormControl();

    points: Point[] = [];
    languages: { [key: string]: string } = languages;
    numericSystems: { [key: string]: string | number } = { ...string_format, ...special };
    options: { [key: string]: boolean } = options;
    alphabet: Alphabet | NumericSystem | undefined = undefined;

    @ViewChild('Curve', { static: true }) curveChartRef: ElementRef<HTMLCanvasElement> | any;
    @ViewChild('Points', { static: true }) pointsChartRef: ElementRef<HTMLCanvasElement> | any;
    @ViewChild('Alphabet', { static: true }) alphabetRef: ElementRef | any;

    c_chart: any;
    p_chart: any;

    loading_curve: boolean = false;
    loading_points: boolean = false;
    selected_sender: boolean = false;

    curves_data: { [key: string]: { a: number, b: number, field?: number } } = {
        'SECP256k1': { a: 0, b: 7 },
        'Curve448': { a: 156326, b: 1 },
        'Curve25519': { a: 486662, b: 1 },
    };

    encryptionResults = new MatTableDataSource<any>();
    decryption_keys: { key: Point, party: number }[] = [];

    isVertical: boolean = false;

    constructor(private fb: FormBuilder, private uidService: UidService, private curveService: CurveService, private breakpointObserver: BreakpointObserver, private clipboard: Clipboard) {
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
            num_parties: ['', [Validators.required, Validators.min(2), Validators.max(4)]],
            partyDetails: this.fb.array([]),
            shared: [''],
        });
        this.secretsForm.disable();
        this.sendForm = this.fb.group({
            sender: ['', [Validators.required]],
            receivers: ['', [Validators.required]],
            message: ['', [Validators.required]]
        });
        this.sendForm.get('sender')?.disable();
        this.sendForm.get('receivers')?.disable();
        this.receiveForm = this.fb.group({
            encrypted: ['', [Validators.required]],
            private_key: ['', [Validators.required, Validators.min(1)]],
            decryption_key: ['', [Validators.required]],
            decrypted: [''],
        });
        this.receiveForm.disable();
    }

    async ngOnInit() {
        this.uid = this.uidService.loadUid();
        await this.uidService.renewUid(this.uid).subscribe((uid: string) => {
            this.uidService.saveUid(uid);
        });
        this.c_chart = new Chart(this.curveChartRef.nativeElement.getContext('2d'), {} as ChartConfiguration);
        this.p_chart = new Chart(this.pointsChartRef.nativeElement.getContext('2d'), {} as ChartConfiguration);
        this.breakpointObserver.observe(['(max-width: 600px)']).subscribe((state: BreakpointState) => {
            this.isVertical = state.matches;
        });
    }

    ngAfterViewInit() {
        this.curveForm.valueChanges.subscribe(() => {
            this.onSubmitCurve();
        });
        this.baseForm.valueChanges.subscribe(() => {
            this.onSubmitBase();
        });
        this.secretsForm.get('num_parties')?.valueChanges.subscribe(async (numParties: number) => {
            if (numParties < 2 || numParties > 4) return;
            await this.updatePartyDetails(numParties);
            if (this.p_chart) {
                this.p_chart.data.datasets = this.p_chart.data.datasets.filter((dataset: any) => dataset.label === "ECC Points" || dataset.label === "Base Point");
                this.p_chart.update();
            }
        });
        this.selectedCategoryControl.valueChanges.subscribe(() => {
            this.alphabetRef.nativeElement.value = String();
            this.alphabet = undefined;
        });
        this.sendForm.get('sender')?.valueChanges.subscribe(() => {
            this.selected_sender = !!this.sendForm.get('sender')?.valid;
            this.selected_sender ? this.sendForm.get('receivers')?.enable() : this.sendForm.get('receivers')?.disable();
            if (!this.selected_sender)
                this.sendForm.get('receivers')?.reset();
        });
        this.sendForm.valueChanges.subscribe(() => {
            this.getEncryptionResults();
        });
        this.receiveForm.get('encrypted')?.valueChanges.subscribe(() => {
            this.getDecryptionResults();
        });
        this.receiveForm.get('private_key')?.valueChanges.subscribe(() => {
            this.getDecryptionResults();
        });
        this.receiveForm.get('decryption_key')?.valueChanges.subscribe(() => {
            this.getDecryptionResults();
        });
    }

    loadCurveData(curve: string) {
        this.curveForm.patchValue(this.curves_data[curve]);
        this.onSubmitCurve();
    }

    copyValues(type: string) {
        this.clipboard.copy(this.encryptionResults.data.map((data: EncryptionTable) => data[type as keyof EncryptionTable]).join(''));
    }

    async onSubmitCurve() {
        if (this.curveForm.valid) {
            const formValue = this.curveForm.value;
            this.loading_curve = true;
            try {
                const curve_res: HttpResponse<any> = await firstValueFrom(this.curveService.makeCurve(this.uid, formValue.a, formValue.b, formValue.field));
                if (curve_res.status === 200) {
                    console.log(curve_res.body);
                    this.drawCChart();
                    this.loading_points = true;
                    const points_res: HttpResponse<any> = await firstValueFrom(this.curveService.getPoints(this.uid));
                    if (points_res.status === 200) {
                        this.points = points_res.body.points.map((data: string) => {
                            const point = JSON.parse(data);
                            return new Point(point.x, point.y);
                        });
                        this.drawPChart();
                    }
                }
            }
            catch (error: any) {
                if (error.status === 400 || error.status === 404) {
                    const errorMessage = error.error || 'An error occurred';
                    console.log(errorMessage);
                }
            }
            this.loading_curve = false;
            this.loading_points = false;
            this.baseForm.reset();
            this.baseForm.enable();
        }
        else {
            this.baseForm.reset();
            this.baseForm.disable();
            this.secretsForm.reset();
            this.secretsForm.disable();
            this.sendForm.reset();
            this.sendForm.get('sender')?.disable();
            this.sendForm.get('receivers')?.disable();
            this.receiveForm.reset();
            this.receiveForm.disable();
        }
    }

    drawCChart() {
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
    }

    drawPChart() {
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
            this.secretsForm.reset();
            this.secretsForm.disable();
            this.sendForm.reset();
            this.sendForm.get('sender')?.disable();
            this.sendForm.get('receivers')?.disable();
            this.receiveForm.reset();
            this.receiveForm.disable();
        }
    }

    updatePartyDetails(numParties: number): void {
        this.secretsForm.get('partyDetails')?.reset();
        this.secretsForm.get('shared')?.reset();
        this.sendForm.reset();
        this.sendForm.get('sender')?.disable();
        this.sendForm.get('receivers')?.disable();
        this.encryptionResults = new MatTableDataSource<any>();

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

                try {
                    const res: HttpResponse<any> = await firstValueFrom(this.curveService.getSharedKey(this.uid, privateKey, sharedKey.toJSON()));

                    if (res.status === 200) {
                        console.log(res.body.message);
                        let parsed = JSON.parse(res.body.shared_key);
                        sharedKey = new Point(parsed.x, parsed.y);
                    }
                    else if (res.status === 204) {
                        console.log("Invalid private key");
                        this.secretsForm.get('shared')?.setValue('(O)');
                    }

                    if (res.status !== 200) {
                        break_flag = true;
                        console.log(res.body);
                    }
                }
                catch (error: any) {
                    break_flag = true;
                    if (error.status === 400 || error.status === 404) {
                        const errorMessage = error.error || 'An error occurred';
                        console.log(errorMessage);
                    }
                }
                if (break_flag) break;
            }
            if (!break_flag) {
                this.secretsForm.get('shared')?.setValue(sharedKey.toString());
                this.sendForm.get('sender')?.enable();
                this.sendForm.get('receiver')?.disable();
                this.receiveForm.enable();
            }
        }
        return Promise.resolve();
    }

    updateKeysChart(numParties: number, partyDetailsArray: FormArray): void {
        // Search dataset with label "Public Keys" and remove all datasets after it
        this.p_chart.data.datasets = this.p_chart.data.datasets.filter((dataset: any) => dataset.label !== "Public Keys" && dataset.label !== "Shared Key");
        this.p_chart.update();

        let display_values: Point[] = [];
        for (let i = 0; i < numParties; i++) {
            if (!partyDetailsArray.at(i)) continue;
            let publicKey = partyDetailsArray.at(i).getRawValue()?.public_key;
            if (publicKey === '(O)' || !publicKey) continue;
            display_values.push(Point.fromString(publicKey));
        }

        if (display_values.length !== 0)
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
        if (this.alphabet)
            this.alphabetRef.nativeElement.value = this.alphabet.toString();
    }

    setOption(key: string) {
        for (let option in this.options)
            this.options[option] = false;
        this.options[key] = true;
        if (this.alphabet)
            this.alphabetRef.nativeElement.value = this.alphabet.toString();
    }

    async getEncryptionResults() {
        this.encryptionResults = new MatTableDataSource<any>();
        this.decryption_keys = [];

        let data = [];
        let message = this.sendForm.getRawValue().message;
        let encoded;

        let alphabet = this.alphabet?.toString();

        if (!this.sendForm.get('message')?.valid || message === "" || !message) return;
        try {
            const res: HttpResponse<any> = await firstValueFrom(this.curveService.encode(this.uid, message, alphabet as string));
            if (res.status === 200) {
                console.log(res.body.message);
                encoded = res.body.encoded;
                encoded.forEach((encoded_p: string, index: number) => {
                    let parsed = JSON.parse(encoded_p);
                    encoded[index] = new Point(parsed.x, parsed.y).toString();
                });
            }
        } catch (error: any) {
            if (error.status === 400 || error.status === 404) {
                const errorMessage = error.error || 'An error occurred';
                this.sendForm.get('message')?.setErrors({ customError: errorMessage });
                console.log(errorMessage);
            }
        }
        let sender = this.sendForm.get('sender')?.value;
        let receivers = this.sendForm.get('receivers')?.value;

        let public_keys = [];
        for (let i = 0; i < this.partyDetails.length; i++)
            public_keys.push(Point.fromString(this.partyDetails.at(i).getRawValue().public_key));

        const common_key = this.secretsForm.get('shared')?.value;

        let not_encrypt_flag = false;
        if ((!sender && sender !== 0) || !receivers || !encoded || !common_key || public_keys.length !== this.partyDetails.controls.length) not_encrypt_flag = true;

        let decryption_keys = [];
        let break_flag = false;
        let encrypted: string[] = [];

        if (!this.secretsForm.get('shared')?.value)
            not_encrypt_flag = true;

        if (!not_encrypt_flag && !break_flag) {
            let decryption_key = await Point.fromString(this.partyDetails.at(sender).get('public_key')?.value);
            let encryption_key = this.partyDetails.at(receivers).get('private_key')?.value;
            decryption_keys.push({ key: decryption_key, party: receivers });
            try {
                const res: HttpResponse<any> = await firstValueFrom(this.curveService.encrypt(this.uid, message, alphabet as string, encryption_key, decryption_key));
                if (res.status === 200) {
                    console.log(res.body.message);
                    let results = res.body.encrypted;
                    results.forEach((point: string) => {
                        let parsed = JSON.parse(point);
                        let encrypted_p = new Point(parsed.x, parsed.y).toString();
                        encrypted.push(encrypted_p);
                    });
                }
            }
            catch (error: any) {
                if (error.status === 400 || error.status === 404) {
                    const errorMessage = error.error || 'An error occurred';
                    console.log(errorMessage);
                    this.sendForm.get('message')?.setErrors({ customError: errorMessage });
                }
            }
        }

        for (let i = 0; i < encoded.length; i++) {
            data.push({
                character: message[i],
                encoded: encoded[i],
                encrypted: encrypted[i] || undefined,
            });
        }
        this.encryptionResults.data = data;
        this.decryption_keys = decryption_keys;
    }

    async getDecryptionResults() {
        if (!this.receiveForm.valid) return;
        let encrypted = this.receiveForm.get('encrypted')?.value;
        let private_key = this.receiveForm.get('private_key')?.value;
        let decryption_key = this.receiveForm.get('decryption_key')?.value;

        if (!encrypted || !private_key || !decryption_key) return;

        try {
            const res: HttpResponse<any> = await firstValueFrom(this.curveService.decrypt(this.uid, encrypted, this.alphabet?.toString() as string, private_key, Point.fromString(decryption_key)));
            if (res.status === 200) {
                console.log(res.body.message);
                this.receiveForm.get('decrypted')?.setValue(res.body.decrypted);
            }
        } catch (error: any) {
            if (error.status === 400 || error.status === 404) {
                const errorMessage = error.error || 'An error occurred';
                this.receiveForm.get('encrypted')?.setErrors({ customError: errorMessage });
                console.log(errorMessage);
            }
        }
    }
}
