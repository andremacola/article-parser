/**
 * Converts a date format to YYYY-MM-DD.
 * Specifically handles the DD/MM/YYYY format for the 'pt-br' language.
 *
 * @param {string} dateString The date in string format, e.g., "05/12/2024".
 * @param {string} language The language code, e.g., "pt-br" or "en".
 * @returns {string} The formatted date as YYYY-MM-DDTHH:mm:ss.
 */
function convertDateFormat (dateString, language) {
  const parts = dateString.split('/')
  if (parts.length !== 3) return dateString

  let year, month, day

  if (language === 'pt-br') {
    [day, month, year] = parts
  } else {
    if (parseInt(parts[0]) > 12) {
      [day, month, year] = parts
    } else {
      [month, day, year] = parts
    }
  }

  year = year.length === 2 ? '20' + year : year

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`
}

/**
* @param {string} url
* @returns {string|undefined}
*/
function dateFromUrl (url) {
  const regex = /\/(\d{4})\/(\d{2})\/(\d{2})(?:[^\d]|$)/
  const match = url.match(regex)

  if (match) {
    // eslint-disable-next-line no-unused-vars
    const [_, year, month, day] = match
    const dateString = `${year}-${month}-${day}T00:00:00`

    // date validation
    const date = new Date(dateString)
    if (date.getFullYear() === parseInt(year) &&
    date.getMonth() + 1 === parseInt(month) &&
    date.getDate() === parseInt(day)) {
      return dateString
    }
  }

  return undefined
}

/**
* @param {Element} element
* @returns {string|undefined}
*/
function dateFromContent (element, language) {
  const datePatterns = [
    /\d{4}-\d{2}-\d{2}/,
    /\d{1,2}\/\d{1,2}\/\d{2,4}/,
  ]

  for (const pattern of datePatterns) {
    const match = element.textContent.match(pattern)
    if (match) {
      return convertDateFormat(match[0], language)
    }
  }

  return undefined
}

/**
* Look for publication date in the body of the content.
*
* @param {Document} document - HTML Document
* @param {Object} metadata - Article metadata
* @returns {string} Date string
*/
export default function (doc, metadata) {
  const language = doc.documentElement.lang.toLowerCase() || 'en'
  const priorityElements = doc.querySelectorAll('time, [datetime], [itemprop~=datePublished], [itemprop~=dateCreated]')
  for (const el of priorityElements) {
    const date =
          el.getAttribute('datetime')
       || el.getAttribute('content')
       || el.getAttribute('title')
       || dateFromContent(el, language)

    if (date) return date
  }

  const urlDate = dateFromUrl(metadata.url)
  if (urlDate) return urlDate

  const secondaryElements = doc.querySelectorAll('p, span, div')
  for (const el of secondaryElements) {
    const date = dateFromContent(el, language)
    if (date) return date
  }

  return ''
}
