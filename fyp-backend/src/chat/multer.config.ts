//fyp-backend/src/chat/multer.config.ts

/*import { diskStorage } from 'multer';
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

export const imageFileFilter = (
  req: any,
  file: any,
  callback: any
) => {

  console.log("UPLOAD FILE:", {
    name: file.originalname,
    type: file.mimetype,
  });

  if (
    file.mimetype.startsWith("image/")
    ||
    /\.(jpg|jpeg|png|gif|webp)$/i.test(file.originalname)
  ) {
    callback(null, true);
  } else {
    callback(new Error("Only image files are allowed!"), false);
  }
};*/

//fyp-backend/src/chat/multer.config.ts
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

export const imageFileFilter = (
  req: any,
  file: any,
  callback: any
) => {

  console.log("UPLOAD FILE:", {
    name: file.originalname,
    type: file.mimetype,
  });

  if (
    file.mimetype.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp)$/i.test(file.originalname)
  ) {
    callback(null, true);
  } else {
    callback(new Error("Only image files are allowed!"), false);
  }
};

// ADD THIS BELOW imageFileFilter
export const videoFileFilter = (
  req: any,
  file: any,
  callback: any
) => {
  console.log("UPLOAD FILE (video):", {
    name: file.originalname,
    type: file.mimetype,
  });

  if (
    file.mimetype.startsWith("video/") ||
    /\.(mp4|mov|m4v|webm|3gp|mkv)$/i.test(file.originalname)
  ) {
    callback(null, true);
  } else {
    callback(new Error("Only video files are allowed!"), false);
  }
};