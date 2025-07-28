/* eslint-disable @typescript-eslint/require-await */

import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";

@Injectable()
export class FcmService implements OnModuleInit {
  private firebaseApp: admin.app.App;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    // Inicializar Firebase Admin SDK
    this.firebaseApp = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }

  /**
   * Envía una notificación push a un tópico específico
   */
  async sendToTopic(
    topic: string,
    notification: {
      title: string;
      body: string;
      data?: Record<string, any>;
    },
  ): Promise<string> {
    const message: admin.messaging.Message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data,
      topic,
    };

    try {
      const response = await this.firebaseApp.messaging().send(message);
      return response;
    } catch (error) {
      console.error("Error enviando notificación push:", error);
      throw error;
    }
  }

  /**
   * Envía una notificación push a un dispositivo específico
   */
  async sendToDevice(
    token: string,
    notification: {
      title: string;
      body: string;
      data?: Record<string, any>;
    },
  ): Promise<string> {
    const message: admin.messaging.Message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data,
      token,
    };

    try {
      const response = await this.firebaseApp.messaging().send(message);
      return response;
    } catch (error) {
      console.error("Error enviando notificación push:", error);
      throw error;
    }
  }

  /**
   * Suscribe un token a un tópico
   */
  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    try {
      await this.firebaseApp.messaging().subscribeToTopic(tokens, topic);
    } catch (error) {
      console.error("Error suscribiendo a tópico:", error);
      throw error;
    }
  }

  /**
   * Desuscribe un token de un tópico
   */
  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    try {
      await this.firebaseApp.messaging().unsubscribeFromTopic(tokens, topic);
    } catch (error) {
      console.error("Error desuscribiendo de tópico:", error);
      throw error;
    }
  }
}
