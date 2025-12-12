import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  role: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080/api/v1/auth';
  
  // Segnale per l'access token
  private tokenSignal = signal<string | null>(this.loadTokenFromStorage());
  token = this.tokenSignal.asReadonly();
  
  // Segnale per il refresh token
  private refreshTokenSignal = signal<string | null>(this.loadRefreshTokenFromStorage());
  
  // Segnale per lo stato di caricamento
  isLoading = signal(false);
  
  // Segnale per gli errori
  error = signal<string | null>(null);

  constructor() {
    // Carica il token dal localStorage all'avvio
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      this.tokenSignal.set(savedToken);
    }
  }

  /**
   * Effettua il login con Basic Auth
   */
  login(username: string, password: string): Observable<AuthResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    const credentials = btoa(`${username}:${password}`); // Codifica Basic Auth
    const headers = {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    };

    return this.http.post<AuthResponse>(`${this.apiUrl}/authenticate`, {}, { headers }).pipe(
      tap({
        next: (response) => {
          this.tokenSignal.set(response.access_token);
          localStorage.setItem('auth_token', response.access_token);
          if (response.refresh_token) {
            this.refreshTokenSignal.set(response.refresh_token);
            localStorage.setItem('refresh_token', response.refresh_token);
          }
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Errore di login');
          this.isLoading.set(false);
        },
      })
    );
  }

  /**
   * Effettua la registrazione
   */
  register(data: RegisterRequest): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);

    const headers = {
      'Content-Type': 'application/json',
    };

    return this.http.post<any>( `${this.apiUrl}/register`, data, { headers }).pipe(
      tap({
        next: () => {
          console.log('Registrazione completata con successo');
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Errore durante la registrazione');
          console.error('Errore di registrazione:', err);
          this.isLoading.set(false);
        },
      })
    );
  }

  /**
   * Effettua il logout
   */
  logout(): void {
    this.tokenSignal.set(null);
    this.refreshTokenSignal.set(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    this.error.set(null);
  }

  /**
   * Verifica se l'utente è autenticato
   */
  isAuthenticated(): boolean {
    return this.tokenSignal() !== null;
  }

  /**
   * Ottiene il token corrente
   */
  getToken(): string | null {
    return this.tokenSignal();
  }

  /**
   * Ottiene il refresh token
   */
  getRefreshToken(): string | null {
    return this.refreshTokenSignal();
  }

  /**
   * Rinfresca l'access token usando il refresh token
   */
  refreshAccessToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      this.error.set('Nessun refresh token disponibile');
      return new Observable(subscriber => subscriber.error('No refresh token'));
    }

    const headers = {
      'Authorization': `Bearer ${refreshToken}`,
      'Content-Type': 'application/json',
    };

    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh-token`, {}, { headers }).pipe(
      tap({
        next: (response) => {
          this.tokenSignal.set(response.access_token);
          localStorage.setItem('auth_token', response.access_token);
          if (response.refresh_token) {
            this.refreshTokenSignal.set(response.refresh_token);
            localStorage.setItem('refresh_token', response.refresh_token);
          }
          console.log('Token rinfrescato con successo');
        },
        error: (err) => {
          console.error('Errore nel refresh token:', err);
          this.logout();
        },
      })
    );
  }

  /**
   * Carica il token dal localStorage
   */
  private loadTokenFromStorage(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  /**
   * Carica il refresh token dal localStorage
   */
  private loadRefreshTokenFromStorage(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('refresh_token');
    }
    return null;
  }
}
