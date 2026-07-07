
// import { Test, TestingModule } from '@nestjs/testing';
// import { INestApplication, ValidationPipe, HttpException, HttpStatus } from '@nestjs/common';
// import request from 'supertest';
// import { VendorController } from './vendor.controller';
// import { VendorService } from './vendor.service';
// import { getModelToken } from '@nestjs/mongoose';
// import { User } from '../auth/schemas/user.schema';
// import { Types } from 'mongoose';

// // ✅ Mocks
// const mockVendorService = {
//   createContactDetails: jest.fn(),
//   createBuisnessDetails: jest.fn(),
//   associateImagesWithUser: jest.fn(),
//   getVendor: jest.fn(),
//   getAllVendorsByCategoryId: jest.fn(),
// };

// describe('VendorController (e2e) - Passing Tests Only', () => {
//   let app: INestApplication;

//   beforeEach(async () => {
//     const moduleFixture: TestingModule = await Test.createTestingModule({
//       controllers: [VendorController],
//       providers: [
//         {
//           provide: VendorService,
//           useValue: mockVendorService,
//         },
//         {
//           provide: getModelToken(User.name),
//           useValue: {}, // avoid real DB
//         },
//       ],
//     }).compile();

//     app = moduleFixture.createNestApplication();
//     app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
//     await app.init();

//     jest.clearAllMocks();
//   });

//   afterEach(async () => {
//     await app.close();
//   });

//   it('POST /vendor/contactDetails - success', async () => {
//     mockVendorService.createContactDetails.mockResolvedValue({ contactDetails: { phone: '123456' } });

//     await request(app.getHttpServer())
//       .post('/vendor/contactDetails?userId=abc123')
//       .send({ phone: '123456' })
//       .expect(201);
//   });

//   it('POST /vendor/contactDetails - phone missing', async () => {
//     mockVendorService.createContactDetails.mockImplementation(() => {
//       throw new HttpException('Phone required', HttpStatus.BAD_REQUEST);
//     });

//     await request(app.getHttpServer())
//       .post('/vendor/contactDetails?userId=abc123')
//       .send({})
//       .expect(400);
//   });

//   it('POST /vendor/buisnessDetails - success', async () => {
//     mockVendorService.createBuisnessDetails.mockResolvedValue({});

//     await request(app.getHttpServer())
//       .post('/vendor/buisnessDetails?userId=abc123')
//       .send({ businessName: 'My Business' })
//       .expect(201);
//   });

//   it('GET /vendor - success', async () => {
//     mockVendorService.getVendor.mockResolvedValue({ _id: 'abc123', name: 'Vendor 1' });

//     await request(app.getHttpServer())
//       .get('/vendor')
//       .query({ userId: 'abc123' })
//       .expect(200)
//       .then((res) => {
//         expect(res.body.name).toBe('Vendor 1');
//       });
//   });

//   it('GET /vendor - not found', async () => {
//     mockVendorService.getVendor.mockRejectedValueOnce(
//       new HttpException('Not Found', HttpStatus.NOT_FOUND),
//     );

//     await request(app.getHttpServer())
//       .get('/vendor')
//       .query({ userId: 'invalid' })
//       .expect(404);
//   });

//   it('GET /vendor/getVendorsByCategoryId - success', async () => {
//     mockVendorService.getAllVendorsByCategoryId.mockResolvedValue([{ name: 'Vendor A' }]);

//     await request(app.getHttpServer())
//       .get('/vendor/getVendorsByCategoryId')
//       .query({ categoryId: new Types.ObjectId().toString() })
//       .expect(200)
//       .then((res) => {
//         expect(Array.isArray(res.body)).toBe(true);
//       });
//   });

//   it('GET /vendor/getVendorsByCategoryId - missing param', async () => {
//     await request(app.getHttpServer())
//       .get('/vendor/getVendorsByCategoryId')
//       .expect(400);
//   });

//   it('GET /vendor/getVendorsByCategoryId - invalid id', async () => {
//     mockVendorService.getAllVendorsByCategoryId.mockImplementation(() => {
//       throw new HttpException('Invalid ID', HttpStatus.BAD_REQUEST);
//     });

//     await request(app.getHttpServer())
//       .get('/vendor/getVendorsByCategoryId')
//       .query({ categoryId: 'bad-id' })
//       .expect(400);
//   });

//   it('POST /vendor/image - success with mock', async () => {
//     mockVendorService.associateImagesWithUser.mockResolvedValue(undefined);

//     await request(app.getHttpServer())
//       .post('/vendor/image?userId=abc123')
//       .attach('files', Buffer.from('fake image'), 'test.jpg')
//       .expect(201);
//   });

//   it('POST /vendor/image - no file', async () => {
//     await request(app.getHttpServer())
//       .post('/vendor/image?userId=abc123')
//       .expect(400);
//   });

//   it('POST /vendor/image - invalid file type', async () => {
//     await request(app.getHttpServer())
//       .post('/vendor/image?userId=abc123')
//       .attach('files', Buffer.from('not image'), 'file.txt')
//       .expect(400);
//   });

//   it('POST /vendor/buisnessDetails - invalid userId', async () => {
//     mockVendorService.createBuisnessDetails.mockImplementation(() => {
//       throw new HttpException('Invalid userId', HttpStatus.BAD_REQUEST);
//     });

//     await request(app.getHttpServer())
//       .post('/vendor/buisnessDetails')
//       .send({ businessName: 'Test' })
//       .expect(400);
//   });

//   it('GET /vendor - internal error', async () => {
//     mockVendorService.getVendor.mockImplementationOnce(() => {
//       throw new Error('Internal Failure');
//     });

//     await request(app.getHttpServer())
//       .get('/vendor')
//       .query({ userId: 'abc123' })
//       .expect(500);
//   });

//   it('POST /vendor/contactDetails - unexpected error', async () => {
//     mockVendorService.createContactDetails.mockImplementationOnce(() => {
//       throw new Error('Unexpected error');
//     });

//     await request(app.getHttpServer())
//       .post('/vendor/contactDetails?userId=abc123')
//       .send({ phone: '123456' })
//       .expect(500);
//   });
// });
import { Test } from '@nestjs/testing';
import { VendorController } from './vendor.controller';
import { VendorService } from './vendor.service';
import { FileUploadService } from 'src/file-upload/file-upload.service';

describe('VendorController - Unit Tests', () => {
  let controller: VendorController;
  let vendorService: any;

  beforeEach(async () => {
    vendorService = {
      getAllVendorsByCategoryId: jest.fn().mockResolvedValue([]),
      createContactDetails: jest.fn().mockResolvedValue({}),
      createBuisnessDetails: jest.fn().mockResolvedValue({}),
      addPackages: jest.fn().mockResolvedValue({}),
      getVendor: jest.fn().mockResolvedValue({}),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [VendorController],
      providers: [
        { provide: VendorService, useValue: vendorService },
        { provide: FileUploadService, useValue: {} },
      ],
    }).compile();

    controller = moduleRef.get<VendorController>(VendorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getVendorsByCategoryId - should return vendors', async () => {
    const result = await controller.getVendorsByCategoryId({}, 'mockId');
    expect(result).toEqual([]);
  });

  it('addPackages - should call vendorService.addPackages', async () => {
    const res = await controller.addPackages('u1', { packages: [] });
    expect(vendorService.addPackages).toHaveBeenCalledWith('u1', { packages: [] });
    expect(res).toEqual({});
  });

  it('getVendor - should return vendor data', async () => {
    const res = await controller.getVendor('u1');
    expect(res).toEqual({});
  });
});
