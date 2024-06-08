/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    config.externals.push({ vectordb: 'vectordb' })
    return config;
  }
}

module.exports = nextConfig
