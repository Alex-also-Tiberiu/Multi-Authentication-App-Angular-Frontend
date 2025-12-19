import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly httpClient = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080/api/v1';

  // State signals for demo API
  demoResult = signal<unknown>(null);
  demoLoading = signal(false);
  demoError = signal<string | null>(null);

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  callDemoApi(): void {
    this.demoLoading.set(true);
    this.demoError.set(null);
    this.demoResult.set(null);

    this.httpClient.get(`${this.apiUrl}/demo-controller`, {
      withCredentials: true,
      responseType: 'text',
    }).subscribe({
      next: (response) => {
        this.demoResult.set(response);
        this.demoLoading.set(false);
      },
      error: (error) => {
        console.error('API Error Details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error,
        });
        
        let errorMessage = 'Errore nella chiamata API';
        
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.status) {
          errorMessage = `Errore ${error.status}: ${error.statusText || 'Unknown'}`;
        }
        
        this.demoError.set(errorMessage);
        this.demoLoading.set(false);
      },
    });
  }
}
