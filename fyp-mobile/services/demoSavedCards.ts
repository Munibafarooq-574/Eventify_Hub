import { getSecureData, saveSecureData, getUserData } from '../store';
import { DEMO_CARD_OPTIONS, isExpiryValid, type DemoCardId } from '../utils/cardPaymentValidation';

// Synthetic-card shortcuts only. Never store a PAN, CVV or real gateway credential here.
export type SavedDemoCard = { demoCardId: DemoCardId; name: string; expiry: string };
export async function getCardOwnerId(): Promise<string> {
  const [user, token] = await Promise.all([getUserData(), getSecureData('token')]);
  if (!token || typeof user?._id !== 'string' || !/^[a-f\d]{24}$/i.test(user._id)) throw new Error('Please sign in again.');
  return user._id;
}
export async function assertCardOwner(ownerId: string) {
  if (await getCardOwnerId() !== ownerId) throw new Error('Your account changed. Reopen the payment screen.');
}
const key = (ownerId: string) => `eventify-demo-cards-v1-${ownerId}`;
function clean(value: unknown): SavedDemoCard | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as SavedDemoCard;
  if (!DEMO_CARD_OPTIONS.some(card => card.id === row.demoCardId) || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 80 || typeof row.expiry !== 'string' || !/^\d{2}\/\d{2}$/.test(row.expiry)) return null;
  return { demoCardId: row.demoCardId, name: row.name.trim(), expiry: row.expiry };
}
export async function listDemoCards(ownerId: string): Promise<SavedDemoCard[]> {
  await assertCardOwner(ownerId);
  const raw = await getSecureData(key(ownerId));
  if (!raw) return [];
  let data: { ownerId?: string; cards?: unknown[] };
  try { data = JSON.parse(raw); } catch { return []; }
  if (!data || data.ownerId !== ownerId || !Array.isArray(data.cards)) return [];
  const unique = new Map<DemoCardId, SavedDemoCard>();
  for (const entry of data.cards) { const card = clean(entry); if (card) unique.set(card.demoCardId, card); }
  await assertCardOwner(ownerId);
  return [...unique.values()];
}
export async function rememberDemoCard(ownerId: string, input: SavedDemoCard): Promise<SavedDemoCard[]> {
  const card = clean(input);
  if (!card || !isExpiryValid(card.expiry)) throw new Error('A valid test card and expiry are required.');
  const cards = (await listDemoCards(ownerId)).filter(item => item.demoCardId !== card.demoCardId);
  cards.push(card);
  await assertCardOwner(ownerId);
  await saveSecureData(key(ownerId), JSON.stringify({ ownerId, cards }));
  return cards;
}
export async function removeDemoCard(ownerId: string, demoCardId: DemoCardId): Promise<SavedDemoCard[]> {
  const cards = (await listDemoCards(ownerId)).filter(card => card.demoCardId !== demoCardId);
  await assertCardOwner(ownerId);
  await saveSecureData(key(ownerId), JSON.stringify({ ownerId, cards }));
  return cards;
}
