// import { Test, TestingModule } from '@nestjs/testing';
// import { ReviewsService } from './reviews.service';
// import { getModelToken } from '@nestjs/mongoose';
// import { Review } from 'src/auth/schemas/review.schema';
// import { Types } from 'mongoose';

// const mockReviewModel = {
//     create: jest.fn(),
//     find: jest.fn().mockReturnThis(),
//     populate: jest.fn().mockReturnThis(),
//     sort: jest.fn(),
//     aggregate: jest.fn().mockReturnThis(),
//     exec: jest.fn(),
// };

// describe('ReviewsService', () => {
//     let service: ReviewsService;

//     beforeEach(async () => {
//         const module: TestingModule = await Test.createTestingModule({
//             providers: [
//                 ReviewsService,
//                 { provide: getModelToken(Review.name), useValue: mockReviewModel },
//             ],
//         }).compile();

//         service = module.get<ReviewsService>(ReviewsService);
//     });

//     it('should be defined', () => {
//         expect(service).toBeDefined();
//     });

//     it('should create a review', async () => {
//         const dto = { vendorId: new Types.ObjectId().toString(), rating: 5, message: 'Good job' };
//         const result = { _id: 'review123', ...dto };
//         mockReviewModel.create.mockResolvedValue(result);

//         const created = await service.createReview('user123', dto as any);
//         expect(created).toEqual(result);
//     });

//     it('should get vendor reviews', async () => {
//         const mockData = [{ message: 'Great', rating: 5 }];
//         mockReviewModel.sort.mockResolvedValue(mockData);

//         const reviews = await service.getVendorReviews(new Types.ObjectId().toString());
//         expect(reviews).toEqual(mockData);
//     });

//     it('should return top vendors', async () => {
//         const topVendors = [{ vendorId: 'v1', averageRating: 4.5 }];
//         mockReviewModel.exec.mockResolvedValue(topVendors);

//         const result = await service.getTopVendorsByRating();
//         expect(result).toEqual(topVendors);
//     });
// });
import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { getModelToken } from '@nestjs/mongoose';
import { Review } from 'src/auth/schemas/review.schema';
import { Types } from 'mongoose';

const mockReviewModel = {
    create: jest.fn(),
    find: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn(),
    aggregate: jest.fn().mockReturnThis(),
    exec: jest.fn(),
};

describe('ReviewsService', () => {
    let service: ReviewsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReviewsService,
                { provide: getModelToken(Review.name), useValue: mockReviewModel },
            ],
        }).compile();

        service = module.get<ReviewsService>(ReviewsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should create a review', async () => {
        const userId = new Types.ObjectId().toHexString();
        const dto = {
            vendorId: new Types.ObjectId().toHexString(),
            rating: 5,
            message: 'Good job',
        };
        const result = { _id: 'review123', ...dto, userId };

        mockReviewModel.create.mockResolvedValue(result);

        const created = await service.createReview(userId, dto as any);
        expect(created).toEqual(result);
    });

    it('should get vendor reviews', async () => {
        const mockData = [{ message: 'Great', rating: 5 }];
        mockReviewModel.sort.mockResolvedValue(mockData);

        const vendorId = new Types.ObjectId().toHexString();
        const reviews = await service.getVendorReviews(vendorId);
        expect(reviews).toEqual(mockData);
    });

    it('should return top vendors', async () => {
        const topVendors = [{ vendorId: 'v1', averageRating: 4.5 }];
        mockReviewModel.exec.mockResolvedValue(topVendors);

        const result = await service.getTopVendorsByRating();
        expect(result).toEqual(topVendors);
    });
});
