import StyleDictionary from 'style-dictionary';

const sd = new StyleDictionary({
  source: ['src/shared/styles/tokens/tokens.json'],
  platforms: {
    scss: {
      transformGroup: 'scss',
      buildPath: 'src/shared/styles/generated/',
      // Добавляем опции для файлов
      files: [
        {
          destination: '_tokens.scss',
          format: 'scss/variables',
          options: {
            // Это заставит Style Dictionary не учитывать названия папок/сетов
            showFileHeader: false 
          }
        },
      ],
    },
  },
});

await sd.buildAllPlatforms();