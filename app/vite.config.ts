import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, fs: { allow: [".."] } }, // tokens viven en ../replica/design
  test: { environment: "node" },
});
