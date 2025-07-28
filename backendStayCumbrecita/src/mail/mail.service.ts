/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from "@nestjs/common";
import { MailerService } from "@nestjs-modules/mailer";
import { ConfigService } from "@nestjs/config";
import { TipoNotificacion } from "../common/enums/tipo-notificacion.enum";

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Envía un correo de verificación al usuario
   * @param email Correo electrónico del usuario
   * @param token Token de verificación
   * @param nombre Nombre del usuario
   */
  async sendVerificationEmail(email: string, token: string, nombre?: string): Promise<void> {
    const verificationUrl = `${this.configService.get("APP_FRONTEND_URL")}/auth/verify?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: "Verifica tu cuenta",
      template: "verify-email",
      context: {
        name: nombre || email.split("@")[0],
        url: verificationUrl,
      },
    });
  }

  /**
   * Envía un correo de restablecimiento de contraseña
   * @param email Correo electrónico del usuario
   * @param token Token de restablecimiento
   * @param nombre Nombre del usuario (opcional)
   */
  async sendPasswordResetEmail(email: string, token: string, nombre?: string): Promise<void> {
    const resetUrl = `${this.configService.get("APP_FRONTEND_URL")}/auth/reset-password?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: "Restablece tu contraseña",
      template: "reset-password",
      context: {
        name: nombre || email.split("@")[0],
        url: resetUrl,
      },
    });
  }

  /**
   * Envía un correo de confirmación de reserva
   * @param email Correo electrónico del usuario
   * @param reserva Datos de la reserva
   */
  async sendReservationConfirmation(
    email: string,
    reserva: any,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: "Confirmación de Reserva",
      template: "reservation-confirmation",
      context: {
        reserva,
        frontendUrl: this.configService.get("APP_FRONTEND_URL"),
      },
    });
  }

  /**
   * Envía un correo de notificación de pago
   * @param email Correo electrónico del usuario
   * @param pago Datos del pago
   */
  async sendPaymentNotification(email: string, pago: any): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: "Confirmación de Pago",
      template: "payment-notification",
      context: {
        pago,
        frontendUrl: this.configService.get("APP_FRONTEND_URL"),
      },
    });
  }

  /**
   * Envía un correo de notificación de cancelación de reserva
   * @param email Correo electrónico del usuario
   * @param reserva Datos de la reserva
   */
  async sendReservationCancellation(
    email: string,
    reserva: any,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: "Cancelación de Reserva",
      template: "reservation-cancellation",
      context: {
        reserva,
        frontendUrl: this.configService.get("APP_FRONTEND_URL"),
      },
    });
  }

  /**
   * Envía una confirmación de reserva al turista
   * @param email Email del turista
   * @param data Datos de la reserva
   */
  async sendReservationConfirmationToTurist(
    email: string,
    data: {
      reservaId: string;
      fechaInicio: Date;
      fechaFin: Date;
      montoTotal: number;
      nombreHotel: string;
      nombreHabitacion: string;
      cantidadHuespedes: number;
    },
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: "Confirmación de Reserva",
      template: "reservation-confirmation",
      context: {
        name: email.split("@")[0],
        reservationId: data.reservaId,
        propertyName: data.nombreHotel,
        roomName: data.nombreHabitacion,
        checkIn: data.fechaInicio.toLocaleDateString(),
        checkOut: data.fechaFin.toLocaleDateString(),
        guests: data.cantidadHuespedes,
        total: data.montoTotal.toFixed(2),
        reservationUrl: `${this.configService.get("APP_FRONTEND_URL")}/reservas/${data.reservaId}`,
      },
    });
  }

  /**
   * Notifica al propietario sobre una nueva reserva
   * @param email Email del propietario
   * @param data Datos de la reserva
   */
  async notifyNewReservation(
    email: string,
    data: {
      reservaId: string;
      fechaInicio: Date;
      fechaFin: Date;
      montoTotal: number;
      nombreTurista: string;
      emailTurista: string;
      telefonoTurista: string;
      nombreHotel: string;
      nombreHabitacion: string;
      cantidadHuespedes: number;
    },
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: "Nueva Reserva",
      template: "new-reservation-notification",
      context: {
        ownerName: email.split("@")[0],
        reservationId: data.reservaId,
        propertyName: data.nombreHotel,
        roomName: data.nombreHabitacion,
        guestName: data.nombreTurista,
        guestEmail: data.emailTurista,
        guestPhone: data.telefonoTurista,
        checkIn: data.fechaInicio.toLocaleDateString(),
        checkOut: data.fechaFin.toLocaleDateString(),
        guests: data.cantidadHuespedes,
        total: data.montoTotal.toFixed(2),
        reservationUrl: `${this.configService.get("APP_FRONTEND_URL")}/admin/reservas/${data.reservaId}`,
      },
    });
  }

  /**
   * Envía un recordatorio para dejar una reseña
   * @param email Email del turista
   * @param data Datos de la estadía
   */
  async sendReviewReminder(
    email: string,
    data: {
      reservaId: string;
      nombreHotel: string;
      nombreHabitacion: string;
      fechaInicio: Date;
      fechaFin: Date;
    },
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: "¡Cuéntanos tu experiencia!",
      template: "review-reminder",
      context: {
        name: email.split("@")[0],
        propertyName: data.nombreHotel,
        roomName: data.nombreHabitacion,
        checkIn: data.fechaInicio.toLocaleDateString(),
        checkOut: data.fechaFin.toLocaleDateString(),
        reviewUrl: `${this.configService.get("APP_FRONTEND_URL")}/reservas/${data.reservaId}/review`,
      },
    });
  }

  /**
   * Envía una notificación genérica
   * @param email Email del destinatario
   * @param data Datos de la notificación
   */
  async sendNotification(
    email: string,
    data: {
      tipo: TipoNotificacion;
      titulo: string;
      mensaje: string;
      actionUrl?: string;
      actionText?: string;
      actionButtonText?: string;
      additionalInfo?: any;
      nombreUsuario?: string;
    },
  ): Promise<void> {
    // Colores de la marca (naranja) en lugar de verde
    const colors = {
      [TipoNotificacion.RESERVA]: "#ea580c", // orange-600
      [TipoNotificacion.PAGO]: "#ea580c",     // orange-600  
      [TipoNotificacion.SISTEMA]: "#f97316",  // orange-500
    };

    await this.mailerService.sendMail({
      to: email,
      subject: data.titulo,
      template: "notification",
      context: {
        title: data.titulo,
        name: data.nombreUsuario || email.split("@")[0],
        content: data.mensaje,
        headerColor: colors[data.tipo],
        buttonColor: colors[data.tipo],
        actionUrl: data.actionUrl,
        actionText: data.actionText,
        actionButtonText: data.actionButtonText,
        additionalInfo: data.additionalInfo,
        footerText: "Si tienes alguna pregunta, no dudes en contactarnos.",
      },
    });
  }

  /**
   * Envía notificación de estado de pago
   */
  async sendPaymentStatusNotification(
    email: string,
    nombre: string,
    paymentData: any,
  ): Promise<void> {
    const subject =
      paymentData.estado === "aprobado"
        ? "✅ Pago Confirmado - Reserva Aprobada"
        : "❌ Información sobre tu Pago";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${paymentData.estado === "aprobado" ? "#28a745" : "#dc3545"};">
          ${paymentData.estado === "aprobado" ? "¡Pago Confirmado!" : "Información de Pago"}
        </h2>
        <p>Hola ${nombre},</p>
        
        ${
          paymentData.estado === "aprobado"
            ? `<p>Tu pago de <strong>$${paymentData.monto}</strong> ha sido procesado exitosamente.</p>
             <p>Tu reserva está confirmada. ID de reserva: <strong>${paymentData.reservaId}</strong></p>`
            : `<p>Hay una actualización sobre tu pago de <strong>$${paymentData.monto}</strong>.</p>
             <p>Estado actual: <strong>${paymentData.estado}</strong></p>`
        }
        
        <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
        
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          Este es un email automático, por favor no responder.
        </p>
      </div>
    `;

    await this.mailerService.sendMail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * Envía un email simple con asunto y contenido
   * @param email Email del destinatario
   * @param nombre Nombre del destinatario
   * @param asunto Asunto del email
   * @param contenido Contenido del email
   */
  async sendSimpleNotification(
    email: string,
    nombre: string,
    asunto: string,
    contenido: string,
  ): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Stay at Cumbrecita</h2>
        <p>Hola ${nombre},</p>
        <p>${contenido}</p>
        
        <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
        
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          Este es un email automático, por favor no responder.
        </p>
      </div>
    `;

    await this.mailerService.sendMail({
      to: email,
      subject: asunto,
      html,
    });
  }
}
