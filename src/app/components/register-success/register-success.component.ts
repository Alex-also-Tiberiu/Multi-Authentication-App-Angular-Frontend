import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  effect,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './register-success.component.html',
  styleUrl: './register-success.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterSuccessComponent implements OnInit {
  private readonly router = inject(Router);

  countdown = signal(15);
  private countdownInterval: any;

  ngOnInit(): void {
    this.startCountdown();
  }

  private startCountdown(): void {
    this.countdownInterval = setInterval(() => {
      this.countdown.update((value) => {
        if (value <= 1) {
          clearInterval(this.countdownInterval);
          this.goToLogin();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
  }

  goToLogin(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }
}
