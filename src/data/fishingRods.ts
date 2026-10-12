export interface FishingRod {
  id: string;
  name: string;
  icon: string;
  image: string;            // Ảnh đại diện webp từ public/images/can_cau_webp
  price: number;
  maxDurability: number;
  castSpeed: number;        // Tốc độ cần câu đồng nhất
  lineSpeed: number;        // Tốc độ ra/phóng dây câu (càng xịn ra dây càng nhanh)
  bigFishLuck: number;      // Tỷ lệ xuất hiện & hút trúng cá to, cá khủng
  reelingPower: number;     // Hỗ trợ lực kéo cá (+0% -> +160%)
  safeZoneBonus: number;    // Mở rộng vùng an toàn cho cá lớn
  description: string;
  badge: string;
  color: string;
  gradient: string;
}

export const FISHING_RODS_CATALOG: FishingRod[] = [
  {
    id: 'wood_rod',
    name: 'Cần Câu Gỗ',
    icon: '🪵',
    image: '/images/can_cau_webp/01_can-cau-go.webp',
    price: 0,
    maxDurability: 10,
    castSpeed: 1.0,
    lineSpeed: 0.7,
    bigFishLuck: 0.15,
    reelingPower: 1.0,
    safeZoneBonus: 0,
    description: 'Cần câu gỗ mộc mạc làm từ gỗ thông. Ra dây nhẹ nhàng (0.7x), thích hợp cho người mới tập bắt cá bé.',
    badge: 'Cơ Bản',
    color: '#8B5A2B',
    gradient: 'from-amber-700 to-amber-900',
  },
  {
    id: 'reel_black_rod',
    name: 'Cần Máy Đen',
    icon: '🎣',
    image: '/images/can_cau_webp/02_can-cau-may-den.webp',
    price: 220,
    maxDurability: 18,
    castSpeed: 1.0,
    lineSpeed: 0.9,
    bigFishLuck: 0.35,
    reelingPower: 1.25,
    safeZoneBonus: 6,
    description: 'Cần máy guồng đen chắc tay bền bỉ. Ra dây 0.9x, độ bền 18 lượt, tăng tỷ lệ câu trúng cá vừa.',
    badge: 'Phổ Biến',
    color: '#374151',
    gradient: 'from-gray-700 to-gray-900',
  },
  {
    id: 'bamboo_rod',
    name: 'Cần Câu Tre',
    icon: '🎋',
    image: '/images/can_cau_webp/03_can-cau-tre.webp',
    price: 550,
    maxDurability: 30,
    castSpeed: 1.0,
    lineSpeed: 1.15,
    bigFishLuck: 0.55,
    reelingPower: 1.5,
    safeZoneBonus: 12,
    description: 'Thân tre già uốn dẻo dẻo dai. Ra dây 1.15x, lực giật tốt, tỷ lệ gặp cá to tăng +55%.',
    badge: 'Dẻo Dai',
    color: '#10B981',
    gradient: 'from-emerald-500 to-emerald-700',
  },
  {
    id: 'iron_rod',
    name: 'Cần Máy Bạc',
    icon: '⚙️',
    image: '/images/can_cau_webp/04_can-cau-may-bac.webp',
    price: 1400,
    maxDurability: 45,
    castSpeed: 1.0,
    lineSpeed: 1.45,
    bigFishLuck: 0.75,
    reelingPower: 1.8,
    safeZoneBonus: 18,
    description: 'Trục quay kim loại sáng bóng chịu lực cao. Phóng dây nhanh 1.45x, hút cá lớn và kéo cá rất êm.',
    badge: 'Chuyên Nghiệp',
    color: '#3B82F6',
    gradient: 'from-blue-500 to-blue-700',
  },
  {
    id: 'gold_rod',
    name: 'Cần Hoàng Gia',
    icon: '👑',
    image: '/images/can_cau_webp/05_can-cau-hoang-gia.webp',
    price: 3600,
    maxDurability: 65,
    castSpeed: 1.0,
    lineSpeed: 1.75,
    bigFishLuck: 0.9,
    reelingPower: 2.15,
    safeZoneBonus: 26,
    description: 'Đúc từ hợp kim vàng ròng vương giả. Phóng dây 1.75x, hút cá hiếm +90%, chế ngự cá khổng lồ nhẹ nhàng.',
    badge: 'Hoàng Gia',
    color: '#F59E0B',
    gradient: 'from-amber-400 to-yellow-600',
  },
  {
    id: 'cyber_rod',
    name: 'Cần Cầu Vồng',
    icon: '🌈',
    image: '/images/can_cau_webp/06_can-cau-cau-vong.webp',
    price: 8800,
    maxDurability: 95,
    castSpeed: 1.0,
    lineSpeed: 2.2,
    bigFishLuck: 1.0,
    reelingPower: 2.6,
    safeZoneBonus: 36,
    description: 'Cần câu ngũ sắc huyền thoại mang sức mạnh cầu vồng. Phóng dây thần tốc 2.2x, thu hút Cá Mập và cá thần thoại!',
    badge: 'Thần Thoại',
    color: '#EC4899',
    gradient: 'from-pink-500 to-purple-700',
  },
];

export function getRodById(id?: string): FishingRod {
  if (!id) return FISHING_RODS_CATALOG[0];
  const found = FISHING_RODS_CATALOG.find((r) => r.id === id);
  if (found) return found;

  // Backwards compatibility mappings for older save ids
  if (id === '01_can-cau-go' || id === 'can_go' || id === 'wood') return FISHING_RODS_CATALOG[0];
  if (id === '02_can-cau-may-den' || id === 'reel_black') return FISHING_RODS_CATALOG[1];
  if (id === '03_can-cau-tre' || id === 'can_tre' || id === 'bamboo') return FISHING_RODS_CATALOG[2];
  if (id === '04_can-cau-may-bac' || id === 'iron' || id === 'reel_silver') return FISHING_RODS_CATALOG[3];
  if (id === '05_can-cau-hoang-gia' || id === 'gold' || id === 'royal_rod') return FISHING_RODS_CATALOG[4];
  if (id === '06_can-cau-cau-vong' || id === 'rainbow' || id === 'cyber') return FISHING_RODS_CATALOG[5];

  return FISHING_RODS_CATALOG[0];
}
