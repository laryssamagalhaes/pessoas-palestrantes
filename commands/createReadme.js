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
        .map((it, index, chunks) => index + 1 === chunks.length ? `- ${it.toUpperCase()}` : titleize(it))
        .map((it) => it.trim())
        .join(' ')
}


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
    return `\n\n## ${parseTitle(city)} \n\n` + table([ 
        TABLE_HEADER, 
        ...getSpeakerColumn(speakers) 
    ])
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