import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly authService = inject(AuthService);
  private isRefreshing = false;

  // Extract XSRF token from cookie
  private getXsrfToken(): string | null {
    const cookies = document.cookie.split('; ');
    for (const cookie of cookies) {
      const [name, value] = cookie.split('=');
      if (name === 'XSRF-TOKEN') {
        return decodeURIComponent(value);
      }
    }
    return null;
  }

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // Add withCredentials to all requests to send HttpOnly cookies
    request = request.clone({
      withCredentials: true,
    });

    // Add XSRF token for all non-GET requests
    if (request.method !== 'GET') {
      const xsrfToken = this.getXsrfToken();
      if (xsrfToken) {
        request = request.clone({
          setHeaders: {
            'X-XSRF-TOKEN': xsrfToken,
          },
        });
      }
    }

    return next.handle(request).pipe(
      catchError((error) => {
        // If we receive a 401 (Unauthorized), try to refresh the token
        if (error.status === 401 && !this.isRefreshing) {
          this.isRefreshing = true;

          return this.authService.refreshAccessToken().pipe(
            switchMap(() => {
              this.isRefreshing = false;
              // Retry the original request
              // HttpOnly cookies will be sent automatically
              return next.handle(request);
            }),
            catchError((refreshError) => {
              this.isRefreshing = false;
              // If refresh fails (e.g., 409), logout
              this.authService.logout();
              return throwError(() => refreshError);
            })
          );
        }

        return throwError(() => error);
      })
    );
  }
}
