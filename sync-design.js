import 'dotenv/config';
import axios from 'axios';
import fs from 'fs-extra';
import { readFileSync } from 'node:fs';
import inquirer from 'inquirer';

const { FIGMA_TOKEN, FIGMA_FILE_ID } = process.env;
const client = axios.create({ headers: { 'X-Figma-Token': FIGMA_TOKEN } });

// Читаем локальные токены из твоего проекта
function getTokensFromScss(fileName) {
  const map = {};
  try {
    const content = readFileSync(`./src/shared/styles/generated/${fileName}`, 'utf-8');
    const regex = /\$([^:]+):\s*([^;]+);/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      map[match[2].trim().replace(/px/g, '')] = match[1].trim();
    }
  } catch (e) { console.warn(`⚠️ Файл ${fileName} не найден.`); }
  return map;
}

const spacingMap = getTokensFromScss('_spacing.scss');
const radiusMap = getTokensFromScss('_radius.scss');

const getVar = (val, map) => {
  if (val === undefined || val === null) return '0px';
  const key = String(Math.round(val));
  return map[key] ? `$${map[key]}` : `${val}px`;
};

async function run() {
  try {
    console.log('--- 🔎 Поиск компонентов в Figma ---');

    // ШАГ 1: Получаем список компонентов (ОЧЕНЬ легкий запрос)
    const { data: meta } = await client.get(`https://api.figma.com/v1/files/${FIGMA_FILE_ID}/components`);
    const components = meta.meta.components;

    if (!components.length) {
      return console.log('❌ Компоненты не найдены. Убедись, что они созданы в Figma (фиолетовый ромб).');
    }

    // ШАГ 2: Интерактивный выбор в консоли
    const { target } = await inquirer.prompt([
      {
        type: 'list',
        name: 'target',
        message: 'Какой компонент синхронизировать?',
        choices: components.map(c => ({ name: c.name, value: c }))
      }
    ]);

    console.log(`⏳ Синхронизирую [${target.name}]...`);

    // ШАГ 3: Запрос данных ТОЛЬКО этого компонента по его node_id
    const { data: nodeData } = await client.get(`https://api.figma.com/v1/files/${FIGMA_FILE_ID}/nodes?ids=${target.node_id}`);
    const comp = nodeData.nodes[target.node_id].document;

    // ГЕНЕРАЦИЯ SCSS
    const componentName = comp.name.replace(/[^a-zA-Z0-9]/g, '');
    const folderPath = `./src/shared/ui/${componentName}`;

    const scssContent = `
@import "../../styles/generated/_spacing.scss";
@import "../../styles/generated/_radius.scss";

.${componentName.toLowerCase()} {
  display: inline-flex;
  box-sizing: border-box;
  padding-top: ${getVar(comp.paddingTop, spacingMap)};
  padding-right: ${getVar(comp.paddingRight, spacingMap)};
  padding-bottom: ${getVar(comp.paddingBottom, spacingMap)};
  padding-left: ${getVar(comp.paddingLeft, spacingMap)};
  gap: ${getVar(comp.itemSpacing, spacingMap)};
  border-radius: ${getVar(comp.cornerRadius, radiusMap)};
}
`.trim();

    await fs.ensureDir(folderPath);
    await fs.outputFile(`${folderPath}/${componentName}.scss`, scssContent);
    console.log(`✅ Готово! Файл создан: ${folderPath}/${componentName}.scss`);

  } catch (err) {
    if (err.response?.status === 429) {
      console.error('❌ Ошибка 429. Figma всё еще просит подождать. Попробуй через 2-3 минуты.');
    } else {
      console.error('❌ Ошибка:', err.message);
    }
  }
}

run();