/**
 * 用户本地偏好设置。
 *
 * 全部存在浏览器的 localStorage 里——没有后端、不发请求。
 * 好处：立刻生效、刷新不丢、零延迟。
 * 代价：换浏览器/换设备/清缓存就没了，别人也看不到你的头像和简介。
 *
 * 以后要让它跨设备，就得把头像传到 Supabase Storage、
 * 把昵称和简介存进 profiles 表。
 */

const PREFIX = 'org_v1_';

export const PREF_KEYS = {
  avatar: 'avatar',
  nickname: 'nickname',
  bio: 'bio',
  accent: 'accent',
};

function keyOf(name) {
  return PREFIX + name;
}

export function readPref(name, fallback = '') {
  if (typeof window === 'undefined') return fallback;

  try {
    const value = window.localStorage.getItem(keyOf(name));
    return value === null ? fallback : value;
  } catch {
    // 隐私模式下 localStorage 可能直接抛错
    return fallback;
  }
}

export function writePref(name, value) {
  if (typeof window === 'undefined') return false;

  try {
    window.localStorage.setItem(keyOf(name), value);
    return true;
  } catch (error) {
    // 超出配额最常见（5MB 上限），把错误抛给调用方去提示
    throw error;
  }
}

export function clearPref(name) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(keyOf(name));
  } catch {
    // 忽略
  }
}

/**
 * 把选中的图片压缩成正方形小图，再转成 base64 字符串。
 *
 * 为什么必须压缩：手机照片动辄 3MB，转成 base64 还要再胖 33%，
 * 直接塞进 localStorage 会瞬间撑爆 5MB 配额。
 * 压到 256×256 的 JPEG，通常只有 20~40KB。
 */
export function fileToCompressedDataUrl(file, size = 256) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('请选择图片文件'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // 正方形裁切：取短边，居中
      const side = Math.min(image.width, image.height);
      const offsetX = (image.width - side) / 2;
      const offsetY = (image.height - side) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;

      const context = canvas.getContext('2d');
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, offsetX, offsetY, side, side, 0, 0, size, size);

      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('这张图片读不出来'));
    };

    image.src = objectUrl;
  });
}
