import StyleDictionary from 'style-dictionary';

const sd = new StyleDictionary({
  source: ['src/shared/styles/tokens/tokens.json'],
  platforms: {
    scss: {
      // transformGroup 'scss' по умолчанию делает длинные имена. 
      // Мы можем это переопределить через индивидуальные трансформы.
      transforms: ['attribute/cti', 'name/cti/kebab', 'size/rem', 'color/css'],
      buildPath: 'src/shared/styles/generated/',
      files: [
        {
          destination: '_tokens.scss',
          format: 'scss/variables',
          options: {
            // Эта опция часто помогает убрать лишние уровни, если структура плоская
            outputReferences: true 
          }
        },
      ],
    },
  },
});

await sd.buildAllPlatforms();