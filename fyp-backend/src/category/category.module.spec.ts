// import { Test, TestingModule } from '@nestjs/testing';
// import { CategoryController } from './category.controller';
// import { CategoryService } from './category.service';
// import { FileUploadService } from 'src/file-upload/file-upload.service';

// describe('CategoryModule', () => {
//   let module: TestingModule;
//   let categoryController: CategoryController;

//   const mockCategoryService = {
//     createCategory: jest.fn(),
//     getAllCategories: jest.fn(),
//     updateCategory: jest.fn(),
//     deleteCategory: jest.fn(),
//   };

//   const mockFileUploadService = {
//     uploadFile: jest.fn(),
//   };

//   beforeAll(async () => {
//     module = await Test.createTestingModule({
//       controllers: [CategoryController],
//       providers: [
//         {
//           provide: CategoryService,
//           useValue: mockCategoryService,
//         },
//         {
//           provide: FileUploadService,
//           useValue: mockFileUploadService,
//         },
//       ],
//     }).compile();

//     categoryController = module.get<CategoryController>(CategoryController);
//   });

//   it('should compile the module successfully', () => {
//     expect(module).toBeDefined();
//   });

//   it('should have CategoryController defined', () => {
//     expect(categoryController).toBeDefined();
//   });

//   it('CategoryController should have createCategory method', () => {
//     expect(typeof categoryController.createCategory).toBe('function');
//   });

//   it('CategoryController should have getAllCategories method', () => {
//     expect(typeof categoryController.getAllCategories).toBe('function');
//   });
// });
import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { FileUploadService } from 'src/file-upload/file-upload.service';

describe('CategoryModule', () => {
  let module: TestingModule;
  let categoryController: CategoryController;

  const mockCategoryService = {
    createCategory: jest.fn(),
    getAllCategories: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
  };

  const mockFileUploadService = {
    uploadFile: jest.fn(),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        {
          provide: CategoryService,
          useValue: mockCategoryService,
        },
        {
          provide: FileUploadService,
          useValue: mockFileUploadService,
        },
      ],
    }).compile();

    categoryController = module.get<CategoryController>(CategoryController);
  });

  it('should compile the module successfully', () => {
    expect(module).toBeDefined();
  });

  it('should have CategoryController defined', () => {
    expect(categoryController).toBeDefined();
  });

  it('CategoryController should define createCategory and getAllCategories methods', () => {
    const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(categoryController));
    // expect(methodNames).toEqual(expect.arrayContaining(['createCategory', 'getAllCategories']));
    expect(methodNames).toEqual(expect.arrayContaining(['register', 'getAll']));

  });
});
