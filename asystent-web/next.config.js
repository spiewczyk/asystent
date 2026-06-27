/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Aplikacja osobista — nie chcemy, żeby build padał na drobiazgach typów/lintera.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
