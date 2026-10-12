export interface CatSkin {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  image?: string;
  imageOpen?: string;
  unlockCost: number; // Fish required to unlock (0 = starting default)
  description: string;
  perk: string;
  clickBonusMultiplier: number; // e.g. 1.05 = +5%
  autoBonusMultiplier: number;
  comboBonusMultiplier: number;
  palette: {
    fur: string;
    furDark: string;
    furLight: string;
    stripes: string;
    belly: string;
    ears: string;
    eyes: string;
    nose: string;
    cheeks: string;
    accessory?: 'none' | 'bell' | 'bow' | 'crown' | 'scarf' | 'glasses';
    accessoryColor?: string;
  };
}

// Dynamic cat loader from public/images/cat_webp
const globCats1 = import.meta.glob('/public/images/cat_webp/*.{webp,png,jpg,jpeg,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const globCats2 = import.meta.glob('../../public/images/cat_webp/*.{webp,png,jpg,jpeg,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
});

interface ScannedCatFile {
  filename: string;
  publicUrl: string;
}

const scannedFiles: ScannedCatFile[] = [];

function processCatGlob(globObj: Record<string, unknown>) {
  for (const [key, val] of Object.entries(globObj)) {
    let url = typeof val === 'string' ? val : '';
    if (!url) {
      const mod = val as { default?: string };
      url = mod?.default || '';
    }
    const filename = key.split('/').pop() || '';
    if (filename) {
      const publicUrl = `/images/cat_webp/${filename}`;
      if (!scannedFiles.some((f) => f.filename === filename)) {
        scannedFiles.push({
          filename,
          publicUrl: url || publicUrl,
        });
      }
    }
  }
}

processCatGlob(globCats1 as Record<string, unknown>);
processCatGlob(globCats2 as Record<string, unknown>);

// Cute skin name presets
const PRESET_SKIN_METAS = [
  {
    name: 'Mèo Cam Vui Vẻ',
    subtitle: 'Mèo cưng khởi đầu',
    icon: '🐱',
    desc: 'Chú mèo mướp cam siêu nhanh nhẹn, khoái khẩu nhất là cá hồi tươi rói.',
    perk: 'Trạng thái cơ bản',
    clickMult: 1.0,
    autoMult: 1.0,
    comboMult: 1.0,
    cost: 0,
    palette: {
      fur: '#FFA64D',
      furDark: '#E68222',
      furLight: '#FFBE7A',
      stripes: '#BD580B',
      belly: '#FFF1DF',
      ears: '#FF94B8',
      eyes: '#3B2314',
      nose: '#E06B7F',
      cheeks: '#FF88A5',
    },
  },
  {
    name: 'Mèo Kem Tai Cụp',
    subtitle: 'Scottish Fold mập mạp',
    icon: '🐾',
    desc: 'Đôi tai cụp tròn xoe như viên kẹo bông gòn, bắt cá siêu ngoan ngoãn.',
    perk: '+10% Tốc độ Auto-fish',
    clickMult: 1.0,
    autoMult: 1.1,
    comboMult: 1.0,
    cost: 150,
    palette: {
      fur: '#F7DFBE',
      furDark: '#E2C39B',
      furLight: '#FFF6EB',
      stripes: '#C8A27A',
      belly: '#FFFDF9',
      ears: '#F4A2B6',
      eyes: '#5C381E',
      nose: '#E07287',
      cheeks: '#FFA0B8',
    },
  },
  {
    name: 'Mèo Bicolor Nhị Thể',
    subtitle: 'Trắng xám tinh anh',
    icon: '🤍',
    desc: 'Áo khoác trắng xám lịch thiệp, luôn tập trung cao độ mỗi khi vồ cá.',
    perk: '+15% Điểm cá khi Click',
    clickMult: 1.15,
    autoMult: 1.0,
    comboMult: 1.05,
    cost: 500,
    palette: {
      fur: '#8395A7',
      furDark: '#576574',
      furLight: '#C8D6E5',
      stripes: '#576574',
      belly: '#FFFFFF',
      ears: '#FF9FF3',
      eyes: '#222F3E',
      nose: '#EE5253',
      cheeks: '#FFB8C6',
    },
  },
  {
    name: 'Mèo Xám Hoàng Gia Anh',
    subtitle: 'British Shorthair điềm tĩnh',
    icon: '🩶',
    desc: 'Má phúng phính quý tộc, mỗi cú vồ cá đều vô cùng chuẩn xác.',
    perk: '+20% Click & +15% Auto-fish',
    clickMult: 1.2,
    autoMult: 1.15,
    comboMult: 1.1,
    cost: 1200,
    palette: {
      fur: '#7F8FA6',
      furDark: '#718093',
      furLight: '#A4B0BE',
      stripes: '#485460',
      belly: '#CED6E0',
      ears: '#FF94B8',
      eyes: '#E58E26',
      nose: '#57606F',
      cheeks: '#FF9CAE',
    },
  },
  {
    name: 'Mèo Mướp Rừng',
    subtitle: 'Thợ săn thiện nghệ',
    icon: '🌾',
    desc: 'Rèn luyện phản xạ vồ mồi từ hoang dã, tích combo cực nhanh và mạnh mẽ.',
    perk: '+30% Thưởng Combo liên hoàn',
    clickMult: 1.25,
    autoMult: 1.2,
    comboMult: 1.3,
    cost: 3000,
    palette: {
      fur: '#A0704F',
      furDark: '#7B4E2E',
      furLight: '#D2AC8B',
      stripes: '#4E2C12',
      belly: '#FCEFD8',
      ears: '#EE889C',
      eyes: '#2ECC71',
      nose: '#D35400',
      cheeks: '#F39C12',
    },
  },
  {
    name: 'Mèo Tuxedo Quý Phái',
    subtitle: 'Quý ông lịch lãm',
    icon: '🖤',
    desc: 'Khoác bộ vest đen phối ngực trắng bảnh bao, bắt cá điệu nghệ như biểu diễn.',
    perk: '+35% Toàn bộ sản lượng cá',
    clickMult: 1.35,
    autoMult: 1.35,
    comboMult: 1.25,
    cost: 7500,
    palette: {
      fur: '#2C3E50',
      furDark: '#1E272E',
      furLight: '#485460',
      stripes: '#1E272E',
      belly: '#FFFFFF',
      ears: '#F368E0',
      eyes: '#F1C40F',
      nose: '#E74C3C',
      cheeks: '#FF94B8',
    },
  },
  {
    name: 'Mèo Ragdoll Tuyết',
    subtitle: 'Nữ hoàng lông xù',
    icon: '🌸',
    desc: 'Lông tơ mềm mại như mây trắng tuyết, mắt xanh thẳm như đại dương ngập cá.',
    perk: '+50% Click Power & Vàng x2',
    clickMult: 1.5,
    autoMult: 1.4,
    comboMult: 1.4,
    cost: 15000,
    palette: {
      fur: '#F5F6FA',
      furDark: '#718093',
      furLight: '#FFFFFF',
      stripes: '#474787',
      belly: '#FFFFFF',
      ears: '#2C2C54',
      eyes: '#3498DB',
      nose: '#FF7675',
      cheeks: '#FDA7DF',
    },
  },
  {
    name: 'Mèo Hoàng Gia Ngai Vàng',
    subtitle: 'Vua của muôn loài mèo',
    icon: '👑',
    desc: 'Mang vương miện đính ngọc quý, chỉ cần một cái vẫy đuôi là ngập tràn cá!',
    perk: '+100% Toàn bộ sản lượng (+2x Mọi thứ)',
    clickMult: 2.0,
    autoMult: 2.0,
    comboMult: 2.0,
    cost: 30000,
    palette: {
      fur: '#F1C40F',
      furDark: '#D4AC0D',
      furLight: '#FEF9E7',
      stripes: '#B7950B',
      belly: '#FFFDF0',
      ears: '#F39C12',
      eyes: '#8E44AD',
      nose: '#E74C3C',
      cheeks: '#E67E22',
    },
  },
  {
    name: 'Mèo Tam Thể Bình An',
    subtitle: 'May mắn & Phúc lộc',
    icon: '🍀',
    desc: 'Bộ lông 3 màu tài lộc, mang đến vô số đàn cá hiếm cho người nuôi.',
    perk: '+60% Toàn bộ sản lượng cá',
    clickMult: 1.6,
    autoMult: 1.6,
    comboMult: 1.5,
    cost: 45000,
    palette: {
      fur: '#F39C12',
      furDark: '#D35400',
      furLight: '#FDEBD0',
      stripes: '#2C3E50',
      belly: '#FFFFFF',
      ears: '#E74C3C',
      eyes: '#27AE60',
      nose: '#E06B7F',
      cheeks: '#F39C12',
    },
  },
  {
    name: 'Mèo Mun Thần Tài',
    subtitle: 'Huyền bí bóng đêm',
    icon: '✨',
    desc: 'Thợ săn huyền bí trong màn đêm tĩnh mịch, bắt trọn từng chú cá vàng.',
    perk: '+80% Sản lượng Click & Frenzy',
    clickMult: 1.8,
    autoMult: 1.7,
    comboMult: 1.8,
    cost: 70000,
    palette: {
      fur: '#1E272E',
      furDark: '#000000',
      furLight: '#485460',
      stripes: '#000000',
      belly: '#2F3640',
      ears: '#9B59B6',
      eyes: '#F1C40F',
      nose: '#E74C3C',
      cheeks: '#8E44AD',
    },
  },
];

// Group files by base name to check for open/close mouth pairs
function buildSkinsList(): CatSkin[] {
  if (scannedFiles.length === 0) {
    // Fallback if directory was empty or still loading
    return PRESET_SKIN_METAS.slice(0, 8).map((meta, idx) => ({
      id: `skin_${idx + 1}`,
      name: meta.name,
      subtitle: meta.subtitle,
      icon: meta.icon,
      image: '/images/cat_open_mouth.jpg',
      unlockCost: meta.cost,
      description: meta.desc,
      perk: meta.perk,
      clickBonusMultiplier: meta.clickMult,
      autoBonusMultiplier: meta.autoMult,
      comboBonusMultiplier: meta.comboMult,
      palette: meta.palette,
    }));
  }

  // Separate files into base and open-mouth variations if any
  const baseMap = new Map<string, { base?: string; open?: string; originalName: string }>();

  scannedFiles.forEach((file) => {
    const rawName = file.filename.replace(/\.[^/.]+$/, '');
    const isOpen = rawName.includes('_open') || rawName.includes('_mouth') || rawName.includes('_pop');
    const isClose = rawName.includes('_close') || rawName.includes('_closed') || rawName.includes('_normal');

    const cleanKey = rawName
      .replace(/(_open|_mouth|_pop|_close|_closed|_normal)/g, '')
      .toLowerCase();

    if (!baseMap.has(cleanKey)) {
      baseMap.set(cleanKey, { originalName: rawName });
    }

    const entry = baseMap.get(cleanKey)!;
    if (isOpen) {
      entry.open = file.publicUrl;
    } else if (isClose) {
      entry.base = file.publicUrl;
    } else {
      if (!entry.base) {
        entry.base = file.publicUrl;
      }
    }
  });

  const skins: CatSkin[] = [];
  let index = 0;

  baseMap.forEach((entry, key) => {
    const preset = PRESET_SKIN_METAS[index % PRESET_SKIN_METAS.length];
    const cleanName = key
      .replace(/[_-]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim();

    // Friendly display name
    let displayName = preset.name;
    if (cleanName && isNaN(Number(cleanName))) {
      const formatted = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      displayName = formatted.toLowerCase().startsWith('mèo') || formatted.toLowerCase().startsWith('cat')
        ? formatted.replace(/cat/i, 'Mèo')
        : `Mèo ${formatted}`;
    }

    const unlockCost = index === 0 ? 0 : preset.cost > 0 ? preset.cost : index * 800;

    skins.push({
      id: `cat_${key || index + 1}`,
      name: displayName,
      subtitle: preset.subtitle,
      icon: preset.icon,
      image: entry.base || entry.open,
      imageOpen: entry.open || entry.base,
      unlockCost,
      description: preset.desc,
      perk: preset.perk,
      clickBonusMultiplier: preset.clickMult,
      autoBonusMultiplier: preset.autoMult,
      comboBonusMultiplier: preset.comboMult,
      palette: preset.palette,
    });

    index++;
  });

  return skins;
}

export const SKINS: CatSkin[] = buildSkinsList();
