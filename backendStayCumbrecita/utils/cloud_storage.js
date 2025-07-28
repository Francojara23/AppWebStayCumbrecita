/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Storage } from '@google-cloud/storage';
import { format } from 'util';
import env from '../config/env';
import url from 'url';
import { v4 as uuidv4 } from 'uuid';
const uuid = uuidv4();

const storage = new Storage({
  projectId: 'testprojectcar-96e3b',
  keyFilename: './serviceAccountKey.json',
});

const bucket = storage.bucket('gs://testprojectcar-96e3b.appspot.com/');

/**
 * Subir el archivo a Firebase Storage
 * file objeto que sera almacenado en Firebase Storage
 */
export default (file, pathImage) => {
  return new Promise((resolve, reject) => {
    if (!pathImage) {
      return reject('Path image is required');
    }

    let fileUpload = bucket.file(pathImage);
    const blobStream = fileUpload.createWriteStream({
      metadata: {
        contentType: 'image/png',
        metadata: {
          firebaseStorageDownloadTokens: uuid,
        },
      },
      resumable: false,
    });

    blobStream.on('error', (error) => {
      console.log('Error al subir archivo a firebase', error);
      reject('Something is wrong! Unable to upload at the moment.');
    });

    blobStream.on('finish', () => {
      const url = format(
        `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileUpload.name)}?alt=media&token=${uuid}`,
      );
      console.log('URL DE CLOUD STORAGE ', url);
      resolve(url);
    });

    blobStream.end(file.buffer);
  });
};
