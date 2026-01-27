import 'dotenv/config';
import axios from 'axios';
import fs from 'fs-extra';
import { readFileSync } from 'node:fs';
import inquirer from 'inquirer';

// Инициализация переменных окружения и API клиента
const { FIGMA_TOKEN, FIGMA_FILE_ID } = process.env;
const client = axios.create({ 
  headers: { 'X-Figma-Token': FIGMA_TOKEN } 
});

/**
 * Читает сгенерированные SCSS файлы и создает карту { значение: имя_переменной }
 * Это необходимо для "ручного маппинга" на бесплатном тарифе Figma.
 */
function getTokensFromScss(fileName) {
  const map = {};
  try {
    const content = readFileSync(`./src/shared/styles/generated/${fileName}`, 'utf-8');
    const regex = /\$([^:]+):\s*([^;]+);/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      // Убираем 'px' из значения для точного числового сравнения
      map[match[2].trim().replace(/px/g, '')] = match[1].trim();
    }
  } catch (e) { 
    console.warn(`⚠️ Файл токенов ${fileName} не найден. Проверьте генерацию в config.js.`); 
  }
  return map;
}

// Загружаем карты токенов для отступов и скруглений
const spacingMap = getTokensFromScss('_spacing.scss');
const radiusMap = getTokensFromScss('_radius.scss');

/**
 * Пытается найти подходящую переменную для числового значения.
 * Если совпадение не найдено, возвращает чистое значение в px.
 */
const getVar = (val, map) => {
  if (val === undefined || val === null) return '0px';
  const key = String(Math.round(val));
  return map[key] ? `$${map[key]}` : `${val}px`;
};

/**
 * Рекурсивная функция для поиска компонентов в дереве слоев.
 * Позволяет находить локальные компоненты без их публикации в библиотеку.
 */
const findComponentsInTree = (node, found = []) => {
  if (node.type === 'COMPONENT') {
    found.push({ name: node.name, id: node.id });
  }
  if (node.children) {
    node.children.forEach(child => findComponentsInTree(child, found));
  }
  return found;
};

async function run() {
  try {
    console.log('--- 🔎 Поиск локальных компонентов в Figma ---');

    // ШАГ 1: Получаем структуру всего файла (надежнее для бесплатного тарифа)
    const { data: fileData } = await client.get(`https://api.figma.com/v1/files/${FIGMA_FILE_ID}`);
    const components = findComponentsInTree(fileData.document);

    if (!components.length) {
      return console.log('❌ Компоненты не найдены. Убедись, что объект в Figma — это Main Component (фиолетовый ромб).');
    }

    // ШАГ 2: Интерактивный выбор компонента в консоли
    const { target } = await inquirer.prompt([
      {
        type: 'list',
        name: 'target',
        message: 'Какой компонент синхронизировать?',
        choices: components.map(c => ({ name: c.name, value: c }))
      }
    ]);

    console.log(`⏳ Извлекаю данные для [${target.name}]...`);

    // ШАГ 3: Запрос детальных данных (nodes) конкретного компонента
    const { data: nodeData } = await client.get(`https://api.figma.com/v1/files/${FIGMA_FILE_ID}/nodes?ids=${target.id}`);
    const comp = nodeData.nodes[target.id].document;

    // ШАГ 4: Подготовка путей и генерация контента
    const componentName = comp.name.replace(/[^a-zA-Z0-9]/g, '');
    const folderPath = `./src/shared/ui/${componentName}`;

    const scssContent = `
@import "../../styles/generated/_spacing.scss";
@import "../../styles/generated/_radius.scss";

.${componentName.toLowerCase()} {
  display: inline-flex;
  box-sizing: border-box;
  
  // Отступы (Paddings) с маппингом на токены
  padding-top: ${getVar(comp.paddingTop, spacingMap)};
  padding-right: ${getVar(comp.paddingRight, spacingMap)};
  padding-bottom: ${getVar(comp.paddingBottom, spacingMap)};
  padding-left: ${getVar(comp.paddingLeft, spacingMap)};
  
  // Расстояние между элементами (Auto Layout Gap)
  gap: ${getVar(comp.itemSpacing, spacingMap)};
  
  // Скругление углов
  border-radius: ${getVar(comp.cornerRadius, radiusMap)};
}
`.trim();

    // ШАГ 5: Запись файла в проект
    await fs.ensureDir(folderPath);
    await fs.outputFile(`${folderPath}/${componentName}.scss`, scssContent);
    
    console.log(`✅ Успешно! Файл стилей создан: ${folderPath}/${componentName}.scss`);

  } catch (err) {
    if (err.response?.status === 429) {
      console.error('❌ Ошибка 429: Слишком много запросов. Figma просит подождать 1-2 минуты.');
    } else {
      console.error('❌ Произошла ошибка:', err.message);
    }
  }
}

run();