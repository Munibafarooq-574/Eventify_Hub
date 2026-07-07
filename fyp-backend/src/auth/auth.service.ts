import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { User } from './schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Category } from './schemas/category.schema';
import { UpdateUserProfileDto } from './dto/update-profile.dto';
import { UpdatePushTokenDto } from './dto/update-push-token.dto';
import { SearchVendorsDto } from './dto/search-vendors.dto';
import { Review } from './schemas/review.schema';

@Injectable()
export class AuthService {
  private readonly logger = new Logger("fyp")
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(Review.name) private reviewModel: Model<Review>,
    private jwtService: JwtService,
  ) { }

  async register(registerDto: RegisterDto) {
    const { email, password, role, buisnessCategories } = registerDto;
    this.logger.log(registerDto, "Register");

    const category = await this.categoryModel.findById(buisnessCategories || new Types.ObjectId("682729b2b7d619074bb00135"));
    console.log(category);
    if (!category && role !== "Organizer") {
      throw new NotFoundException('Category doesnt exists')
    }

    // Check if the user already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new UnauthorizedException('Email already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await this.userModel.create({
      ...registerDto,
      buisnessCategory: category?._id || new Types.ObjectId("682729b2b7d619074bb00135"),
      role: role,
      password: hashedPassword,
      phone_number: registerDto.mobileNumber,
      address: registerDto.address
    });

    // Generate JWT token
    const token = this.jwtService.sign({ id: user._id });
    return { token, user };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.password) {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    const token = this.jwtService.sign({ id: user._id });
    return { token, user };
  }

  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const resetToken = this.jwtService.sign(
      { id: user._id },
      { expiresIn: '1h' },
    );

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "0"),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      to: email,
      subject: 'Password Reset',
      html: `Click <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}">here</a> to reset your password.`,
    });

    return { message: 'Password reset email sent' };
  }

  async validateOAuthUser(profile: any, provider: string) {
    const email = profile.emails[0].value;
    let user = await this.userModel.findOne({ email });

    if (!user) {
      user = await this.userModel.create({
        email,
        provider,
        providerId: profile.id,
        name: profile.displayName,
      });
    }

    const token = this.jwtService.sign({ id: user._id });
    return { token };
  }

  async updateUser(updateDto: UpdateUserProfileDto): Promise<User> {
    console.log(updateDto);
    const updatedUser = await this.userModel.findByIdAndUpdate(updateDto.userId, {
      name: updateDto.name,
      email: updateDto.email,
      address: updateDto.address,
      phone_number: updateDto.phoneNumber
    }, { new: true });
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    return updatedUser;
  }

  async searchUsers(keyword: string): Promise<User[]> {
    return this.userModel.find({
      role: 'Vendor', // ✅ Only fetch vendors
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { 'contactDetails.brandName': { $regex: keyword, $options: 'i' } },
      ],
    }).exec();
  }

  async searchVendorsByFilters(filters: SearchVendorsDto): Promise<any[]> {
    console.log("Filters", filters);
    const hasFilters = Object.values(filters || {}).some(v => v !== undefined && v !== null && v !== '');

    if (!hasFilters) {
      const allVendors = await this.userModel.find({ role: 'Vendor' }).lean();
      return allVendors.map(this.attachBusinessDetails);
    }

    const query: any = {
      role: 'Vendor',
    };

    if (filters.name) {
      query['name'] = { $regex: filters.name, $options: 'i' };
    }

    if (filters.categoryId) {
      query['buisnessCategory'] = new Types.ObjectId(filters.categoryId);
    }

    if (filters.city) {
      query['$or'] = [
        ...(query['$or'] || []), // preserve existing $or conditions like staff or cancellationPolicy
        { 'photographerBusinessDetails.cityCovered': { $regex: filters.city, $options: 'i' } },
        { 'salonBusinessDetails.cityCovered': { $regex: filters.city, $options: 'i' } },
        { 'cateringBusinessDetails.cityCovered': { $regex: filters.city, $options: 'i' } },
        // VenueBusinessDetails may not have cityCovered, so optionally include:
        { 'venueBusinessDetails.cityCovered': { $regex: filters.city, $options: 'i' } }
      ];
    }


    if (filters.staff) {
      query['$or'] = [
        { 'photographerBusinessDetails.staff': filters.staff },
        { 'salonBusinessDetails.staffGender': filters.staff },
        { 'cateringBusinessDetails.staff': filters.staff },
        { 'venueBusinessDetails.staff': filters.staff },
      ];
    }

    if (filters.cancellationPolicy) {
      if (!query['$or']) query['$or'] = [];
      query['$or'].push(
        { 'salonBusinessDetails.cancellationPolicy': filters.cancellationPolicy },
        { 'cateringBusinessDetails.cancellationPolicy': filters.cancellationPolicy },
        { 'venueBusinessDetails.cancellationPolicy': filters.cancellationPolicy }
      );
    }

    const users = await this.userModel.find(query).lean();

    // ✅ Filter by ratings
    let filteredUsers = users;
    if (typeof filters.minRating === 'number') {
      const vendorIds = users.map(user => user._id);
      const reviews = await this.reviewModel.aggregate([
        { $match: { vendorId: { $in: vendorIds } } },
        {
          $group: {
            _id: '$vendorId',
            avgRating: { $avg: '$rating' },
          },
        },
      ]);

      const ratingMap = new Map(reviews.map(r => [r._id.toString(), r.avgRating]));

      filteredUsers = users.filter(user => {
        const avg = ratingMap.get(user._id.toString()) ?? 0;
        return avg >= filters.minRating!;
      });
    }

    // ✅ Attach unified BusinessDetails to each user
    return filteredUsers.map(this.attachBusinessDetails);
  }

  private attachBusinessDetails(user: any): any {
    return {
      ...user,
      BusinessDetails:
        user?.photographerBusinessDetails ??
        user?.cateringBusinessDetails ??
        user?.venueBusinessDetails ??
        user?.salonBusinessDetails ??
        undefined,
    };
  }

  async updatePushToken(dto: UpdatePushTokenDto) {
    const user = await this.userModel.findById(dto.userId);
    if (!user) throw new NotFoundException('User not found');
    console.log(dto);
    user.pushToken = dto.token;
    return await user.save();
  }

  async getUserPushToken(userId: string): Promise<string> {
    const user = await this.userModel.findById(userId).select('pushToken');

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!user.pushToken) {
      throw new NotFoundException(`Push token not found for user ID ${userId}`);
    }

    return user.pushToken;
  }
}