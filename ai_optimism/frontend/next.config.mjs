/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@mui/material', 
    '@mui/icons-material', 
    '@emotion/react', 
    '@emotion/styled',
    'recharts'
  ],
};

export default nextConfig;
