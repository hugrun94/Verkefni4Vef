require('dotenv').config();
require('es6-promise').polyfill();
require('isomorphic-fetch');
const cheerio = require('cheerio');
const redis = require('redis');
const util = require('util');

const redisOptions = {
  url: 'redis://127.0.0.1:6379/0'
}

const client = redis.createClient(redisOptions);

const asyncGet = util.promisify(client.get).bind(client);
const asyncSet = util.promisify(client.set).bind(client);
  const prefix = 'vef2-v4:';

/* todo require og stilla dót */

/**
 * Listi af sviðum með „slug“ fyrir vefþjónustu og viðbættum upplýsingum til
 * að geta sótt gögn.
 */
const departments = [
  {
    name: 'Félagsvísindasvið',
    slug: 'felagsvisindasvid',
  },
  {
    name: 'Heilbrigðisvísindasvið',
    slug: 'heilbrigdisvisindasvid',
  },
  {
    name: 'Hugvísindasvið',
    slug: 'hugvisindasvid',
  },
  {
    name: 'Menntavísindasvið',
    slug: 'menntavisindasvid',
  },
  {
    name: 'Verkfræði- og náttúruvísindasvið',
    slug: 'verkfraedi-og-natturuvisindasvid',
  },
];

const tests = [];


/**
 * Sækir svið eftir `slug`. Fáum gögn annaðhvort beint frá vef eða úr cache.
 *
 * @param {string} slug - Slug fyrir svið sem skal sækja
 * @returns {Promise} Promise sem mun innihalda gögn fyrir svið eða null ef það finnst ekki
 */
async function getTests(slug) {

var key = "";
let response;
if(slug === 'felagsvisindasvid'){
  response = await fetch('https://ugla.hi.is/Proftafla/View/ajax.php?sid=2027&a=getProfSvids&proftaflaID=37&svidID=1&notaVinnuToflu=0');
  key = "felsvid";
  console.log(key)
}

 else if(slug === 'heilbrigdisvisindasvid'){
  response = await fetch('https://ugla.hi.is/Proftafla/View/ajax.php?sid=2027&a=getProfSvids&proftaflaID=37&svidID=2&notaVinnuToflu=0');
  key = "heilsvid";
  console.log(key)

}
else if(slug === 'hugvisindasvid'){
  response = await fetch('https://ugla.hi.is/Proftafla/View/ajax.php?sid=2027&a=getProfSvids&proftaflaID=37&svidID=3&notaVinnuToflu=0');
  key = "hugsvid";
  console.log(key)

}
else if(slug === 'menntavisindasvid'){
  response = await fetch('https://ugla.hi.is/Proftafla/View/ajax.php?sid=2027&a=getProfSvids&proftaflaID=37&svidID=4&notaVinnuToflu=0');
  key = "mensvid";
  console.log()

}
else if(slug === 'verkfraedi-og-natturuvisindasvid'){
  response = await fetch('https://ugla.hi.is/Proftafla/View/ajax.php?sid=2027&a=getProfSvids&proftaflaID=37&svidID=5&notaVinnuToflu=0');
  key = "versvid";
  console.log('5')

}else{
  return;
}

 const text = await response.json();
 const cached = await asyncGet(key);
  
  if(cached){
    return JSON.parse(cached);
  }

  
  const $ = cheerio.load( text.html );
  const headlines = $('h3');
  headlines.each((i, el) => {
    const headline = $(el);
    tests.push({heading: headline.text().trim() , tests: [] });
    const testsIn = headline.next('table').find('tbody');
    testsIn.each((j, elm) => {
      const tr = $(elm).find('tr');
      tr.each((m, elem) => {
        const test = $(elem).find('td');
        const info = [];
        test.each((k, eleme) => {
          info.push($(eleme).text().trim())

        })

        tests[i].tests.push({
          course : info[0],
          name : info[1],
          type : info[2],
          students: Number(info[3]),
          date: info[4],
        });
      });

    });

  });

  await asyncSet(key, JSON.stringify(tests));
  return tests;
}
/**
 * Hreinsar cache.
 *
 * @returns {Promise} Promise sem mun innihalda boolean um hvort cache hafi verið hreinsað eða ekki.
 */
async function clearCache() {
  /* todo */
  const result = await client.flushall();
  return result;
}

/**
 * Sækir tölfræði fyrir öll próf allra deilda allra sviða.
 *
 * @returns {Promise} Promise sem mun innihalda object með tölfræði um próf
 */
async function getStats() {
  const cached = await asyncGet(`${prefix}Stats`);

  if (cached){
    return JSON.parse(cached); 
  }
  let numTests = 0;
  let numStudents = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  //const data = await getTests('hugsvid');
  tests.forEach((item) => { 
    numTests += item.tests.length;
    item.tests.forEach((test) => {
      const testStudents = Number(test.students);
      numStudents += testStudents; 
      if (testStudents > max){
        max = testStudents;
      }
      if (testStudents < min){
        min = testStudents;
      }
      });
  }); 
  const averageStudents = (numStudents / numTests).toFixed(2);
  const result = { 
    min, 
    max,
    numTests, 
    numStudents, 
    averageStudents, 
  }; 
  await asyncSet(`${prefix}Stats`, JSON.stringify(result));
  return result; 

}

module.exports = {
  departments,
  getTests,
  clearCache,
  getStats,
};
