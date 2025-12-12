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

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // Non modificare le richieste che già hanno un header Authorization (come il login con Basic Auth)
    if (request.headers.has('Authorization')) {
      return next.handle(request);
    }

    const token = this.authService.getToken();

    // Se il token esiste, aggiungi l'header Authorization Bearer
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    return next.handle(request).pipe(
      catchError((error) => {
        // Se riceviamo un 401 (Unauthorized), prova a rinnovare il token
        if (error.status === 401 && !this.isRefreshing) {
          this.isRefreshing = true;

          return this.authService.refreshAccessToken().pipe(
            switchMap((response) => {
              this.isRefreshing = false;
              // Riprova la richiesta originale con il nuovo token
              const newToken = this.authService.getToken();
              if (newToken) {
                request = request.clone({
                  setHeaders: {
                    Authorization: `Bearer ${newToken}`,
                  },
                });
              }
              return next.handle(request);
            }),
            catchError((refreshError) => {
              this.isRefreshing = false;
              // Se il refresh fallisce, fai il logout
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
