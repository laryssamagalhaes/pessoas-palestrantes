const fs = require('fs');
const path = require('path');
const readline = require('readline');

const VALID_UFS = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]);

function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function ask(rl, question, defaultValue = '') {
  return new Promise((resolve) => {
    const promptText = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
    rl.question(promptText, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function run() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n🎙️  Cadastro Interativo de Pessoa Palestrante\n');

  try {
    let name = '';
    while (!name) {
      name = await ask(rl, '1. Nome completo');
      if (!name) console.log('   ✖ O nome é obrigatório.');
    }

    let city = '';
    while (!city) {
      city = await ask(rl, '2. Cidade');
      if (!city) console.log('   ✖ A cidade é obrigatória.');
    }

    let uf = '';
    while (!uf) {
      const ufInput = (await ask(rl, '3. Estado / UF (ex: MG, SP, RJ)')).toUpperCase();
      if (!VALID_UFS.has(ufInput)) {
        console.log(`   ✖ UF '${ufInput}' inválida. Informe uma sigla válida de estado brasileiro.`);
      } else {
        uf = ufInput;
      }
    }

    let subjectsInput = '';
    while (!subjectsInput) {
      subjectsInput = await ask(rl, '4. Áreas de interesse / temas (separados por vírgula)');
      if (!subjectsInput) console.log('   ✖ Informe pelo menos um tema.');
    }
    const subjects = subjectsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    console.log('\n🔗  Redes sociais e contato:');
    const linkedin = await ask(rl, '   LinkedIn (URL completa ou usuário)');
    const github = await ask(rl, '   GitHub (URL completa ou usuário)');
    const site = await ask(rl, '   Site pessoal / Blog (opcional)');
    const extraSocial = await ask(rl, '   Outra rede (opcional, ex: [Twitter](https://x.com/...))');

    const socials = [];
    if (linkedin) {
      const url = linkedin.startsWith('http') ? linkedin : `https://linkedin.com/in/${linkedin.replace(/^@/, '')}`;
      socials.push(`[linkedin](${url})`);
    }
    if (github) {
      const url = github.startsWith('http') ? github : `https://github.com/${github.replace(/^@/, '')}`;
      socials.push(`[github](${url})`);
    }
    if (site) {
      const url = site.startsWith('http') ? site : `https://${site}`;
      socials.push(`[site](${url})`);
    }
    if (extraSocial) {
      if (extraSocial.startsWith('[') && extraSocial.includes('](')) {
        socials.push(extraSocial);
      } else {
        const url = extraSocial.startsWith('http') ? extraSocial : `https://${extraSocial}`;
        socials.push(`[social](${url})`);
      }
    }

    if (socials.length === 0) {
      console.log('   ⚠ Nenhuma rede informada. Adicionando placeholder para preenchimento.');
      socials.push('[github](https://github.com/)');
    }

    const talksInput = await ask(rl, '\n🎤  Palestras já ministradas (opcional, separadas por vírgula)');
    let talks = [];
    if (talksInput) {
      talks = talksInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }

    // Montagem dos arquivos
    const citySlug = `${slugify(city)}-${uf}`;
    const speakerSlug = `${slugify(name)}.json`;
    const targetDir = path.join('./speakers', citySlug);
    const targetFile = path.join(targetDir, speakerSlug);

    const payload = {
      name,
      subjects,
      socials
    };

    if (talks.length > 0) {
      payload.talks = talks;
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(targetFile, JSON.stringify(payload, null, 4) + '\n', 'utf-8');

    console.log(`\n✔ Palestrante cadastrado com sucesso!`);
    console.log(`  Arquivo criado: \x1b[32m${targetFile}\x1b[0m`);
    console.log(`\nPróximos passos:`);
    console.log(`  1. Revise o arquivo criado.`);
    console.log(`  2. Execute 'npm test' para validar.`);
    console.log(`  3. Abra seu Pull Request!\n`);
  } catch (err) {
    console.error('Erro durante o cadastro:', err);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  run();
}

module.exports = { slugify, run };
