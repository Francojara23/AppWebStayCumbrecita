import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { ImagesService } from '../uploads/images/images.service';

export interface QrReservaPayload {
  // Datos mínimos para QR optimizado
  reservaId: string;
  timestamp: number;
  signature?: string;
}

@Injectable()
export class QrCodeService {
  private readonly logger = new Logger(QrCodeService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly imagesService: ImagesService,
  ) {}

  /**
   * Genera un código QR optimizado para una reserva con solo el ID
   * @param reservaId ID único de la reserva
   * @returns Buffer de la imagen PNG del QR y payload firmado
   */
  async generarQrReserva(reservaId: string): Promise<{ qrBuffer: Buffer; qrCloudinaryUrl: string; signedPayload: QrReservaPayload }> {
    try {
      // Crear payload mínimo y optimizado
      const payload: Omit<QrReservaPayload, 'signature'> = {
        reservaId,
        timestamp: Math.floor(Date.now() / 1000)
      };

      // Firmar el payload con JWT
      const signature = this.jwtService.sign(payload, {
        expiresIn: '30d', // QR válido por 30 días
      });

      // Crear payload completo con firma
      const signedPayload: QrReservaPayload = {
        ...payload,
        signature,
      };

      // Convertir a string JSON compacto
      const qrData = JSON.stringify(signedPayload);

      // Generar QR como buffer PNG con configuración optimizada para lectura
      const qrBuffer = await QRCode.toBuffer(qrData, {
        type: 'png',
        width: 400,        // Aumentar tamaño para mejor lectura
        margin: 1,         // Reducir margen para más espacio al código
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',  // Máximo nivel de corrección de errores
      });

      // Subir el QR a Cloudinary
      const qrFile = {
        fieldname: 'qr',
        originalname: `qr-${reservaId}.png`,
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: qrBuffer,
        size: qrBuffer.length,
      } as Express.Multer.File;

      const cloudinaryResult = await this.imagesService.uploadFile(qrFile, 'qr-codes');
      const qrCloudinaryUrl = cloudinaryResult.secure_url;

      this.logger.log(`✅ QR optimizado generado y subido a Cloudinary para reserva ${reservaId}`);
      this.logger.log(`📊 Tamaño del QR: ${qrData.length} caracteres (vs ~1500 antes)`);

      return { qrBuffer, qrCloudinaryUrl, signedPayload };
    } catch (error) {
      this.logger.error(`❌ Error generando QR optimizado para reserva ${reservaId}:`, error);
      throw new Error('Error generando código QR optimizado');
    }
  }

  /**
   * Verifica y decodifica un código QR de reserva
   * @param qrData Datos del QR escaneado
   * @returns Payload verificado o null si es inválido
   */
  async verificarQrReserva(qrData: string): Promise<QrReservaPayload | null> {
    try {
      // Parsear JSON del QR
      const payload: QrReservaPayload = JSON.parse(qrData);

      // Verificar que tenga la estructura correcta
      if (!payload.signature || !payload.reservaId) {
        this.logger.warn('⚠️ QR con estructura inválida');
        return null;
      }

      // Extraer la firma y recrear el payload sin firma
      const { signature, ...payloadSinFirma } = payload;

      try {
        // Verificar la firma JWT
        const decodedPayload = this.jwtService.verify(signature);

        // Verificar que el payload decodificado coincida con los datos del QR
        const payloadKeys = Object.keys(payloadSinFirma);
        for (const key of payloadKeys) {
          if (decodedPayload[key] !== payloadSinFirma[key]) {
            this.logger.warn('⚠️ QR con datos modificados');
            return null;
          }
        }

        // Verificar que no haya expirado (opcional, el JWT ya maneja esto)
        const timestampActual = Math.floor(Date.now() / 1000);
        const maxEdad = 30 * 24 * 60 * 60; // 30 días en segundos
        
        if (timestampActual - payload.timestamp > maxEdad) {
          this.logger.warn('⚠️ QR expirado por timestamp');
          return null;
        }

        this.logger.log(`✅ QR optimizado verificado para reserva ${payload.reservaId}`);
        return payload;

      } catch (jwtError) {
        this.logger.warn('⚠️ QR con firma JWT inválida:', jwtError.message);
        return null;
      }

    } catch (error) {
      this.logger.warn('⚠️ Error verificando QR:', error.message);
      return null;
    }
  }

  /**
   * Genera un hash único para identificar el QR
   * @param reservaId ID de la reserva
   * @returns Hash único
   */
  generarHashQr(reservaId: string): string {
    const secreto = this.configService.get<string>('JWT_SECRET') || 'default-secret';
    return crypto
      .createHash('sha256')
      .update(`${reservaId}-${secreto}`)
      .digest('hex')
      .substring(0, 16)
      .toUpperCase();
  }
} 