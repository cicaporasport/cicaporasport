/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // output: 'export',     // ← COMMENT DULU (ini penyebab utama error)
  
  images: {
    unoptimized: true,
  },
};

export default nextConfig;