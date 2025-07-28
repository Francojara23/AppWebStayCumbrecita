import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    BadRequestException,
  } from '@nestjs/common';
  import { Observable } from 'rxjs';
  
  export interface FileValidationOptions {
    allowedMimeTypes: string[];
    maxSizeMB: number;
  }
  
  export function FileValidationInterceptor(options: FileValidationOptions): any {
    @Injectable()
    class MixinInterceptor implements NestInterceptor {
      intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const files: Express.Multer.File[] = request.files;
  
        if (!files || files.length === 0) {
          throw new BadRequestException('Debe subir al menos un archivo');
        }
  
        const maxSizeBytes = options.maxSizeMB * 1024 * 1024;
  
        for (const file of files) {
          if (!options.allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException(
              `Tipo de archivo no permitido: ${file.mimetype}`,
            );
          }
  
          if (file.size > maxSizeBytes) {
            throw new BadRequestException(
              `El archivo ${file.originalname} excede el tamaño máximo permitido de ${options.maxSizeMB} MB`,
            );
          }
        }
  
        return next.handle();
      }
    }
  
    return new MixinInterceptor();
  }
  