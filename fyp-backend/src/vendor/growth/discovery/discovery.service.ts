// fyp-backend/src/vendor/growth/discovery/discovery.service.ts
//
// Per spec section 4: "Do not make paid vendors completely replace
// relevance-based search... Featured status should be an additional
// ranking/visibility factor."
//
// I don't have your Vendor Search screen or HomeScreen's contents, so I
// can't wire this in directly on the frontend (same caution as every
// other unseen screen this whole project). What I *do* have is
// vendor.service.ts in full, from your very first message — but I chose
// NOT to edit it directly, for two reasons:
//   1. Consistency — every other existing-file change in this project
//      (vendor.module.ts exports, app.module.ts import) was handed to
//      you as an instruction rather than silently rewritten, since your
//      real files may have moved on since you shared them with me.
//   2. Safety — vendor.service.ts's getAllVendorsByCategoryId() has no
//      existing relevance/rating sort to preserve (it's a category
//      $match with no $sort at all today), so there's nothing to
//      "layer onto" inside that method. Wrapping it here, instead of
//      editing it, means your existing endpoint's behavior is
//      completely unchanged — zero risk — and this becomes an
//      additive, opt-in enhancement your Vendor Search screen can
//      switch to whenever you're ready.
//
// This service calls your existing VendorService methods as-is and just
// re-sorts + tags the results with isFeatured — it doesn't reimplement
// or duplicate the underlying category/package matching logic.

import { Injectable } from '@nestjs/common';
import { VendorService } from 'src/vendor/vendor.service';
import { PromotionService } from '../promotion/promotion.service';

@Injectable()
export class DiscoveryService {
  constructor(
    private readonly vendorService: VendorService,
    private readonly promotionService: PromotionService,
  ) {}

  /**
   * Wraps VendorService.getAllVendorsByCategoryId(). Featured vendors are
   * moved to the front of the list — everyone else keeps whatever
   * relative order the underlying query already returned (category match
   * stays the actual filter; this only reorders within it). Adds
   * `isFeatured` to each vendor so the UI can show a badge/tag.
   */
  async getVendorsByCategory(categoryId: string) {
    const [vendors, featuredIds] = await Promise.all([
      this.vendorService.getAllVendorsByCategoryId(categoryId),
      this.promotionService.getActiveFeaturedVendorIds(),
    ]);

    const tagged = vendors.map((v: any) => ({
      ...(v.toObject ? v.toObject() : v),
      isFeatured: featuredIds.has(v._id.toString()),
    }));

    // Stable partition: featured first, everyone else keeps their
    // original relative order. Array.sort in Node's V8 is stable, so
    // this is safe.
    return tagged.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
  }

  /**
   * Wraps VendorService.findAllVendorPackagesForService(). Same
   * stable-partition approach: featured packages first, original
   * relative order preserved otherwise. Adds `isFeatured` per package.
   */
  async getPackagesByService(service: string, guests: number) {
    const [packages, featuredPackageIds] = await Promise.all([
      this.vendorService.findAllVendorPackagesForService(service, guests),
      this.promotionService.getActiveFeaturedPackageIds(),
    ]);

    // findAllVendorPackagesForService doesn't currently return a package
    // _id (see the shape it builds in vendor.service.ts) — only
    // vendorId/vendorName/packageName/price/services/maximumCapacity —
    // so there's no id to match against featuredPackageIds yet. Flagged
    // in PHASE_9_README.md as a one-line addition needed in that
    // existing method (`packageId: pkg._id.toString()`) for this to
    // actually tag anything; until then isFeatured will just be false
    // for every entry and the order is unchanged (safe no-op, not broken).
    const tagged = packages.map((p: any) => ({
      ...p,
      isFeatured: p.packageId ? featuredPackageIds.has(p.packageId) : false,
    }));

    return tagged.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
  }
}