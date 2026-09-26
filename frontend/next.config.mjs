/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.STANDALONE === "true" ? { output: "standalone" } : {}),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
