import 'dotenv/config';
import axios from 'axios';
import fs from 'fs-extra';
import { readFileSync } from 'node:fs';

const { FIGMA_TOKEN, FIGMA_FILE_ID } = process.env;
const client = axios.create({ headers: { 'X-Figma-Token': FIGMA_TOKEN } });

/**
 * 1. Функция для парсинга твоих сгенерированных SCSS файлов.
 */
function getTokensFromScss(fileName) {
  const map = {};
  try {
    const filePath = `./src/shared/styles/generated/${fileName}`;
    const content = readFileSync(filePath, 'utf-8');
    
    // Ищет переменные типа $s-4: 16px;
    const regex = /\$([^:]+):\s*([^;]+);/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const name = match[1].trim();
      let value = match[2].trim().replace(/px/g, ''); 
      map[value] = name; 
    }
  } catch (e) {
    console.warn(`⚠️ Файл ${fileName} не найден.`);
  }
  return map;
}

const spacingMap = getTokensFromScss('_spacing.scss');
const radiusMap = getTokensFromScss('_radius.scss');

/**
 * 2. Хелпер для поиска переменной. 
 */
const getVar = (val, map) => {
  if (val === undefined || val === null) return '0px';
  const key = String(val);
  if (map[key]) {
    return `$${map[key]}`; 
  }
  return `${val}px`; 
};

/**
 * 3. Рекурсивный поиск всех компонентов
 */
function findAllComponents(node, components = []) {
  if (node.type === 'COMPONENT') {
    components.push(node);
  }
  if (node.children) {
    node.children.forEach(child => findAllComponents(child, components));
  }
  return components;
}

async function run() {
  try {
    console.log('--- 🚀 Начинаем полную синхронизацию компонентов ---');
    
    const { data } = await client.get(`https://api.figma.com/v1/files/${FIGMA_FILE_ID}`);
    const components = findAllComponents(data.document);

    if (components.length === 0) {
      console.log('❌ Компоненты не найдены.');
      return;
    }

    for (const comp of components) {
      // Очищаем имя компонента для названия папки и класса
      const componentName = comp.name.replace(/[^a-zA-Z0-9]/g, '');
      const folderPath = `./src/shared/ui/${componentName}`;

      console.log(`📦 Обработка: ${componentName}...`);

      const scssContent = `
// Автоматически сгенерированные стили для ${comp.name}
@import "../../styles/generated/_spacing.scss";
@import "../../styles/generated/_radius.scss";

.${componentName.toLowerCase()} {
  display: inline-flex;
  box-sizing: border-box;
  
  /* Отступы (заменили button на comp) */
  padding-top: ${getVar(comp.paddingTop, spacingMap)};
  padding-right: ${getVar(comp.paddingRight, spacingMap)};
  padding-bottom: ${getVar(comp.paddingBottom, spacingMap)};
  padding-left: ${getVar(comp.paddingLeft, spacingMap)};
  
  /* Расстояние между элементами */
  gap: ${getVar(comp.itemSpacing, spacingMap)};

  /* Скругления */
  border-radius: ${getVar(comp.cornerRadius, radiusMap)};
}
`.trim();

      await fs.ensureDir(folderPath);
      await fs.outputFile(`${folderPath}/${componentName}.scss`, scssContent);
    }

    console.log(`\n✅ Успешно! Синхронизировано компонентов: ${components.length}`);
    
  } catch (err) {
    console.error('❌ Ошибка выполнения:', err.message);
  }
}

run();