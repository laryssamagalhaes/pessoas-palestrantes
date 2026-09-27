const fs = require('fs');
const path = require('path');

const SPEAKERS_DIR = './speakers';
const URL_REGEX = /https?:\/\/[^\s\)]+/g;
const TIMEOUT_MS = 6000;
const CONCURRENCY = 5;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function extractLinks() {
  const links = [];
  const cities = fs.readdirSync(SPEAKERS_DIR).filter(item => {
    const p = path.join(SPEAKERS_DIR, item);
    return fs.statSync(p).isDirectory() && !item.startsWith('.');
  });

  for (const city of cities) {
    const cityPath = path.join(SPEAKERS_DIR, city);
    const files = fs.readdirSync(cityPath).filter(f => f.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(cityPath, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const allItems = [...(data.socials || []), ...(data.talks || [])];

        for (const item of allItems) {
          const matches = item.match(URL_REGEX);
          if (matches) {
            for (const url of matches) {
              links.push({
                url,
                speaker: data.name || file,
                filePath
              });
            }
          }
        }
      } catch (err) {
        console.error(`Erro ao ler ${filePath}:`, err.message);
      }
    }
  }

  return links;
}

async function checkUrl(url) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  try {
    let res = await fetch(url, {
      method: 'HEAD',
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'follow'
    });

    // Se o servidor rejeitar HEAD (405/403/400), tenta GET
    if (res.status === 405 || res.status === 400) {
      res = await fetch(url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: 'follow'
      });
    }

    return { status: res.status, ok: res.ok };
  } catch (err) {
    return { status: null, error: err.name === 'TimeoutError' ? 'Timeout' : err.message };
  }
}

async function run() {
  console.log(`\n${colors.bold}${colors.cyan}Iniciando checagem de links de palestrantes...${colors.reset}\n`);

  const links = extractLinks();
  console.log(`Encontradas ${colors.bold}${links.length}${colors.reset} URLs para testar.\n`);

  const broken = [];
  const warnings = [];
  let checked = 0;

  for (let i = 0; i < links.length; i += CONCURRENCY) {
    const batch = links.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (item) => {
        const res = await checkUrl(item.url);
        return { ...item, ...res };
      })
    );

    for (const r of results) {
      checked++;
      if (r.ok || (r.status >= 200 && r.status < 400)) {
        // Link OK
      } else if (r.status === 403 || r.status === 429) {
        // Muitas redes (LinkedIn, Twitter, Medium) bloqueiam bots automatizados com 403/429
        warnings.push(r);
      } else {
        broken.push(r);
        console.error(`  ${colors.red}✖ [${r.status || r.error}]${colors.reset} ${r.url} (${r.speaker} - ${r.filePath})`);
      }
    }

    process.stdout.write(`Progresso: ${checked}/${links.length} URLs testadas...\r`);
  }

  console.log(`\n\n${colors.bold}${colors.cyan}Resumo da checagem de links:${colors.reset}`);
  console.log(`  • Total verificado: ${colors.bold}${links.length}${colors.reset}`);
  console.log(`  • Links acessíveis: ${colors.green}${links.length - broken.length - warnings.length}${colors.reset}`);
  console.log(`  • Avisos (bloqueio bot/rate-limit): ${colors.yellow}${warnings.length}${colors.reset}`);
  console.log(`  • Links quebrados (404/DNS/Erro): ${broken.length ? colors.red : colors.green}${broken.length}${colors.reset}\n`);

  if (broken.length > 0) {
    console.log(`${colors.red}${colors.bold}Foram encontrados links quebrados que necessitam de atenção!${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}${colors.bold}✔ Nenhum link quebrado detectado!${colors.reset}\n`);
    process.exit(0);
  }
}

if (require.main === module) {
  run();
}

module.exports = { extractLinks, checkUrl };
