import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

const uploadPath = './public/uploads/chat';
if (!existsSync(uploadPath)) {
    mkdirSync(uploadPath, { recursive: true });
}

export const chatImageStorage = diskStorage({
    destination: uploadPath,
    filename: (req: any, file: any, callback: any) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
    },
});

export const imageFileFilter = (req: any, file: any, callback: any) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return callback(new Error('Only image files are allowed!'), false);
    }
    callback(null, true);
};