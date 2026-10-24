import { deleteSecureData, getSecureData, saveSecureData } from '../store';

// A replacement search starts with an empty cart. Only remove the submitted
// package snapshots while this exact replacement still owns the cart context.
export async function clearExpiredReplacementCart(submittedCart: any, submittedEvent: any): Promise<void> {
  if (!submittedEvent?.replacementVendorOrderId) return;
  const rawEvent = await getSecureData('eventDetails');
  const currentEvent = rawEvent ? JSON.parse(rawEvent) : null;
  if (!currentEvent || String(currentEvent.replacementVendorOrderId || '') !== String(submittedEvent.replacementVendorOrderId) || String(currentEvent.eventId || '') !== String(submittedEvent.eventId || '')) return;
  const rawCart = await getSecureData('cartData');
  const currentCart = rawCart ? JSON.parse(rawCart) : null;
  if (currentCart?.vendors?.length) {
    const vendors = currentCart.vendors.map((entry: any) => {
      const submitted = submittedCart?.vendors?.find((v: any) => String(v.vendor?._id || '') === String(entry.vendor?._id || ''));
      const snapshots = new Set((submitted?.packages || []).map((pkg: any) => JSON.stringify(pkg)));
      return { ...entry, packages: (entry.packages || []).filter((pkg: any) => !snapshots.has(JSON.stringify(pkg))) };
    }).filter((entry: any) => entry.packages.length);
    if (vendors.length) {
      await saveSecureData('cartData', JSON.stringify({ ...currentCart, vendors }));
      return;
    }
  }
  await deleteSecureData('cartData');
  await deleteSecureData('eventDetails');
}
