import { FileUploadService } from './file-upload.service';

jest.mock('aws-sdk', () => {
    const mS3 = {
        upload: jest.fn().mockReturnThis(),
        promise: jest.fn().mockResolvedValue({
            Location: 'https://s3.amazonaws.com/eventify-hub/test.jpg',
        }),
    };
    return {
        S3: jest.fn(() => mS3),
    };
});

describe('FileUploadService', () => {
    let service: FileUploadService;

    beforeEach(() => {
        service = new FileUploadService();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('uploadFile()', () => {
        it('should upload a single file and return response', async () => {
            const mockFile = {
                originalname: 'test.jpg',
                buffer: Buffer.from('dummy'),
                mimetype: 'image/jpeg',
            };

            const result = await service.uploadFile(mockFile);
            expect(result?.Location).toBe('https://s3.amazonaws.com/eventify-hub/test.jpg');

        });
    });

    describe('uploadMultipleFiles()', () => {
        it('should upload multiple files and return public URLs', async () => {
            const mockFiles = [
                {
                    originalname: 'file1.jpg',
                    buffer: Buffer.from('dummy1'),
                    mimetype: 'image/jpeg',
                },
                {
                    originalname: 'file2.jpg',
                    buffer: Buffer.from('dummy2'),
                    mimetype: 'image/jpeg',
                },
            ];

            const result = await service.uploadMultipleFiles(mockFiles as any);
            expect(result.length).toBe(2);
            expect(result[0]).toContain('https://s3.amazonaws.com');
        });

        it('should throw an error if any file upload fails', async () => {
            // Mock rejection for one file
            const mockFail = {
                originalname: 'fail.jpg',
                buffer: Buffer.from('fail'),
                mimetype: 'image/jpeg',
            };

            // Override `s3_upload` temporarily
            jest.spyOn(service, 's3_upload').mockResolvedValueOnce(undefined);

            await expect(service.uploadMultipleFiles([mockFail] as any)).rejects.toThrow(
                'Upload failed for fail.jpg',
            );
        });
    });

    describe('s3_upload()', () => {
        it('should call s3.upload and return the response', async () => {
            const res = await service.s3_upload(
                Buffer.from('file'),
                'eventify-hub',
                'file.jpg',
                'image/jpeg',
            );
            expect(res!.Location).toBe('https://s3.amazonaws.com/eventify-hub/test.jpg');
        });

        it('should log error if s3.upload fails', async () => {
            // Force rejection
            const s3UploadSpy = jest.spyOn(service.s3, 'upload').mockReturnValueOnce({
                promise: () => Promise.reject(new Error('S3 Upload Failed')),
            } as any);

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            await service.s3_upload(Buffer.from('file'), 'bucket', 'file.jpg', 'image/jpeg');

            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));

            s3UploadSpy.mockRestore();
        });
    });
});
