/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep the PDF renderer out of the bundler — it ships its own dependencies.
  serverExternalPackages: ["@react-pdf/renderer"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
    ],
  },
  eslint: {
    // Lint is run separately; do not block production builds.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
