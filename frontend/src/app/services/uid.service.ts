import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SERVER_URL } from '@app/app.config';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class UidService {
    private uidURL: string = SERVER_URL + '/api/uid';
    constructor(private http: HttpClient) { }

    getUid(): Observable<string> {
        return this.http.get<string>(this.uidURL);
    }

    renewUid(uid: string): Observable<string> {
        return this.http.put<string>(this.uidURL, { uid });
    }

    saveUid(uid: string): void {
        localStorage.setItem('uid', uid);
    }

    loadUid(): string {
        return localStorage.getItem('uid') as string;
    }
}
