/** @type {import('next').NextConfig} */
const nextConfig = {
  // 核心开关：把整个站点编译成纯静态文件（HTML + JS + CSS），
  // 产物在 out/ 目录。没有 Node 服务器也能跑，这是能打包成 APK 的前提。
  output: 'export',

  // 静态导出时没有服务器做图片优化，必须关掉 next/image 的优化器
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  // 每个页面导出成 目录/index.html 的形式。
  // APK 里的 WebView 和 GitHub Pages 都更喜欢这种结构。
  trailingSlash: true,

  // 关掉开发模式左下角的 Next.js 浮标
  devIndicators: false,
};

export default nextConfig;
