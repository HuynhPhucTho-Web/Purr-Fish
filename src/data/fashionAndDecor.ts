export type FashionCategory = 'hats' | 'clothes' | 'bowls' | 'balls' | 'rugs';

export interface FashionDecorItem {
  id: string;
  category: FashionCategory;
  name: string;
  icon: string;
  price: number;
  badge: string;
  description: string;
  perk?: string;
  color: string;
  accentColor: string;
}

export const FASHION_DECOR_CATALOG: FashionDecorItem[] = [
  // =========================================================================
  // 1. MŨ CHO MÈO (HATS)
  // =========================================================================
  {
    id: 'hat_straw',
    category: 'hats',
    name: 'Mũ Rơm Đi Biển',
    icon: '👒',
    price: 150,
    badge: 'Mát Mẻ',
    description: 'Mũ cói vành rộng gắn dải ruy băng xanh mát, che chắn cho Boss khi đi câu.',
    perk: '+5% Tỷ lệ gặp cá to',
    color: '#F59E0B',
    accentColor: '#FEF3C7',
  },
  {
    id: 'hat_wizard',
    category: 'hats',
    name: 'Mũ Phù Thủy Mini',
    icon: '🧙',
    price: 320,
    badge: 'Ma Thuật',
    description: 'Mũ chóp tím lấp lánh sao vàng mang lại linh cảm huyền bí khi săn cá.',
    perk: '+8% Điểm kinh nghiệm (XP)',
    color: '#8B5CF6',
    accentColor: '#EDE9FE',
  },
  {
    id: 'hat_warm_beanie',
    category: 'hats',
    name: 'Mũ Len Mùa Đông',
    icon: '🧶',
    price: 280,
    badge: 'Ấm Áp',
    description: 'Mũ len đan tay có quả bông tròn trên đỉnh, giữ ấm đôi tai xinh xắn.',
    perk: 'Giảm 10% tốc độ đói',
    color: '#EC4899',
    accentColor: '#FCE7F3',
  },
  {
    id: 'hat_pirate',
    category: 'hats',
    name: 'Mũ Hải Tặc Biển Sâu',
    icon: '🏴‍☠️',
    price: 550,
    badge: 'Bá Đạo',
    description: 'Mũ thuyền trưởng tam giác kiêu hãnh thống trị mọi vùng biển hồ.',
    perk: '+12% Xu nhận được khi bán cá',
    color: '#1F2937',
    accentColor: '#F3F4F6',
  },
  {
    id: 'hat_crown',
    category: 'hats',
    name: 'Vương Miện Hoàng Gia',
    icon: '👑',
    price: 1200,
    badge: 'VIP',
    description: 'Vương miện vàng nạm hồng ngọc quý giá, khẳng định uy quyền Boss Mèo.',
    perk: '+20% Lực vuốt ve Click Power',
    color: '#EAB308',
    accentColor: '#FEF08A',
  },
  {
    id: 'hat_frog',
    category: 'hats',
    name: 'Mũ Ếch Con Kawaii',
    icon: '🐸',
    price: 220,
    badge: 'Ngộ Nghĩnh',
    description: 'Mũ xanh hai mắt ếch lồi siêu dễ thương khiến ai nhìn cũng tan chảy.',
    perk: '+6% Combo thần tốc',
    color: '#10B981',
    accentColor: '#D1FAE5',
  },
  {
    id: 'hat_party',
    category: 'hats',
    name: 'Mũ Chóp Sinh Nhật',
    icon: '🥳',
    price: 100,
    badge: 'Tiệc Tùng',
    description: 'Nón chóp họa tiết chấm bi sặc sỡ cho những buổi tiệc cá linh đình.',
    perk: '+3% Tốc độ tự bắt cá',
    color: '#F43F5E',
    accentColor: '#FFE4E6',
  },

  // =========================================================================
  // 2. ÁO CHO MÈO (CLOTHES)
  // =========================================================================
  {
    id: 'clothes_sailor',
    category: 'clothes',
    name: 'Áo Thủy Thủ Nhí',
    icon: '⚓',
    price: 280,
    badge: 'Năng Động',
    description: 'Áo cổ bèo thủy thủ sọc xanh trắng phong cách lính biển tinh nghịch.',
    perk: '+8% Tốc độ ra dây câu',
    color: '#0284C7',
    accentColor: '#E0F2FE',
  },
  {
    id: 'clothes_hoodie_pink',
    category: 'clothes',
    name: 'Áo Hoodie Hồng Pastel',
    icon: '🧥',
    price: 350,
    badge: 'Ngọt Ngào',
    description: 'Áo khoác nỉ hoodie màu hồng dâu tây siêu êm ái cho mèo lười sưởi nắng.',
    perk: '+5% Tỷ lệ xu may mắn',
    color: '#F472B6',
    accentColor: '#FDF2F8',
  },
  {
    id: 'clothes_superman',
    category: 'clothes',
    name: 'Áo Choàng Siêu Mèo',
    icon: '🦸',
    price: 650,
    badge: 'Anh Hùng',
    description: 'Áo choàng đỏ phấp phới tung bay trong gió bảo vệ hòa bình cho đàn mèo.',
    perk: '+15% Sức mạnh kéo cần',
    color: '#DC2626',
    accentColor: '#FEE2E2',
  },
  {
    id: 'clothes_kimono',
    category: 'clothes',
    name: 'Áo Kimono Hoa Đào',
    icon: '👘',
    price: 850,
    badge: 'Truyền Thống',
    description: 'Trang phục truyền thống Nhật Bản thêu hoa anh đào thanh nhã quý phái.',
    perk: '+10% XP & Xu toàn diện',
    color: '#DB2777',
    accentColor: '#FCE7F3',
  },
  {
    id: 'clothes_gentleman',
    category: 'clothes',
    name: 'Bộ Tuxedo Quý Ông',
    icon: '🤵',
    price: 1500,
    badge: 'Thượng Lưu',
    description: 'Bộ vest đen nơ đỏ trang trọng biến Boss thành quý tộc thượng lưu bậc nhất.',
    perk: '+25% Tốc độ tự câu Idle',
    color: '#111827',
    accentColor: '#F9FAFB',
  },
  {
    id: 'clothes_scarf_red',
    category: 'clothes',
    name: 'Khăn Quàng Cổ Đỏ',
    icon: '🧣',
    price: 160,
    badge: 'Dễ Thương',
    description: 'Khăn len quàng cổ màu đỏ tươi giữ ấm cổ mèo trong những ngày sương gió.',
    perk: '+5% Hồi nước tự nhiên',
    color: '#EF4444',
    accentColor: '#FEE2E2',
  },

  // =========================================================================
  // 3. MÁNG ĂN TRANG TRÍ PHÒNG (FOOD BOWLS)
  // =========================================================================
  {
    id: 'bowl_clay',
    category: 'bowls',
    name: 'Máng Đất Nung Mộc',
    icon: '🥣',
    price: 0,
    badge: 'Khởi Đầu',
    description: 'Chiếc máng ăn đất nung mộc mạc, gần gũi và bền bỉ trong sảnh phòng.',
    perk: 'Máng ăn khởi đầu',
    color: '#B45309',
    accentColor: '#FEF3C7',
  },
  {
    id: 'bowl_pink_paw',
    category: 'bowls',
    name: 'Máng Sứ Chân Mèo Hồng',
    icon: '🐾',
    price: 180,
    badge: 'Kawaii',
    description: 'Máng ăn gốm sứ màu hồng phấn in hình dấu chân đệm thịt mèo siêu yêu.',
    perk: '+5% Điểm No khi cho Boss ăn',
    color: '#F43F5E',
    accentColor: '#FFE4E6',
  },
  {
    id: 'bowl_stainless',
    category: 'bowls',
    name: 'Máng Inox Đôi Sáng Bóng',
    icon: '🥈',
    price: 350,
    badge: 'Hiện Đại',
    description: 'Máng đôi bằng thép không gỉ sáng loáng, vừa đựng thức ăn vừa đựng nước trong vắt.',
    perk: '+8% Hiệu quả ăn & uống',
    color: '#64748B',
    accentColor: '#F1F5F9',
  },
  {
    id: 'bowl_royal_gold',
    category: 'bowls',
    name: 'Máng Gốm Dát Vàng Hoàng Gia',
    icon: '👑',
    price: 800,
    badge: 'Quý Tộc',
    description: 'Máng thức ăn bằng sứ hoàng gia nạm viền vàng 24K sang trọng bậc nhất.',
    perk: '+15% XP khi Boss chén đồ ăn',
    color: '#EAB308',
    accentColor: '#FEF9C3',
  },
  {
    id: 'bowl_cyber_dispenser',
    category: 'bowls',
    name: 'Máy Nhả Hạt Thông Minh',
    icon: '🤖',
    price: 1400,
    badge: 'Công Nghệ',
    description: 'Trạm cấp thức ăn tự động công nghệ cao với đèn LED báo hiệu.',
    perk: 'Tự động hồi 1% độ no mỗi 30s',
    color: '#06B6D4',
    accentColor: '#CFFAFE',
  },

  // =========================================================================
  // 4. QUẢ BANH & ĐỒ CHƠI TRANG TRÍ PHÒNG (TOY BALLS)
  // =========================================================================
  {
    id: 'ball_yarn_red',
    category: 'balls',
    name: 'Cuộn Len Đỏ Cuộn Tròn',
    icon: '🧶',
    price: 0,
    badge: 'Khởi Đầu',
    description: 'Cuộn len màu đỏ rực rỡ, món đồ chơi khoái khẩu của mèo từ thời thơ ấu.',
    perk: 'Đồ chơi khởi đầu',
    color: '#DC2626',
    accentColor: '#FEE2E2',
  },
  {
    id: 'ball_jingle_bell',
    category: 'balls',
    name: 'Quả Banh Chuông Vàng Keng',
    icon: '🔔',
    price: 220,
    badge: 'Vui Tai',
    description: 'Quả cầu lục lạc bằng kim loại phát ra tiếng chuông leng keng vui nhộn khi đụng vào.',
    perk: 'Nhấp vào banh nhận ngay +5 Xu ngẫu nhiên',
    color: '#F59E0B',
    accentColor: '#FEF3C7',
  },
  {
    id: 'ball_rainbow',
    category: 'balls',
    name: 'Quả Bóng Nảy Cầu Vồng',
    icon: '🌈',
    price: 420,
    badge: 'Năng Động',
    description: 'Quả bóng cao su 7 sắc cầu vồng siêu nảy, nảy tưng bừng khắp sảnh phòng.',
    perk: '+10% Lực nảy và tốc độ click',
    color: '#EC4899',
    accentColor: '#FDF2F8',
  },
  {
    id: 'toy_plush_mouse',
    category: 'balls',
    name: 'Chuột Bông Gòn Béo Tròn',
    icon: '🐭',
    price: 600,
    badge: 'Đồ Chơi',
    description: 'Chú chuột nhồi bông đuôi dài cho mèo tha đi khắp nhà và vồ bắt.',
    perk: '+8% Tỷ lệ cá hiếm trong hồ',
    color: '#9CA3AF',
    accentColor: '#F3F4F6',
  },
  {
    id: 'toy_feather_wand',
    category: 'balls',
    name: 'Cây Cần Câu Lông Vũ',
    icon: '🪶',
    price: 850,
    badge: 'Phấn Khích',
    description: 'Cần vẫy lông vũ ngũ sắc đung đưa kích thích bản năng săn mồi tối thượng.',
    perk: '+15% Tốc độ vuốt ve',
    color: '#8B5CF6',
    accentColor: '#EDE9FE',
  },

  // =========================================================================
  // 5. THẢM NẰM TRANG TRÍ PHÒNG (RUGS)
  // =========================================================================
  {
    id: 'rug_peach',
    category: 'rugs',
    name: 'Thảm Len Tròn Cam Đào',
    icon: '🌸',
    price: 0,
    badge: 'Khởi Đầu',
    description: 'Thảm trải sàn dệt sợi tròn êm dịu màu cam đào ấm áp cho Boss nằm ngủ.',
    color: '#FB923C',
    accentColor: '#FFEDD5',
  },
  {
    id: 'rug_cloud',
    category: 'rugs',
    name: 'Thảm Đám Mây Trắng Xốp',
    icon: '☁️',
    price: 260,
    badge: 'Bồng Bềnh',
    description: 'Thảm hình đám mây mềm như bông cho giấc ngủ trưa ngọt ngào.',
    color: '#38BDF8',
    accentColor: '#E0F2FE',
  },
  {
    id: 'rug_paw',
    category: 'rugs',
    name: 'Thảm Bàn Chân Mèo Lớn',
    icon: '🐾',
    price: 500,
    badge: 'Dễ Thương',
    description: 'Thảm lót sàn hình bàn chân mèo khổng lồ với các đệm thịt hồng hào.',
    color: '#F43F5E',
    accentColor: '#FFE4E6',
  },
];

export function getFashionItemById(id?: string): FashionDecorItem | undefined {
  if (!id) return undefined;
  return FASHION_DECOR_CATALOG.find((item) => item.id === id);
}

export function getItemsByCategory(category: FashionCategory): FashionDecorItem[] {
  return FASHION_DECOR_CATALOG.filter((item) => item.category === category);
}
