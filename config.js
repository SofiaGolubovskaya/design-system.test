import StyleDictionary from 'style-dictionary';

const sd = new StyleDictionary({
  source: ['src/shared/styles/tokens/tokens.json'],
  platforms: {
    scss: {
      // transformGroup: 'scss' — это «золотой стандарт».
      // Он автоматически превращает имена в kebab-case и обрабатывает размеры.
      transformGroup: 'scss',
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