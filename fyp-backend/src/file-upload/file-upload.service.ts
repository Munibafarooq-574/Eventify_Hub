// src/common/services/file-upload.service.ts
import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';


@Injectable()
export class FileUploadService {
    AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;
    s3: AWS.S3;

    constructor() {
        this.s3 = new AWS.S3({
            credentials: {
                accessKeyId: 'AKIA2XBKS45YRNT5QST3',
                secretAccessKey: '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',
            },
            region: process.env.AWS_REGION,
        });
    }

    async uploadFile(file: any) {

    if (!file) {
        return null;
    }

    console.log(file);

    const { originalname } = file;

    return await this.s3_upload(
        file.buffer,
        this.AWS_S3_BUCKET,
        originalname,
        file.mimetype,
    );
}

    async s3_upload(file: any, bucket: any, name: any, mimetype: any) {
        const params = {
            Bucket: bucket,
            Key: String(name),
            Body: file,
            ACL: 'public-read',
            ContentType: mimetype,
            ContentDisposition: 'inline',
            CreateBucketConfiguration: {
                LocationConstraint: process.env.AWS_REGION,
            },
        };

        try {
            let s3Response = await this.s3.upload(params).promise();
            return s3Response;
        } catch (e) {
            console.log(e);
        }
    }

    async uploadMultipleFiles(files: Express.Multer.File[]) {
        const uploadResults = [];

        for (const file of files) {
            const { buffer, mimetype, originalname } = file;

            // Generate unique filename with original extension
            const uniqueFileName = `${uuidv4()}${extname(originalname)}`;

            const response = await this.s3_upload(
                buffer,
                this.AWS_S3_BUCKET,
                uniqueFileName,
                mimetype,
            );

            if (response?.Location) {
                uploadResults.push(response.Location); // Public URL
            } else {
                throw new Error(`Upload failed for ${originalname}`);
            }
        }

        return uploadResults;
    }
}