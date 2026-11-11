import { Types } from 'mongoose';
import { CampaignService } from './campaign.service';
import { CampaignStatus } from '../../../schemas/vendor-campaign.schema';

const id = () => new Types.ObjectId();

describe('Sponsored campaign booking safety', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-11T07:00:00Z'));
  });
  afterEach(() => jest.useRealTimers());

  function fixture({
    subscriptionActive = true,
    campaignEnabled = true,
    campaignExpiry = new Date(Date.now() + 86400000),
    linkedPackage = true,
    packageActive = true,
  }: {
    subscriptionActive?: boolean;
    campaignEnabled?: boolean;
    campaignExpiry?: Date | null;
    linkedPackage?: boolean;
    packageActive?: boolean;
  } = {}) {
    const vendor = id();
    const pkg = id();
    const campaign: any = {
      _id: id(), vendorId: vendor, packageId: pkg, status: CampaignStatus.ACTIVE,
      startDate: new Date(Date.now() - 1000), endDate: new Date(Date.now() + 86400000),
    };
    const service: any = Object.create(CampaignService.prototype);
    service.syncCampaignLifecycle = jest.fn(async () => {});
    service.campaignModel = {
      find: jest.fn(() => ({ sort: () => ({ lean: async () => [campaign] }) })),
    };
    service.userModel = {
      find: () => ({ select: () => ({
        lean: async () => [{
          _id: vendor,
          packages: linkedPackage
            ? [{ _id: pkg, packageName: 'Exact package', price: 6000, isActive: packageActive }]
            : [],
        }],
      }) }),
    };
    service.featureAccessService = {
      hasActiveSubscription: jest.fn(async () => subscriptionActive),
      canCreateCampaign: jest.fn(async () => campaignEnabled),
      getCampaignAccessEndDate: jest.fn(async () => campaignExpiry),
    };
    return { service, campaign, vendor, pkg };
  }

  it('requires active campaigns within their scheduled dates', async () => {
    const f = fixture();
    await f.service.getActiveSponsoredCampaigns();
    const query = f.service.campaignModel.find.mock.calls[0][0];
    expect(query.status).toBe(CampaignStatus.ACTIVE);
    expect(query.startDate.$lte).toEqual(new Date());
    expect(query.endDate.$gte).toEqual(new Date());
  });

  it('keeps the exact linked package and original price', async () => {
    const f = fixture();
    const result = await f.service.getActiveSponsoredCampaigns();
    expect(result[0].packageId).toEqual(f.pkg);
    expect(result[0].package).toMatchObject({ _id: f.pkg, price: 6000 });
  });

  it.each([
    ['expired subscription', { subscriptionActive: false }],
    ['campaign benefit revoked', { campaignEnabled: false }],
    ['expired campaign entitlement', { campaignExpiry: new Date(Date.now() - 1) }],
    ['missing campaign entitlement', { campaignExpiry: null }],
    ['removed linked package', { linkedPackage: false }],
    ['inactive linked package', { packageActive: false }],
  ])('hides an ad if %s', async (_name, options) => {
    const f = fixture(options);
    expect(await f.service.getActiveSponsoredCampaigns()).toEqual([]);
  });

  it('re-evaluates booking entitlement after a renewal, without mutating the campaign', async () => {
    const f = fixture({ subscriptionActive: false });
    expect(await f.service.getActiveSponsoredCampaigns()).toEqual([]);
    f.service.featureAccessService.hasActiveSubscription.mockResolvedValue(true);
    expect((await f.service.getActiveSponsoredCampaigns())[0].packageId).toEqual(f.pkg);
    expect(f.campaign.status).toBe(CampaignStatus.ACTIVE);
  });
});
