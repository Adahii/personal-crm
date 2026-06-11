// Next.js serves this at /manifest.webmanifest and links it automatically.
export default function manifest() {
  return {
    name: "Soyo88",
    short_name: "Soyo88",
    description:
      "Meet someone. Scan. You're in each other's contacts — exactly what you each chose to share.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fbf8f7",
    theme_color: "#fbf8f7",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
