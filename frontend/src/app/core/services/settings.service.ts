import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { ApiService } from './api.service';
import { PublicSettings } from '../models/models';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly api = inject(ApiService);
  private cache$: Observable<PublicSettings> | null = null;

  publicSettings(): Observable<PublicSettings> {
    if (!this.cache$) this.cache$ = this.api.get<PublicSettings>('/settings/public').pipe(shareReplay(1));
    return this.cache$;
  }

  invalidate(): void {
    this.cache$ = null;
  }
}
