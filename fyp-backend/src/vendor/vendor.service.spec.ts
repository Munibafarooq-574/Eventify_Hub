import { VendorService } from './vendor.service';
import { getModelToken } from '@nestjs/mongoose';
import { FileUploadService } from 'src/file-upload/file-upload.service';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from 'src/auth/schemas/user.schema';
import { Category } from 'src/auth/schemas/category.schema';

describe('VendorService - Unit Tests', () => {
    let service: VendorService;
    let userModel: any;
    let categoryModel: any;

    beforeEach(async () => {
        userModel = {
            findById: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: 'u1', save: jest.fn() }) }),
            updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
            findOne: jest.fn().mockResolvedValue({ packages: [{ _id: 'p1', packageName: 'Gold' }] }),
            aggregate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
        };
        categoryModel = {
            findOne: jest.fn().mockResolvedValue({ _id: 'c1' }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VendorService,
                { provide: getModelToken(User.name), useValue: userModel },
                { provide: getModelToken(Category.name), useValue: categoryModel },
                { provide: FileUploadService, useValue: { uploadFile: jest.fn().mockResolvedValue({ Location: 'logo.png' }), uploadMultipleFiles: jest.fn() } },
            ],
        }).compile();

        service = module.get<VendorService>(VendorService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('getAllVendorsByCategoryId - should throw for invalid ID', async () => {
        await expect(service.getAllVendorsByCategoryId('invalid')).rejects.toThrow();
    });

    it('addPackages - should save packages', async () => {
        const userMock = { packages: [], save: jest.fn(), _id: 'u1' };
        userModel.findById.mockResolvedValue(userMock);
        await service.addPackages('u1', { packages: [{ packageName: 'Silver', price: 5000, services: 'test' }] });
        expect(userMock.save).toHaveBeenCalled();
    });

    it('deletePackage - should remove package', async () => {
        userModel.updateOne.mockResolvedValueOnce({ modifiedCount: 1 });
        const result = await service.deletePackage('p1');
        expect(result.message).toBe('Package deleted successfully');
    });
});
