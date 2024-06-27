import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function primeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (value !== null && !isPrime(value))
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
