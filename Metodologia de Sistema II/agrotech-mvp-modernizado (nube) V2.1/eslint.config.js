// ESLint (flat config) para todo AgroTech: backend (Node, CommonJS) y frontend (scripts del navegador).
// El formato lo resuelve Prettier; eslint-config-prettier apaga las reglas de estilo que chocarían con él.
const js = require('@eslint/js');
const globals = require('globals');
const prettier = require('eslint-config-prettier');

module.exports = [
  { ignores: ['**/node_modules/**', 'server/coverage/**'] },

  js.configs.recommended,

  // Backend: Node + CommonJS.
  {
    files: ['server/**/*.js', 'eslint.config.js'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } }
  },
  {
    files: ['server/tests/**/*.js'],
    languageOptions: { globals: { ...globals.jest } }
  },

  // Frontend: scripts clásicos del navegador (sin módulos todavía; eso llega con Vite).
  // Cada archivo deja un objeto global (AgroAPI en api.js, AgroIcons en icons.js) que usan shared.js y
  // los HTML; los que lo exponen lo marcan con /* exported */ y acá se declara para los que lo usan.
  {
    files: ['*.js'],
    ignores: ['eslint.config.js', 'sw.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser } }
  },
  {
    files: ['shared.js'],
    languageOptions: { globals: { AgroAPI: 'readonly', AgroIcons: 'readonly' } }
  },
  {
    files: ['sw.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.serviceworker } }
  },

  {
    rules: {
      // `_` al principio marca a propósito un parámetro que no se usa (ej. el `next` de Express).
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }]
    }
  },

  prettier
];
