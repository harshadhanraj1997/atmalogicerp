/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true, // ✅ Skip TypeScript errors
  },
  eslint: {
    ignoreDuringBuilds: true, // ✅ Skip ESLint during build
  },

  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

export default config;
