/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Default is 1 MB, which rejects most resumes/attachments before
      // our own 10 MB check can run.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
