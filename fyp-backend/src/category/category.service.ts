import { Injectable, Post, UnauthorizedException, UseInterceptors } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from '../auth/schemas/category.schema';
import { CreateDto } from './dto/create.dto';
import { FileUploadService } from 'src/file-upload/file-upload.service';

@Injectable()
export class CategoryService {
    createCategory: any;
    getAllCategories: any;
    updateCategory: any;
    deleteCategory: any;
    constructor(
        @InjectModel(Category.name) private categoryModel: Model<Category>,
        private fileUploadService: FileUploadService
    ) { }

    async create(createDto: CreateDto, file: Express.Multer.File) {
        const fileUrl = await this.fileUploadService.uploadFile(file);
        const existingCategory = await this.categoryModel.findOne({ name: createDto.name });
        if (existingCategory) {
            throw new UnauthorizedException('Category already exists');
        }

        const category = await this.categoryModel.create({
            name: createDto.name,
            image: fileUrl?.Location,
            description: createDto.description,
        });

        return category;
    }

    async getAll() {
        const categories = await this.categoryModel.find();
        return categories;
    }
}