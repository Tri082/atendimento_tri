import type { MetadataRoute } from "next";
import { appConfig } from "@/config/app.config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appConfig.name,
    short_name: "Elite da IA",
    description: appConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "pt-BR",
    orientation: "portrait",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
