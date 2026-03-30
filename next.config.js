/** @type {import('next').NextConfig} */
const extraOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  : [];

const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '*.ngrok-free.dev',
        '*.ngrok-free.app',
        ...extraOrigins,
      ],
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // נחוץ עבור pdfjs-dist
      config.externals = [...(config.externals || []), 'canvas'];
    }
    return config;
  },
};

module.exports = nextConfig;