import 'dotenv/config';
import axios from 'axios';
import fs from 'fs-extra';
import { readFileSync } from 'node:fs';

const { FIGMA_TOKEN, FIGMA_FILE_ID } = process.env;
const client = axios.create({ headers: { 'X-Figma-Token': FIGMA_TOKEN } });

// Пауза между операциями (если нужно)
const delay = (ms) => new Promise(res => setTimeout(res, ms));

function getTokensFromScss(fileName) {
  const map = {};
  try {
    const filePath = `./src/shared/styles/generated/${fileName}`;
    const content = readFileSync(filePath, 'utf-8');
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

const getVar = (val, map) => {
  if (val === undefined || val === null) return '0px';
  const key = String(Math.round(val)); // Округляем, так как в Figma могут быть дробные пиксели
  return map[key] ? `$${map[key]}` : `${val}px`; 
};

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
    console.log('--- 🚀 Синхронизация компонентов ---');
    
    const { data } = await client.get(`https://api.figma.com/v1/files/${FIGMA_FILE_ID}`);
    const allComponents = findAllComponents(data.document);

    let syncedCount = 0;

    for (const comp of allComponents) {
      // Проверка: есть ли у компонента хоть какие-то стили для экспорта
      const hasStyles = comp.paddingTop !== undefined || comp.itemSpacing !== undefined || comp.cornerRadius !== undefined;
      
      if (!hasStyles) {
        continue; // Просто пропускаем без вывода в консоль, чтобы не спамить
      }

      const componentName = comp.name.replace(/[^a-zA-Z0-9]/g, '');
      const folderPath = `./src/shared/ui/${componentName}`;

      const scssContent = `
// Сгенерировано автоматически для ${comp.name}
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
      console.log(`✅ [${componentName}] синхронизирован`);
      syncedCount++;
    }

    console.log(`\n🎉 Готово! Обработано компонентов: ${syncedCount}`);
    
  } catch (err) {
    if (err.response?.status === 429) {
      console.error('❌ Ошибка 429: Слишком много запросов. Подожди минуту и попробуй снова.');
    } else {
      console.error('❌ Ошибка:', err.message);
    }
  }
}

run();