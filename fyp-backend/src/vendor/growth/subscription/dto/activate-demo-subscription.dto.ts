// fyp-backend/src/vendor/growth/subscription/dto/activate-demo-subscription.dto.ts

import { IsEnum } from 'class-validator';

import { SubscriptionPlan } from '../subscription.types';

export class ActivateDemoSubscriptionDto {
  @IsEnum(SubscriptionPlan, {
    message: 'plan must be one of: free, growth, premium',
  })
  plan!: SubscriptionPlan;
}