/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Supabase Storage 的域名，允许 next/image 加载
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  // 关掉开发模式左下角的 Next.js 浮标。
  // 它只在 npm run dev 时出现（生产环境本来就没有），
  // 但开发时挡住页面内容，而且全是英文。
  devIndicators: false,
};

export default nextConfig;
