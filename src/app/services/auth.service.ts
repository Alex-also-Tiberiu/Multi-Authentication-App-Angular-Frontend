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
  
  // Signal for authentication status
  private isAuthenticatedSignal = signal(this.checkAuthStatus());
  isAuthenticated = this.isAuthenticatedSignal.asReadonly();
  
  // Signal for loading state
  isLoading = signal(false);
  
  // Signal for errors
  error = signal<string | null>(null);

  /**
   * Performs login with Basic Auth
   * Backend sends tokens as HttpOnly cookies
   */
  login(username: string, password: string): Observable<AuthResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    const credentials = btoa(`${username}:${password}`); // Base64 encode Basic Auth
    const headers = {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    };

    return this.http.post<AuthResponse>(`${this.apiUrl}/authenticate`, {}, { 
      headers,
      withCredentials: true // Send cookies with requests
    }).pipe(
      tap({
        next: () => {
          this.isAuthenticatedSignal.set(true);
          console.log('Login completed, tokens saved in HttpOnly cookies');
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
   * Performs user registration
   */
  register(data: RegisterRequest): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);

    const headers = {
      'Content-Type': 'application/json',
    };

    return this.http.post<any>(`${this.apiUrl}/register`, data, { 
      headers,
      withCredentials: true
    }).pipe(
      tap({
        next: () => {
          console.log('Registration completed successfully');
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Error during registration');
          console.error('Registration error:', err);
          this.isLoading.set(false);
        },
      })
    );
  }

  /**
   * Performs logout
   */
  logout(): void {
    this.isAuthenticatedSignal.set(false);
    this.error.set(null);
    
    // Backend clears the HttpOnly cookies
    this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).subscribe({
      next: () => {
        console.log('Logout completed');
      },
      error: (err) => {
        console.error('Error during logout:', err);
      },
    });
  }

  /**
   * Checks if the user is authenticated
   */
  isUserAuthenticated(): boolean {
    return this.isAuthenticatedSignal();
  }

  /**
   * Refreshes the access token using the refresh token (saved in HttpOnly cookies)
   */
  refreshAccessToken(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh-token`, {}, { 
      withCredentials: true 
    }).pipe(
      tap({
        next: () => {
          console.log('Token refreshed successfully');
          this.isAuthenticatedSignal.set(true);
        },
        error: (err) => {
          console.error('Error refreshing token:', err);
          // If backend returns 409, refresh token has expired
          if (err.status === 409) {
            console.log('Refresh token expired, login again');
          }
          this.logout();
        },
      })
    );
  }

  /**
   * Checks authentication status (used at app startup)
   * Could make a call to a verification endpoint if needed
   */
  private checkAuthStatus(): boolean {
    // With HttpOnly cookies, we cannot verify directly
    // Backend will verify the cookie on requests
    // By default starts as unauthenticated, guard will verify
    return false;
  }
}
