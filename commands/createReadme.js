const fs = require('fs')
const table = require('markdown-table')
const _ = require('lodash')
const titleize = require('titleize');

const cities = fs.readdirSync('./speakers');
const BASE_PATH = './speakers/'
const TABLE_HEADER = ['Nome', 'Áreas de Interesse', 'Redes sociais']

const getSpeakers = (speakersDefinitions, city) => speakersDefinitions.map((speaker) => {
    return JSON.parse(fs.readFileSync(`${BASE_PATH}${city}/${speaker}`, 'UTF-8'))
})

const parseData = (prevObject, city) => {
    const speakersDefinition = fs.readdirSync(`${BASE_PATH}${city}`)
    const speakers = getSpeakers(speakersDefinition, city)

    return {
        ...prevObject,
        [city]: speakers
    }
}

const addSpaceLeft = (array) => array.map((it) => ` ${it}`)

const parseTitle = (title) =>  {
    return title
        .split('-')
        .map((it, index, chunks) => index + 1 === chunks.length ? `- ${it.toUpperCase()}` : titleize(it))
        .map((it) => it.trim())
        .join(' ')
}

const renderSpeakerDetails = (speaker) => {
    const hasBio = speaker.bio && typeof speaker.bio === 'string' && speaker.bio.trim().length > 0;
    const hasLanguages = Array.isArray(speaker.languages) && speaker.languages.length > 0;
    const hasAvailability = Array.isArray(speaker.availability) && speaker.availability.length > 0;
    const hasTalks = Array.isArray(speaker.talks) && speaker.talks.length > 0;

    if (!hasBio && !hasLanguages && !hasAvailability && !hasTalks) {
        return '';
    }

    const lines = [];
    if (hasBio) {
        lines.push(`> **Bio:** ${speaker.bio.trim()}  `);
    }
    if (hasLanguages) {
        lines.push(`> **Idiomas:** ${speaker.languages.join(', ')}  `);
    }
    if (hasAvailability) {
        lines.push(`> **Disponibilidade:** ${speaker.availability.join(', ')}  `);
    }
    if (hasTalks) {
        lines.push(`> **Palestras:**  `);
        speaker.talks.forEach((talk) => lines.push(`> • ${talk.trim()}`));
    }

    return `\n<details>\n  <summary>🔍 Mais informações sobre <b>${speaker.name}</b></summary>\n  <br />\n\n${lines.join('\n')}\n</details>\n`;
};

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

const mountTableByCity = ([city, speakers]) => {
    const sortedSpeakers = _.orderBy(speakers, ['name'], ['asc']);

    const cityTable = `\n\n## ${parseTitle(city)} \n\n` + table([ 
        TABLE_HEADER, 
        ...getSpeakerColumn(speakers) 
    ]);

    const details = sortedSpeakers
        .map(renderSpeakerDetails)
        .filter(Boolean)
        .join('\n');

    return details ? `${cityTable}\n${details}` : cityTable;
}

const parsedData = cities
    .reduce(parseData, {})

const readmeString = Object.entries(parsedData)
    .map(mountTableByCity)

const instruction = fs.readFileSync('./INTRODUCTION.md', 'UTF-8')

const mergeIntroAndTable = `
    ${instruction}
    ${readmeString}
`

try {
  fs.writeFileSync('./README.md', mergeIntroAndTable)
  console.log('success!')  
} catch(e) {
    console.warn('error ', e)
}