import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SERVER_URL } from '@app/app.config';
import { Observable } from 'rxjs';
@Injectable({
    providedIn: 'root',
})
export class CurveService {
    private curveURL: string = SERVER_URL;
    constructor(private http: HttpClient) { }

    makeCurve(uid: string, a: string, b: string, field: string): Observable<string> {
        return this.http.post<string>(`${this.curveURL}/api/curve`, { uid, a, b, field });
    }

    getPoints(uid: string): Observable<any> {
        return this.http.get<any>(`${this.curveURL}/api/curve/points`, { params: { uid } });
    }
}
