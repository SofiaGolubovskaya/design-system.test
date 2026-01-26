import 'dotenv/config';
import axios from 'axios';
import fs from 'fs-extra';

const { FIGMA_TOKEN, FIGMA_FILE_ID } = process.env;
const client = axios.create({ headers: { 'X-Figma-Token': FIGMA_TOKEN } });

async function run() {
  try {
    console.log('--- 🔍 Начинаем поиск компонентов в Figma ---');
    
    // 1. Получаем список всех компонентов в файле
    const { data } = await client.get(`https://api.figma.com/v1/files/${FIGMA_FILE_ID}/components`);
    const components = data.meta.components;

    if (!components || components.length === 0) {
      console.log('❌ В файле не найдено ни одного компонента.');
      console.log('Подсказка: Убедись, что твоя кнопка — это Main Component (фиолетовый ромбик в Figma).');
      return;
    }

    console.log(`✅ Найдено компонентов: ${components.length}`);
    
    // Вывод списка всех компонентов
    components.forEach((c, i) => {
      console.log(`${i + 1}. [${c.name}] | ID: ${c.node_id}`);
    });

    // 2. Ищем компонент, в имени которого есть "Button"
    const button = components.find(c => c.name.toLowerCase().includes('button'));

    if (button) {
      console.log(`\n🚀 Нашли кнопку: "${button.name}". Загружаем детали...`);
      
      const nodeResponse = await client.get(`https://api.figma.com/v1/files/${FIGMA_FILE_ID}/nodes?ids=${button.node_id}`);
      const node = nodeResponse.data.nodes[button.node_id].document;

      // Генерируем простейшие стили
      const scss = `
// Сгенерировано автоматически из Figma (${button.name})
.button {
  padding: ${node.paddingTop || 0}px ${node.paddingRight || 0}px ${node.paddingBottom || 0}px ${node.paddingLeft || 0}px;
  border-radius: ${node.cornerRadius || 0}px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
}
`;
      
      const path = './src/shared/ui/Button';
      await fs.ensureDir(path);
      await fs.outputFile(`${path}/Button.scss`, scss);
      
      console.log(`\n🎉 Успех! Файл стилей создан: ${path}/Button.scss`);
    } else {
      console.log('\n⚠️ Компонент со словом "Button" не обнаружен.');
    }

  } catch (err) {
    console.error('\n❌ Ошибка:');
    if (err.response) {
      console.error(`Статус: ${err.response.status}`);
      console.error(`Данные: ${JSON.stringify(err.response.data)}`);
    } else {
      console.error(err.message);
    }
  }
}

run();