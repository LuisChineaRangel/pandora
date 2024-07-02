import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { SERVER_URL } from '@app/app.config';
import { Observable } from 'rxjs';
import { Point } from 'chart.js';
@Injectable({
    providedIn: 'root',
})
export class CurveService {
    private curveURL: string = SERVER_URL;
    constructor(private http: HttpClient) { }

    makeCurve(uid: string, a: string, b: string, field: string): Observable<HttpResponse<string>> {
        return this.http.post<string>(`${this.curveURL}/api/curve`, { uid, a, b, field }, { observe: 'response' });
    }

    getPoints(uid: string): Observable<HttpResponse<any>> {
        return this.http.get<any>(`${this.curveURL}/api/curve/points`, { params: { uid } });
    }

    setBase(uid: string, base: Point): Observable<HttpResponse<any>> {
        return this.http.post<any>(`${this.curveURL}/api/curve/base`, { uid, x: base.x, y: base.y }, { observe: 'response' });
    }

    getPublicKey(uid: string, i: number, privateKey: number): Observable<HttpResponse<any>> {
        return this.http.post<any>(`${this.curveURL}/api/curve/public`, { uid, i, privateKey }, { observe: 'response' });
    }

    getSharedKey(uid: string, privateKey: number, sharedKey: string): Observable<HttpResponse<any>> {
        return this.http.post<any>(`${this.curveURL}/api/curve/shared`, { uid, privateKey, sharedKey }, { observe: 'response' });
    }

    encode(uid: string, message: string, alphabet: string): Observable<HttpResponse<any>> {
        return this.http.post<any>(`${this.curveURL}/api/curve/encode`, { uid, message, alphabet }, { observe: 'response' });
    }

    encrypt(uid: string, message: string, alphabet: string, encrypt: number | Point, decrypt: Point, multiple: boolean = false): Observable<HttpResponse<any>> {
        if (multiple)
            return this.http.post<any>(`${this.curveURL}/api/curve/encrypt`, { uid, message, alphabet, encrypt, decrypt }, { observe: 'response' });
        return this.http.post<any>(`${this.curveURL}/api/curve/encrypt`, { uid, message, alphabet, privateKey: encrypt, publicKey: decrypt }, { observe: 'response' });
    }
}
