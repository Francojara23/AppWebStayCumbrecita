import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';

@Injectable()
export class AutoRefreshInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AutoRefreshInterceptor.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    return next.handle().pipe(
      tap(() => {
        // Verificar si el token está próximo a expirar
        this.checkAndRefreshToken(request, response);
      }),
      catchError((error) => {
        // Si el error es por token expirado, intentar refresh automático
        if (error.status === 401 && error.message === 'Unauthorized') {
          this.logger.warn('Token expirado detectado, intentando refresh automático');
          // Aquí podrías implementar lógica adicional si es necesario
        }
        return throwError(() => error);
      }),
    );
  }

  private checkAndRefreshToken(request: any, response: any): void {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return;
      }

      const token = authHeader.substring(7);
      const decoded = this.jwtService.decode(token) as any;
      
      if (!decoded || !decoded.exp) {
        return;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.exp - currentTime;
      
      // Si el token expira en menos de 1 hora (3600 segundos), sugerir refresh
      if (timeUntilExpiry < 3600 && timeUntilExpiry > 0) {
        this.logger.log(`Token expira en ${timeUntilExpiry} segundos, sugiriendo refresh`);
        
        // Agregar header para informar al cliente que debería renovar el token
        response.setHeader('X-Token-Refresh-Suggested', 'true');
        response.setHeader('X-Token-Expires-In', timeUntilExpiry.toString());
      }
    } catch (error) {
      this.logger.error('Error verificando expiración del token:', error);
    }
  }
} 