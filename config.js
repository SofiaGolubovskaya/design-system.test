import StyleDictionary from 'style-dictionary';

const sd = new StyleDictionary({
  source: ['src/shared/styles/tokens/tokens.json'],
  platforms: {
    scss: {
      // Мы используем стандартную группу scss, но добавим фильтрацию имен
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