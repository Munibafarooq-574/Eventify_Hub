import { validate } from 'class-validator';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { VendorCampaignSchema } from '../../../schemas/vendor-campaign.schema';

describe('Campaign poster display mode', () => {
  function draft(displayMode?: string) {
    return Object.assign(new CreateCampaignDto(), {
      packageId: '507f1f77bcf86cd799439011',
      title: 'Bridal Mehndi',
      description: 'A beautiful bridal mehndi package',
      startDate: '2026-11-12T00:00:00.000Z',
      endDate: '2026-11-20T00:00:00.000Z',
      ...(displayMode ? { displayMode } : {}),
    });
  }

  it.each(['POSTER', 'AUTO'])('accepts %s as a valid campaign presentation mode', async mode => {
    expect(await validate(draft(mode))).toHaveLength(0);
  });

  it('keeps older campaigns valid without a displayMode field', async () => {
    expect(await validate(draft())).toHaveLength(0);
    expect(VendorCampaignSchema.path('displayMode').getDefault(undefined)).toBe('AUTO');
  });

  it('rejects an unknown presentation mode', async () => {
    const errors = await validate(draft('UNKNOWN'));
    expect(errors.some(error => error.property === 'displayMode')).toBe(true);
  });
});
