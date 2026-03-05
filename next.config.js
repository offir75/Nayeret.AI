/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        'thermophosphorescent-calamitoid-yadira.ngrok-free.dev',
        '*.ngrok-free.dev',
        '*.ngrok-free.app',
        'localhost:3000'
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