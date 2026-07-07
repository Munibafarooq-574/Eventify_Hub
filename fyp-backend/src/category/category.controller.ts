import { Controller, Post, Body, Get, UseInterceptors, UploadedFile } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateDto } from './dto/create.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from 'src/file-upload/file-upload.service';

@Controller('category')
export class CategoryController {
    createCategory: any;
    getAllCategories: any;
    constructor(private categoryService: CategoryService) { }

    @Post()
    @UseInterceptors(FileInterceptor('file'))
    register(@Body() createDto: CreateDto, @UploadedFile() file: Express.Multer.File,) {
        return this.categoryService.create({
            ...createDto,
        }, file);
    }

    @Get()
    getAll() {
        return this.categoryService.getAll();
    }
}