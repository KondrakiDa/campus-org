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
};

export default nextConfig;
