// fyp-backend/src/admin/admin-commission.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommissionConfig } from 'src/schemas/commission-config.schema';

@Injectable()
export class AdminCommissionService {
    constructor(
        @InjectModel(CommissionConfig.name)
        private readonly commissionConfigModel: Model<CommissionConfig>,
    ) {}

    async getConfig() {
        let config = await this.commissionConfigModel.findOne();
        if (!config) {
            config = await this.commissionConfigModel.create({});
        }
        return config;
    }

    async updateConfig(percentage: number) {
        // Platform is commission-free by design right now. This endpoint
        // stays available for future use, but any change away from 0%
        // is logged so it's a visible, deliberate decision — never silent.
        if (percentage > 0) {
            console.warn(
                `[CommissionConfig] Admin is setting platform commission to ${percentage}%. ` +
                `This will apply to future vendor-order acceptances only — ` +
                `existing bookings keep their original snapshot.`,
            );
        }

        let config = await this.commissionConfigModel.findOne();
        if (!config) {
            config = new this.commissionConfigModel({});
        }
        config.platformCommissionPercentage = percentage;
        return config.save();
    }
}