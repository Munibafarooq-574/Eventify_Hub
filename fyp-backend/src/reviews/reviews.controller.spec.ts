import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

const mockReviewsService = {
    createReview: jest.fn(),
    getVendorReviews: jest.fn(),
    getTopVendorsByRating: jest.fn(),
};

describe('ReviewsController', () => {
    let controller: ReviewsController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ReviewsController],
            providers: [
                { provide: ReviewsService, useValue: mockReviewsService },
            ],
        }).compile();

        controller = module.get<ReviewsController>(ReviewsController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should create review (POST)', async () => {
        const dto = { vendorId: 'v1', rating: 5, message: 'Great' };
        mockReviewsService.createReview.mockResolvedValue({ ...dto });

        const result = await controller.create('u1', dto as any);
        expect(result.rating).toBe(5);
    });

    it('should get vendor reviews (GET /reviews)', async () => {
        const data = [{ message: 'Awesome' }];
        mockReviewsService.getVendorReviews.mockResolvedValue(data);

        const result = await controller.getReviews('vendor123');
        expect(result).toEqual(data);
    });

    it('should get top vendors (GET /top-vendors)', async () => {
        const top = [{ vendorId: 'v1', averageRating: 4.8 }];
        mockReviewsService.getTopVendorsByRating.mockResolvedValue(top);

        const result = await controller.getTopVendors();
        expect(result).toEqual(top);
    });
});
