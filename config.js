import StyleDictionary from 'style-dictionary';

const sd = new StyleDictionary({
  source: ['src/shared/styles/tokens/tokens.json'],
  // Hooks — это новый способ регистрации трансформаций в v5
  hooks: {
    transforms: {
      'name/shorten': {
        type: 'name',
        transform: (token) => {
          // token.path — это массив ["token-test", "mode-1", "base", "size"]
          // slice(2) отрезает первые два элемента ("token-test" и "mode-1")
          // join('-') склеивает остальное в "base-size"
          return token.path.slice(2).join('-');
        }
      }
    }
  },
  platforms: {
    scss: {
      // Добавляем нашу новую трансформацию 'name/shorten' в список
      transforms: ['attribute/cti', 'name/shorten', 'size/rem', 'color/css'],
      buildPath: 'src/shared/styles/generated/',
      files: [
        {
          destination: '_tokens.scss',
          format: 'scss/variables',
          options: {
            showFileHeader: false
          }
        },
      ],
    },
  },
});

await sd.buildAllPlatforms();