const fs = require('fs')
const table = require('markdown-table')
const _ = require('lodash')
const titleize = require('titleize');

const STATES = {
    'AC': 'Acre',
    'AL': 'Alagoas',
    'AP': 'Amapá',
    'AM': 'Amazonas',
    'BA': 'Bahia',
    'CE': 'Ceará',
    'DF': 'Distrito Federal',
    'ES': 'Espírito Santo',
    'GO': 'Goiás',
    'MA': 'Maranhão',
    'MT': 'Mato Grosso',
    'MS': 'Mato Grosso do Sul',
    'MG': 'Minas Gerais',
    'PA': 'Pará',
    'PB': 'Paraíba',
    'PR': 'Paraná',
    'PE': 'Pernambuco',
    'PI': 'Piauí',
    'RJ': 'Rio de Janeiro',
    'RN': 'Rio Grande do Norte',
    'RS': 'Rio Grande do Sul',
    'RO': 'Rondônia',
    'RR': 'Roraima',
    'SC': 'Santa Catarina',
    'SP': 'São Paulo',
    'SE': 'Sergipe',
    'TO': 'Tocantins'
};

const BASE_PATH = './speakers/'
const TABLE_HEADER = ['Nome', 'Áreas de Interesse', 'Redes sociais']

const cities = fs.readdirSync('./speakers').filter(c => !c.startsWith('.'));

const getSpeakers = (speakersDefinitions, city) => speakersDefinitions.map((speaker) => {
    return JSON.parse(fs.readFileSync(`${BASE_PATH}${city}/${speaker}`, 'UTF-8'))
})

const addSpaceLeft = (array) => array.map((it) => ` ${it}`)

const getSpeakerColumn = (speakers) => _.chain(speakers)
    .reduce((prev, speaker) => {
        return [
            ...prev,
            [
                speaker.name,
                addSpaceLeft(speaker.subjects),
                addSpaceLeft(speaker.socials)
            ]
        ]
    }, [])
    .orderBy('[0]', 'asc')

const slugifyAnchor = (text) => text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const stateGroups = {};

cities.forEach(cityFolder => {
    const parts = cityFolder.split('-');
    const uf = parts[parts.length - 1].toUpperCase();
    const rawCity = parts.slice(0, -1).join('-');
    const cityName = rawCity.split('-').map(titleize).join(' ');
    const stateName = STATES[uf] || uf;

    if (!stateGroups[uf]) {
        stateGroups[uf] = { uf, stateName, cities: [] };
    }

    const speakersDefinition = fs.readdirSync(`${BASE_PATH}${cityFolder}`).filter(f => f.endsWith('.json'));
    const speakers = getSpeakers(speakersDefinition, cityFolder);
    stateGroups[uf].cities.push({ cityName, cityFolder, speakers });
});

const sortedUfs = Object.keys(stateGroups).sort((a, b) => 
    stateGroups[a].stateName.localeCompare(stateGroups[b].stateName, 'pt-BR')
);

const toc = '\n\n### Navegue por Estado\n\n' + sortedUfs
    .map(uf => `[${uf}](#${slugifyAnchor(stateGroups[uf].stateName + ' ' + uf)})`)
    .join(' • ') + '\n';

const statesContent = sortedUfs.map(uf => {
    const state = stateGroups[uf];
    const sortedCities = _.orderBy(state.cities, ['cityName'], ['asc']);

    const citiesTables = sortedCities.map(({ cityName, speakers }) => {
        return `\n### ${cityName}\n\n` + table([
            TABLE_HEADER,
            ...getSpeakerColumn(speakers)
        ]);
    }).join('\n');

    return `\n## ${state.stateName} (${state.uf})\n` + citiesTables;
}).join('\n');

const instruction = fs.readFileSync('./INTRODUCTION.md', 'UTF-8');

const mergeIntroAndTable = `
    ${instruction}
    ${toc}
    ${statesContent}
`;

try {
    fs.writeFileSync('./README.md', mergeIntroAndTable);
    console.log('success!');
} catch (e) {
    console.warn('error ', e);
}