import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, Page } from '../models/models';

type Params = Record<string, string | number | boolean | null | undefined>;

/** Thin wrapper over HttpClient that unwraps the { success, data, meta } envelope. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = environment.apiUrl;

  private params(p?: Params): HttpParams {
    let hp = new HttpParams();
    if (p) {
      Object.entries(p).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') hp = hp.set(k, String(v));
      });
    }
    return hp;
  }

  get<T>(path: string, params?: Params): Observable<T> {
    return this.http.get<ApiResponse<T>>(this.baseUrl + path, { params: this.params(params) }).pipe(map((r) => r.data));
  }

  page<T>(path: string, params?: Params): Observable<Page<T>> {
    return this.http
      .get<ApiResponse<T[]>>(this.baseUrl + path, { params: this.params(params) })
      .pipe(map((r) => ({ items: r.data, meta: r.meta ?? { page: 1, limit: r.data.length, total: r.data.length, totalPages: 1 } })));
  }

  post<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.post<ApiResponse<T>>(this.baseUrl + path, body).pipe(map((r) => r.data));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<ApiResponse<T>>(this.baseUrl + path, body).pipe(map((r) => r.data));
  }

  patch<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.patch<ApiResponse<T>>(this.baseUrl + path, body).pipe(map((r) => r.data));
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(this.baseUrl + path).pipe(map((r) => r.data));
  }

  download(path: string, params?: Params): Observable<Blob> {
    return this.http.get(this.baseUrl + path, { params: this.params(params), responseType: 'blob' });
  }
}
