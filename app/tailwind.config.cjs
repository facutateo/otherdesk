/** Tokens only: el preset sustituye la paleta y el espaciado de Tailwind. */
module.exports = {
  presets: [require("../replica/design/tailwind.preset.cjs")],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
};
