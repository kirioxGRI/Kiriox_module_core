import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },

  async redirects() {
    return [
      {
        source: "/academy",
        destination: "https://siviedeif.com/academy/",
        permanent: true,
      },
      {
        source: "/academy/:path*",
        destination: "https://siviedeif.com/academy/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;