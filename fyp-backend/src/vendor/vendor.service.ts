import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BusinessDetails, CateringBusinessDetails, PhotographerBusinessDetails, SalonBusinessDetails, User, VenueBusinessDetails, CakeBusinessDetails, MehndiBusinessDetails, SoundBusinessDetails } from '../auth/schemas/user.schema';
import { CreateContactDetailsDto } from './dto/create-contact-details.dto';
import { CreatePhotographerBusinessDetailsDto } from './dto/create-photographer-business-details.dto';
import { CreateSalonBusinessDetailsDto } from './dto/create-salon-business-details.dto';
import { CreateVenueBusinessDetailsDto } from './dto/create-venue-business-details.dto';
import { CreateCateringBusinessDetailsDto } from './dto/create-catering-business-details.dto';
import { CreateCakeBusinessDetailsDto } from './dto/create-cake-business-details.dto';
import { CreateMehndiBusinessDetailsDto } from './dto/create-mehndi-business-details.dto';
import { CreateSoundBusinessDetailsDto } from './dto/create-sound-business-details.dto';
import { CreatePackagesDto } from './dto/create-package.dto';
import { Category } from 'src/auth/schemas/category.schema';
import { FileUploadService } from 'src/file-upload/file-upload.service';
import { UpdatePackageDto } from './dto/update-package.dto';

interface VendorPackage {
    vendorId: string;
    packageName: string;
    price: number;
    services: string;  // string describing the service(s) provided by this package
    maximumCapacity?: number;
}

export interface SmartPackageInput {
    eventName: string;
    eventDate: Date;
    guests: number;
    services: string[];  // requested services, e.g. ['catering', 'decoration', 'photography']
    budget: number
}

@Injectable()
export class VendorService {
    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Category.name) private categoryModel: Model<Category>,
        private fileUploadService: FileUploadService
    ) { }

    async getAllVendorsByCategoryId(categoryId: string): Promise<User[]> {
        // Validate the categoryId
        if (!Types.ObjectId.isValid(categoryId)) {
            throw new Error('Invalid categoryId');
        }

        // Define the aggregation pipeline
        const pipeline = [
            {
                // Match vendors with the specified category and required fields
                $match: {
                    role: 'Vendor',
                    buisnessCategory: new Types.ObjectId(categoryId),
                    contactDetails: { $exists: true, $ne: null },
                    coverImage: { $exists: true, $ne: null },
                    packages: { $exists: true, $not: { $size: 0 } },
                    images: { $exists: true, $not: { $size: 0 } },
                    $or: [
                        { salonBusinessDetails: { $exists: true, $ne: null } },
                        { venueBusinessDetails: { $exists: true, $ne: null } },
                        { cateringBusinessDetails: { $exists: true, $ne: null } },
                        { photographerBusinessDetails: { $exists: true, $ne: null } },
                        { cakeBusinessDetails: { $exists: true, $ne: null } },
                        { mehndiBusinessDetails: { $exists: true, $ne: null } },
                        { soundBusinessDetails: { $exists: true, $ne: null } }
                    ]
                }
            },
            {
                // Add the BusinessDetails field by checking which business detail exists
                $addFields: {
                    BusinessDetails: {
                        $cond: [
                            { $ifNull: ['$salonBusinessDetails', false] },
                            '$salonBusinessDetails',
                            {
                                $cond: [
                                    { $ifNull: ['$venueBusinessDetails', false] },
                                    '$venueBusinessDetails',
                                    {
                                        $cond: [
                                            { $ifNull: ['$cateringBusinessDetails', false] },
                                            '$cateringBusinessDetails',
                                            {
                                                $cond: [
                                                    { $ifNull: ['$photographerBusinessDetails', false] },
                                                    '$photographerBusinessDetails',
                                                    {
                                                        $cond: [
                                                            { $ifNull: ['$cakeBusinessDetails', false] },
                                                            '$cakeBusinessDetails',
                                                            {
                                                                $cond: [
                                                                    { $ifNull: ['$mehndiBusinessDetails', false] },
                                                                    '$mehndiBusinessDetails',
                                                                    '$soundBusinessDetails'
                                                                ]
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                }
            },
            {
                // Optionally, exclude the original separate business detail fields
                $project: {
                    salonBusinessDetails: 0,
                    venueBusinessDetails: 0,
                    cateringBusinessDetails: 0,
                    photographerBusinessDetails: 0,
                    cakeBusinessDetails: 0,
                    mehndiBusinessDetails: 0,
                    soundBusinessDetails: 0
                }
            }
        ];

        // Execute the aggregation pipeline
        const vendors = await this.userModel.aggregate(pipeline).exec();

        return vendors as User[];
    }

    async findVendorById(id: string) {
        return await this.userModel
            .findOne({ _id: id, role: 'Vendor' })
            .populate('buisnessCategory')
            .exec();
    }

    async createContactDetails(
        userId: string,
        createContactDetailsDto: CreateContactDetailsDto,
        file: Express.Multer.File
    ): Promise<User> {
        const user = await this.userModel.findById(userId).exec();
        let fileUrl = null;

            if (file) {
            fileUrl = await this.fileUploadService.uploadFile(file);
        }
        if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

        user.contactDetails = { ...createContactDetailsDto, brandLogo: fileUrl?.Location || "" }
        return await user.save();
    }

    async updateContactDetails(
  userId: string,
  dto: CreateContactDetailsDto,
  file: Express.Multer.File,
): Promise<User> {

  const user = await this.userModel.findById(userId);

  if (!user) {
    throw new NotFoundException('User not found');
  }

  let logo = user.contactDetails?.brandLogo || "";

  if (file) {
    const uploaded = await this.fileUploadService.uploadFile(file);
    logo = uploaded?.Location || logo;
  }

  user.contactDetails = {
    ...user.contactDetails,
    ...dto,
    brandLogo: logo,
  };

  return await user.save();
}
   async createBuisnessDetails(
        userId: string,
        dto:
            CreatePhotographerBusinessDetailsDto |
            CreateSalonBusinessDetailsDto |
            CreateVenueBusinessDetailsDto |
            CreateCateringBusinessDetailsDto |
            CreateCakeBusinessDetailsDto |
            CreateMehndiBusinessDetailsDto |
            CreateSoundBusinessDetailsDto,
    ): Promise<User> {
        const user = await this.userModel.findById(userId).populate('buisnessCategory').exec();
        if (!user) {
            throw new NotFoundException(`User not found or not defined yet.`);
        }
        const category = user.buisnessCategory as Category;
        const categoryName = category.name.trim().toLowerCase();

        console.log("Category:", JSON.stringify(category.name));
        console.log("Normalized:", categoryName);
        if (!user) throw new NotFoundException(`User with ID ${userId} not found`);
        if (categoryName === "venues") {
            user.venueBusinessDetails = { ...dto } as unknown as VenueBusinessDetails;
        } else if (categoryName === "caterings") {
            user.cateringBusinessDetails = { ...dto } as unknown as CateringBusinessDetails;
        } else if (categoryName === "photography") {
            user.photographerBusinessDetails = { ...dto } as PhotographerBusinessDetails;
        } else if (categoryName === "makeup") {
            user.salonBusinessDetails = { ...dto } as unknown as SalonBusinessDetails;
        } else if (categoryName === "mehndi") {
            user.mehndiBusinessDetails = { ...dto } as unknown as MehndiBusinessDetails;
        } else if (categoryName === "cakes") {
           user.cakeBusinessDetails = { ...dto } as unknown as CakeBusinessDetails;
       } else if (categoryName === "dj & sound" || categoryName === "sound" || categoryName === "sounds" || categoryName === "dj") {
           user.soundBusinessDetails = { ...dto } as unknown as SoundBusinessDetails;
       }
        else {
            console.log("No Buisness Category", category);
            throw new NotFoundException(`Business Category not found or not defined yet.`);
        }
        return await user.save();
    } 

    

    async addPackages(userId: string, createPackagesDto: CreatePackagesDto): Promise<User> {
        const user = await this.userModel.findById(userId);
        if (!user) throw new NotFoundException('User not found');

        user.packages = createPackagesDto.packages; // Replace the current packages
        await user.save();
        return user;
    }

    async getContactDetails(userId: string) {
        const user = await this.userModel.findById(userId).select('contactDetails');
        if (!user) throw new NotFoundException('User not found');
        return user.contactDetails;
    }

    async getBusinessDetails(userId: string) {
        const user = await this.userModel.findById(userId).select(
            'salonBusinessDetails photographerBusinessDetails cateringBusinessDetails venueBusinessDetails cakeBusinessDetails mehndiBusinessDetails soundBusinessDetails',
        );

        if (!user) throw new NotFoundException('User not found');

        // Create an object with only non-null business details
        const businessDetails = {
            ...(user.salonBusinessDetails && { salonBusinessDetails: user.salonBusinessDetails }),
            ...(user.photographerBusinessDetails && { photographerBusinessDetails: user.photographerBusinessDetails }),
            ...(user.cateringBusinessDetails && { cateringBusinessDetails: user.cateringBusinessDetails }),
            ...(user.venueBusinessDetails && { venueBusinessDetails: user.venueBusinessDetails }),
            ...(user.cakeBusinessDetails && { cakeBusinessDetails: user.cakeBusinessDetails}),
            ...(user.mehndiBusinessDetails && { mehndiBusinessDetails: user.mehndiBusinessDetails}),
            ...(user.soundBusinessDetails && { soundBusinessDetails: user.soundBusinessDetails}),
        };

        return businessDetails;
    }

    async getPackages(userId: string) {
        const user = await this.userModel.findById(userId).select('packages');
        if (!user) throw new NotFoundException('User not found');
        return user.packages;
    }

    async getVendor(userId: string): Promise<any> {
        const user = await this.userModel.findById(userId).lean();
        const userObjToReturn = {
            ...user,
            BusinessDetails: user && user.photographerBusinessDetails
                    ? user.photographerBusinessDetails :
                     user?.cateringBusinessDetails ?
                     user.cateringBusinessDetails :
                     user?.venueBusinessDetails ?
                     user.venueBusinessDetails :
                     user?.salonBusinessDetails ?
                     user.salonBusinessDetails :
                     user?.cakeBusinessDetails ?
                     user.cakeBusinessDetails :
                     user?.mehndiBusinessDetails ?
                     user.mehndiBusinessDetails :
                     user?.soundBusinessDetails ?
                     user.soundBusinessDetails :
                     undefined
        }
        if (!user) throw new NotFoundException('User not found');
        return userObjToReturn;
    }

    async associateImagesWithUser(userId: string, imageUrls: string[]): Promise<void> {
        // Fetch the user by userId
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        // Assuming your User entity has an 'images' field which is an array of strings
        user.images = [...(user.images || []), ...imageUrls];
        user.coverImage = imageUrls[0];

        // Save the updated user
        await user.save();
    }

    async findAllVendorPackagesForService(service: string, guests: number) {
        // Find category by service name (case-insensitive exact match)
        const categoryObj = await this.categoryModel.findOne({
            name: { $regex: new RegExp(`^${service}$`, 'i') }
        });

        if (!categoryObj) {
            throw new Error(`Category not found for service: ${service}`);
        }

        const categoryId = categoryObj._id;

        // Aggregation pipeline: vendors matching category
        const pipeline = [
            {
                $match: {
                    role: 'Vendor',
                    packages: { $exists: true, $not: { $size: 0 } },
                    buisnessCategory: categoryId,
                }
            },
            {
                $addFields: {
                    BusinessDetails: {
                        $cond: [
                            { $ifNull: ['$salonBusinessDetails', false] }, '$salonBusinessDetails',
                            {
                                $cond: [
                                    { $ifNull: ['$venueBusinessDetails', false] }, '$venueBusinessDetails',
                                    {
                                        $cond: [
                                            { $ifNull: ['$cateringBusinessDetails', false] }, '$cateringBusinessDetails',
                                            {
                                                $cond: [
                                                    { $ifNull: ['$photographerBusinessDetails', false] }, '$photographerBusinessDetails',
                                                    {
                                                        $cond: [
                                                            { $ifNull: ['$cakeBusinessDetails', false] }, '$cakeBusinessDetails',
                                                            {
                                                                $cond: [
                                                                    { $ifNull: ['$mehndiBusinessDetails', false] }, '$mehndiBusinessDetails',
                                                                    '$soundBusinessDetails'
                                                                ]
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $project: {
                    salonBusinessDetails: 0,
                    venueBusinessDetails: 0,
                    cateringBusinessDetails: 0,
                    photographerBusinessDetails: 0,
                    cakeBusinessDetails: 0,
                    mehndiBusinessDetails: 0,
                    soundBusinessDetails: 0
                }
            }
        ];

        const vendors = await this.userModel.aggregate(pipeline).exec();

        // Filter by guest capacity
        const filteredVendors = vendors.filter(v => {
            const maxCapacity = v.BusinessDetails?.maximumPeopleCapacity ?? Infinity;
            return guests <= maxCapacity;
        });

        // Flatten all packages with vendor info
        const packages = filteredVendors.flatMap(vendor =>
            vendor.packages.map((pkg: any) => ({
                vendorId: vendor._id.toString(),
                vendorName: vendor.name,
                packageName: pkg.packageName,
                price: pkg.price,
                services: pkg.services,
                maximumCapacity: vendor.BusinessDetails?.maximumPeopleCapacity ?? Infinity,
            }))
        );

        return packages;
    }

    async generateSmartPackage(input: SmartPackageInput) {
        const services = input.services;
        const budget = input.budget;
        const guests = input.guests;

        // Fetch all candidates per service
        const allCandidates: { [service: string]: any[] } = {};
        for (const service of services) {
            const candidates = await this.findAllVendorPackagesForService(service, guests);
            allCandidates[service] = candidates || [];
        }

        let bestCombination: any[] = [];
        let bestCount = 0;
        let bestCost = Infinity;

        // Backtracking function
        function backtrack(index: number, chosen: any[], currentCost: number) {
            if (currentCost > budget) return; // prune

            if (index === services.length) {
                // Check if this selection is better than current best
                if (
                    chosen.length > bestCount ||
                    (chosen.length === bestCount && currentCost < bestCost)
                ) {
                    bestCount = chosen.length;
                    bestCost = currentCost;
                    bestCombination = [...chosen];
                }
                return;
            }

            const service = services[index];
            const candidates = allCandidates[service];

            // Option 1: skip this service
            backtrack(index + 1, chosen, currentCost);

            // Option 2: try each candidate package for this service
            for (const pkg of candidates) {
                // Calculate price considering Catering special rule
                const priceToAdd =
                    service.toLowerCase() === 'caterings' ? pkg.price * guests : pkg.price;

                backtrack(index + 1, [...chosen, pkg], currentCost + priceToAdd);
            }
        }

        backtrack(0, [], 0);

        if (bestCombination.length === 0) {
            throw new Error(`Cannot find any package combination within budget ${budget}`);
        }

        // Calculate totalCost to reflect Catering pricing as well
        const totalCost = bestCombination.reduce((sum, pkg) => {
            // Find the service this package belongs to
            const pkgService = services.find(s =>
                allCandidates[s].some(c => c.vendorId === pkg.vendorId && c.packageName === pkg.packageName)
            );
            if (!pkgService) return sum;
            return sum + (pkgService.toLowerCase() === 'caterings' ? pkg.price * guests : pkg.price);
        }, 0);

        return {
            eventName: input.eventName,
            eventDate: input.eventDate,
            guests,
            packages: bestCombination,
            totalCost,
            budget,
        };
    }

    async updatePackage(packageId: string, updateDto: UpdatePackageDto) {
        const updatePayload: any = {};
        if (updateDto.packageName !== undefined) updatePayload['packages.$.packageName'] = updateDto.packageName;
        if (updateDto.price !== undefined) updatePayload['packages.$.price'] = updateDto.price;
        if (updateDto.services !== undefined) updatePayload['packages.$.services'] = updateDto.services;

        const result = await this.userModel.updateOne(
            { 'packages._id': packageId },
            { $set: updatePayload }
        );

        if (result.modifiedCount === 0) {
            throw new NotFoundException('Package not updated');
        }

        const updatedUser = await this.userModel.findOne({ 'packages._id': packageId });
        return updatedUser?.packages.find((pkg: any) => pkg._id.toString() === packageId);
    }

    async deletePackage(packageId: string) {
        const result = await this.userModel.updateOne(
            { 'packages._id': packageId },
            { $pull: { packages: { _id: packageId } } }
        );

        if (result.modifiedCount === 0) {
            throw new NotFoundException('Package not found');
        }

        return { message: 'Package deleted successfully' };
    }

}