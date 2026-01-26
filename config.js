import StyleDictionary from 'style-dictionary';
import { readFileSync } from 'node:fs';

// 1. Читаем JSON, чтобы динамически определить категории (color, spacing, radius и т.д.)
const tokens = JSON.parse(readFileSync('./src/shared/styles/tokens/tokens.json', 'utf-8'));
// Достаем ключи верхнего уровня из вашей темы
const categories = Object.keys(tokens['TailwindCSS/Default']);

const sd = new StyleDictionary({
  source: ['src/shared/styles/tokens/tokens.json'],
  hooks: {
    transforms: {
      // Трансформер для коротких имен без ошибок синтаксиса Sass
      'name/shorten': {
        type: 'name',
        transform: (token) => {
          // slice(2) убирает "TailwindCSS/Default" и категорию (напр. "spacing")
          const path = token.path.slice(2);
          const name = path.join('-');

          // Исправляем ошибку: имя переменной в Sass не может начинаться с цифры.
          // Если имя начинается с числа (напр. "1"), превращаем в "s-1".
          return /^\d/.test(name) ? `s-${name}` : name;
        }
      },
      // Трансформер для пересчета rem в px
      'size/rem-to-px': {
        type: 'value',
        filter: (token) => token.$type === 'dimension',
        transform: (token) => {
          const baseFontSize = 16;
          const val = token.$value;

          if (typeof val === 'string' && val.endsWith('rem')) {
            return `${parseFloat(val) * baseFontSize}px`;
          }
          return val; // Если уже px или просто число — оставляем как есть
        }
      }
    }
  },
  platforms: {
    scss: {
      // Применяем стандартные трансформеры и наши кастомные
      transforms: ['attribute/cti', 'name/shorten', 'size/rem-to-px', 'color/css'],
      buildPath: 'src/shared/styles/generated/',
      // Динамически создаем файлы на основе категорий из JSON
      files: categories.map((cat) => ({
        destination: `_${cat}.scss`,
        format: 'scss/variables',
        // В каждый файл попадают только токены соответствующей категории
        filter: (token) => token.path[1] === cat,
        options: {
          showFileHeader: false
        }
      })),
    },
  },
});

await sd.buildAllPlatforms();

console.log('\n🚀 Сборка завершена! Проверь папку src/shared/styles/generated/');