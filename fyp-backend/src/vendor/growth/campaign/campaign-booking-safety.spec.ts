import { Types } from 'mongoose';
import { CampaignService } from './campaign.service';
import { CampaignStatus } from '../../../schemas/vendor-campaign.schema';
const id=()=>new Types.ObjectId();
describe('Sponsored campaign booking safety',()=>{
 beforeEach(()=>{jest.useFakeTimers();jest.setSystemTime(new Date('2026-10-24T07:00:00Z'))});afterEach(()=>jest.useRealTimers());
 function fixture(allowed=true,hasPackage=true){
  const vendor=id(),pkg=id();const campaign:any={_id:id(),vendorId:vendor,packageId:pkg,status:CampaignStatus.ACTIVE,startDate:new Date(Date.now()-1000),endDate:new Date(Date.now()+86400000)};
  const s:any=Object.create(CampaignService.prototype);s.syncCampaignLifecycle=jest.fn(async()=>{});
  s.campaignModel={find:jest.fn(()=>({sort:()=>({lean:async()=>[campaign]})}))};
  s.userModel={find:()=>({select:()=>({lean:async()=>[{_id:vendor,packages:hasPackage?[{_id:pkg,packageName:'Exact package',price:6000}]:[]}]})})};
  s.featureAccessService={getCampaignAccessEndDate:async()=>allowed?new Date(Date.now()+86400000):null};return{s,campaign,pkg};
 }
 it('requires active campaigns within their saved start/end dates',async()=>{const f=fixture();await f.s.getActiveSponsoredCampaigns();const query=f.s.campaignModel.find.mock.calls[0][0];expect(query.status).toBe(CampaignStatus.ACTIVE);expect(query.startDate.$lte).toEqual(new Date());expect(query.endDate.$gte).toEqual(new Date());});
 it('preserves exact linked package and price for the campaign click',async()=>{const f=fixture();const result=await f.s.getActiveSponsoredCampaigns();expect(result[0].packageId).toEqual(f.pkg);expect(result[0].package).toMatchObject({_id:f.pkg,price:6000});});
 it('hides a campaign when subscription entitlement expires',async()=>{const f=fixture(false);expect(await f.s.getActiveSponsoredCampaigns()).toEqual([])});
 it('does not silently substitute another package when linked package is missing',async()=>{const f=fixture(true,false);expect(await f.s.getActiveSponsoredCampaigns()).toEqual([])});
});
