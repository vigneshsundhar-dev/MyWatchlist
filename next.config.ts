import type { NextConfig } from "next";

const deployAssetPrefix = process.env.NEXT_PUBLIC_DEPLOY_ASSET_PREFIX || undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  assetPrefix: deployAssetPrefix
};

export default nextConfig;
