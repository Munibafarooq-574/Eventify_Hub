import { Module } from '@nestjs/common';
import { VendorService } from './vendor.service';
import { VendorController } from './vendor.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './../auth/schemas/user.schema';
import { Category, CategorySchema } from 'src/auth/schemas/category.schema';
import { FileUploadService } from 'src/file-upload/file-upload.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Category.name, schema: CategorySchema }
        ]),
    ],
    controllers: [VendorController],
    providers: [VendorService, FileUploadService],
})
export class VendorModule { }