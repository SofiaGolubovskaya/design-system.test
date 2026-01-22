import StyleDictionary from 'style-dictionary';

const sd = new StyleDictionary({
  source: ['src/shared/styles/tokens/tokens.json'],
  platforms: {
    scss: {
      // transformGroup 'scss' автоматически включает нужные преобразования
      transformGroup: 'scss',
      buildPath: 'src/shared/styles/generated/',
      files: [
        {
          destination: '_tokens.scss',
          format: 'scss/variables',
          options: {
            outputReferences: true
          }
        },
      ],
    },
  },
});

// Кастомный трансформер, который добавит 'rem' к числам, если их забыли разметить в Figma
StyleDictionary.registerTransform({
  name: 'size/px-to-rem',
  type: 'value',
  matcher: (token) => token.attributes.category === 'size' || token.path.includes('size'),
  transformer: (token) => {
    const val = parseFloat(token.value);
    if (isNaN(val)) return token.value;
    return `${val / 16}rem`; // Базовая логика перевода px в rem
  }
});

await sd.buildAllPlatforms();