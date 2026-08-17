const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // --- HANYA UNTUK COBA-COBA LOKAL (branch `coba-lokal`) ---
  // Arahkan @vercel/postgres ke PGlite supaya aplikasi bisa dijalankan tanpa
  // kredensial database. Jangan di-merge ke main.
  experimental: {
    serverComponentsExternalPackages: ["@electric-sql/pglite"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias["@vercel/postgres"] = path.join(
        __dirname,
        "lib/pglite-vercel-shim.js"
      );
    }
    return config;
  },
};

module.exports = nextConfig;
