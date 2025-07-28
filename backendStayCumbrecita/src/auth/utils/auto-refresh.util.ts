import { Injectable, Logger } from '@nestjs/common';

export interface TokenInfo {
  token: string;
  expiresAt: number;
  userId: string;
}

@Injectable()
export class AutoRefreshUtil {
  private readonly logger = new Logger(AutoRefreshUtil.name);
  private refreshPromise: Promise<string> | null = null;

  /**
   * Decodifica un JWT y extrae información de expiración
   */
  decodeToken(token: string): TokenInfo | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf8')
      );

      return {
        token,
        expiresAt: payload.exp * 1000, // Convertir a milliseconds
        userId: payload.id,
      };
    } catch (error) {
      this.logger.error('Error decodificando token:', error);
      return null;
    }
  }

  /**
   * Verifica si un token necesita ser renovado
   * @param token Token JWT
   * @param bufferMinutes Minutos antes de la expiración para considerar renovación
   */
  needsRefresh(token: string, bufferMinutes: number = 60): boolean {
    const tokenInfo = this.decodeToken(token);
    if (!tokenInfo) {
      return true;
    }

    const now = Date.now();
    const bufferMs = bufferMinutes * 60 * 1000;
    
    return (tokenInfo.expiresAt - now) <= bufferMs;
  }

  /**
   * Refresca un token automáticamente
   */
  async refreshToken(currentToken: string, baseUrl: string = 'http://127.0.0.1:3000'): Promise<string> {
    // Evitar múltiples llamadas simultáneas de refresh
    if (this.refreshPromise) {
      return await this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh(currentToken, baseUrl);
    
    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(currentToken: string, baseUrl: string): Promise<string> {
    try {
      this.logger.log('Iniciando refresh automático del token...');
      
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Refresh failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const newToken = data.token;
      this.logger.log('Token renovado exitosamente');
      
      return newToken;
    } catch (error) {
      this.logger.error('Error renovando token:', error);
      throw error;
    }
  }

  /**
   * Función helper para crear requests con auto-refresh
   */
  async makeAuthenticatedRequest<T>(
    token: string,
    requestFn: (token: string) => Promise<T>,
    baseUrl?: string
  ): Promise<T> {
    try {
      // Verificar si necesita refresh antes de hacer la request
      if (this.needsRefresh(token)) {
        this.logger.log('Token próximo a expirar, renovando automáticamente...');
        token = await this.refreshToken(token, baseUrl);
      }

      return await requestFn(token);
    } catch (error: any) {
      // Si la request falla por token expirado, intentar refresh y reintentar
      if (error.response?.status === 401) {
        this.logger.log('Request falló por token expirado, intentando refresh...');
        try {
          token = await this.refreshToken(token, baseUrl);
          return await requestFn(token);
        } catch (refreshError) {
          this.logger.error('Falló el refresh del token:', refreshError);
          throw refreshError;
        }
      }
      throw error;
    }
  }
}

/**
 * Función helper standalone para usar sin inyección de dependencias
 */
export class TokenRefreshHelper {
  private static logger = new Logger('TokenRefreshHelper');

  static async loginAndGetToken(email: string, password: string, baseUrl: string = 'http://127.0.0.1:3000'): Promise<string> {
    try {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      this.logger.error('Error en login:', error);
      throw error;
    }
  }

  static async makeRequestWithAutoRefresh(
    url: string,
    options: RequestInit,
    currentToken: string,
    email?: string,
    password?: string,
    baseUrl: string = 'http://127.0.0.1:3000'
     ): Promise<Response> {
     const util = new AutoRefreshUtil();
    
    // Verificar si necesita refresh
    if (util.needsRefresh(currentToken)) {
      this.logger.log('Token próximo a expirar, renovando...');
      try {
        currentToken = await util.refreshToken(currentToken, baseUrl);
      } catch (refreshError) {
        // Si el refresh falla y tenemos credenciales, hacer login nuevamente
        if (email && password) {
          this.logger.log('Refresh falló, obteniendo nuevo token con login...');
          currentToken = await this.loginAndGetToken(email, password, baseUrl);
        } else {
          throw refreshError;
        }
      }
    }

    // Actualizar el token en los headers
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${currentToken}`);

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Si falla por token expirado, intentar una vez más
    if (response.status === 401 && email && password) {
      this.logger.log('Request falló, obteniendo token fresco...');
      currentToken = await this.loginAndGetToken(email, password, baseUrl);
      
      headers.set('Authorization', `Bearer ${currentToken}`);
      return await fetch(url, {
        ...options,
        headers,
      });
    }

    return response;
  }
} 