import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function primeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (value !== null && !lehmanPeraltaTest(value))
            return { primeError: true };
        return null;
    };
}

function isPrime(num: number): boolean {
    if (num <= 1) return false;
    if (num <= 3) return true;
    if (num % 2 === 0 || num % 3 === 0) return false;
    for (let i = 5; i * i <= num; i += 6)
        if (num % i === 0 || num % (i + 2) === 0) return false;
    return true;
}

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
    let result: bigint = 1n;
    base = base % modulus;
    while (exponent > 0) {
        if (exponent % 2n === 1n)
            result = (result * base) % modulus;
        exponent = exponent >> 1n;
        base = (base * base) % modulus;
    }
    return result;
}

function lehmanPeraltaTest(numStr: string, k: number = 10): boolean {
    let n = BigInt(numStr);
    if (n <= 1n) return false;
    if (n <= 3n) return true;
    if (n % 2n === 0n) return false;
    for (let i = 0; i < k; i++) {
        let a = BigInt(Math.floor(Math.random() * (Number(n) - 3))) + 2n;
        let x = modPow(a, (n - 1n) / 2n, n);
        if (x === 0n || x === n - 1n)
            continue;
        let y = modPow(x, 2n, n);
        if (y !== 1n && y !== n - 1n)
            return false;
    }

    return true;
}
