import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { SERVER_URL } from '@app/app.config';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AttacksService {
    private attackURL: string = SERVER_URL;

    constructor(private http: HttpClient) { }

    runAttackBenchmark(attackType: string, numTests: number, numCurves: number, params: any[]): Observable<HttpResponse<any>> {
        return this.http.post<any>(`${this.attackURL}/api/benchmark`, { attackType, numTests, numCurves, params }, { observe: 'response' });
    }
}
