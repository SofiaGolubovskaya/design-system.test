import StyleDictionary from 'style-dictionary';

// 1. Регистрируем кастомный трансформер для имен
StyleDictionary.registerTransform({
  name: 'name/shorten',
  type: 'name',
  transformer: (token) => {
    // token.path — это массив ключей: ["TokenTest", "Mode 1", "base", "size"]
    // .slice(2) удаляет первые два элемента ("TokenTest" и "Mode 1")
    // .join('-') склеивает остальное: "base-size"
    return token.path.slice(2).join('-');
  }
});

const sd = new StyleDictionary({
  source: ['src/shared/styles/tokens/tokens.json'],
  platforms: {
    scss: {
      // Используем наш новый трансформер 'name/shorten' вместе со стандартными
      transforms: ['attribute/cti', 'name/shorten', 'size/rem', 'color/css'],
      buildPath: 'src/shared/styles/generated/',
      files: [
        {
          destination: '_tokens.scss',
          format: 'scss/variables',
          options: {
            outputReferences: true,
            showFileHeader: false
          }
        },
      ],
    },
  },
});

await sd.buildAllPlatforms();