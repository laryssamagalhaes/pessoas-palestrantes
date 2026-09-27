const fs = require('fs');
const path = require('path');

const SPEAKERS_DIR = './speakers';
const CITY_REGEX = /^[a-z0-9áàâãéèêíïóôõöúçñ-]+-[A-Z]{2}$/i;
const MARKDOWN_LINK_REGEX = /^\[([^\]]+)\]\(([^)]+)\)$/;

const errors = [];
const warnings = [];
const speakersRegistry = new Map();

// Cores ANSI para o terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function logError(msg) {
  errors.push(msg);
  console.error(`  ${colors.red}✖${colors.reset} ${msg}`);
}

function logWarning(msg) {
  warnings.push(msg);
  console.warn(`  ${colors.yellow}⚠${colors.reset} ${msg}`);
}

console.log(`\n${colors.bold}${colors.cyan}Iniciando verificação de palestrantes...${colors.reset}\n`);

if (!fs.existsSync(SPEAKERS_DIR)) {
  logError(`Diretório '${SPEAKERS_DIR}' não encontrado.`);
  process.exit(1);
}

const cities = fs.readdirSync(SPEAKERS_DIR).filter(item => {
  const fullPath = path.join(SPEAKERS_DIR, item);
  return fs.statSync(fullPath).isDirectory() && !item.startsWith('.');
});

let totalSpeakers = 0;

for (const city of cities) {
  const cityPath = path.join(SPEAKERS_DIR, city);

  if (!CITY_REGEX.test(city)) {
    logError(`Pasta de cidade '${city}' inválida. Deve seguir o padrão 'nome-da-cidade-UF' (ex: 'belo-horizonte-MG').`);
  }

  const files = fs.readdirSync(cityPath).filter(file => !file.startsWith('.'));

  if (files.length === 0) {
    logWarning(`Pasta '${cityPath}' está vazia.`);
  }

  for (const file of files) {
    const filePath = path.join(cityPath, file);

    if (!file.endsWith('.json')) {
      logError(`Arquivo '${filePath}' não possui extensão .json.`);
      continue;
    }

    let speaker;
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      speaker = JSON.parse(fileContent);
    } catch (e) {
      logError(`Arquivo '${filePath}' contém JSON inválido: ${e.message}`);
      continue;
    }

    totalSpeakers++;

    // Validação do campo 'name'
    if (!speaker.name || typeof speaker.name !== 'string' || speaker.name.trim().length === 0) {
      logError(`'${filePath}': campo 'name' é obrigatório e deve ser uma string não vazia.`);
    } else {
      const normalizedName = speaker.name.trim().toLowerCase();
      if (speakersRegistry.has(normalizedName)) {
        logError(`Palestrante duplicado: "${speaker.name}" encontrado em '${filePath}' e '${speakersRegistry.get(normalizedName)}'.`);
      } else {
        speakersRegistry.set(normalizedName, filePath);
      }
    }

    // Validação do campo 'subjects'
    if (!Array.isArray(speaker.subjects) || speaker.subjects.length === 0) {
      logError(`'${filePath}': campo 'subjects' deve ser uma lista (array) com pelo menos um tema.`);
    } else {
      speaker.subjects.forEach((subject, idx) => {
        if (typeof subject !== 'string' || subject.trim().length === 0) {
          logError(`'${filePath}': 'subjects[${idx}]' deve ser uma string não vazia.`);
        }
      });
    }

    // Validação do campo 'socials'
    if (!Array.isArray(speaker.socials) || speaker.socials.length === 0) {
      logError(`'${filePath}': campo 'socials' deve ser uma lista (array) com pelo menos uma rede social.`);
    } else {
      speaker.socials.forEach((social, idx) => {
        if (typeof social !== 'string' || !MARKDOWN_LINK_REGEX.test(social.trim())) {
          logError(`'${filePath}': 'socials[${idx}]' ("${social}") deve ser um link em formato Markdown válido: [Nome](URL).`);
        }
      });
    }

    // Validação opcional de 'talks' se presente
    if (speaker.talks !== undefined) {
      if (!Array.isArray(speaker.talks)) {
        logError(`'${filePath}': campo 'talks' deve ser uma lista (array) de links.`);
      } else {
        speaker.talks.forEach((talk, idx) => {
          if (typeof talk !== 'string' || !MARKDOWN_LINK_REGEX.test(talk.trim())) {
            logError(`'${filePath}': 'talks[${idx}]' ("${talk}") deve ser um link em formato Markdown válido: [Título](URL).`);
          }
        });
      }
    }
  }
}

console.log(`\n${colors.cyan}Resumo da verificação:${colors.reset}`);
console.log(`  • Cidades analisadas: ${colors.bold}${cities.length}${colors.reset}`);
console.log(`  • Palestrantes cadastrados: ${colors.bold}${totalSpeakers}${colors.reset}`);
console.log(`  • Avisos: ${warnings.length ? colors.yellow : colors.green}${warnings.length}${colors.reset}`);
console.log(`  • Erros encontrados: ${errors.length ? colors.red : colors.green}${errors.length}${colors.reset}\n`);

if (errors.length > 0) {
  console.error(`${colors.red}${colors.bold}✖ Falha na validação! Corrija os erros acima.${colors.reset}\n`);
  process.exit(1);
} else {
  console.log(`${colors.green}${colors.bold}✔ Todos os palestrantes e cidades foram verificados com sucesso!${colors.reset}\n`);
  process.exit(0);
}
