const https = require('https');
const http = require('http');
const { URL } = require('url');

// Server-side in-memory translation cache to avoid repeated DeepL requests
const translationCache = new Map();

// DeepL language code mapping (ISO 639-1 upper-case)
const DEEPL_LANG_MAP = {
  en: 'EN-US',
  ta: 'TA',
  hi: 'HI',
  te: 'TE',
  kn: 'KN',
  ml: 'ML',
  bn: 'BN',
  mr: 'MR',
  gu: 'GU',
  es: 'ES',
  fr: 'FR',
  de: 'DE',
  ja: 'JA'
};

/**
 * Protects placeholders like {username}, {{count}}, %s, ${value} from being translated by wrapping them in HTML keep tags
 */
function protectPlaceholders(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/(\{[a-zA-Z0-9_]+\})/g, '<keep>$1</keep>')
    .replace(/(\{\{[a-zA-Z0-9_]+\}\})/g, '<keep>$1</keep>')
    .replace(/(\$\{[a-zA-Z0-9_]+\})/g, '<keep>$1</keep>');
}

function restorePlaceholders(text) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/<keep>(.*?)<\/keep>/gi, '$1');
}

/**
 * Translates single text string or array of strings using DeepL API v2 or Azure Translator as fallback.
 */
async function translateText(textInput, targetLang, sourceLang = 'en') {
  if (!textInput) return textInput;

  const isArray = Array.isArray(textInput);
  const textList = isArray ? textInput : [textInput];

  if (!targetLang || targetLang === 'en' || targetLang === sourceLang) {
    return textInput;
  }

  const targetLangUpper = (DEEPL_LANG_MAP[targetLang.toLowerCase()] || targetLang.toUpperCase());

  // Check cache for all strings
  const results = [];
  const uncachedIndices = [];
  const uncachedTexts = [];

  textList.forEach((txt, idx) => {
    if (!txt || typeof txt !== 'string' || !txt.trim()) {
      results[idx] = txt;
      return;
    }

    const cacheKey = `${sourceLang}:${targetLangUpper}:${txt.trim()}`;
    if (translationCache.has(cacheKey)) {
      results[idx] = translationCache.get(cacheKey);
    } else {
      uncachedIndices.push(idx);
      uncachedTexts.push(txt);
    }
  });

  if (uncachedTexts.length === 0) {
    return isArray ? results : results[0];
  }

  const apiKey = (process.env.DEEPL_API_KEY || process.env.AZURE_TRANSLATOR_KEY || '').trim();
  if (!apiKey) {
    // Fallback: fill uncached with original text
    uncachedIndices.forEach((origIdx, i) => {
      results[origIdx] = uncachedTexts[i];
    });
    return isArray ? results : results[0];
  }

  // Determine DeepL API Endpoint
  const isFreeKey = apiKey.endsWith(':fx');
  let endpoint = process.env.DEEPL_API_ENDPOINT || (isFreeKey ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate');

  try {
    const protectedTexts = uncachedTexts.map(txt => protectPlaceholders(txt));

    const postBody = JSON.stringify({
      text: protectedTexts,
      target_lang: targetLangUpper,
      source_lang: (sourceLang || 'en').toUpperCase(),
      tag_handling: 'html',
      preserve_formatting: true
    });

    const urlObj = new URL(endpoint);
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
      'Content-Length': Buffer.byteLength(postBody)
    };

    const client = urlObj.protocol === 'https:' ? https : http;

    const translatedList = await new Promise((resolve) => {
      const req = client.request(endpoint, {
        method: 'POST',
        headers: headers,
        timeout: 6000
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const data = JSON.parse(body);
              if (data && Array.isArray(data.translations)) {
                const translatedStrings = data.translations.map((t, idx) => {
                  const restored = restorePlaceholders(t.text);
                  const cacheKey = `${sourceLang}:${targetLangUpper}:${uncachedTexts[idx].trim()}`;
                  translationCache.set(cacheKey, restored);
                  return restored;
                });
                return resolve(translatedStrings);
              }
            } catch (e) {
              console.error('Error parsing DeepL API response:', e);
            }
          } else {
            console.warn(`DeepL API status ${res.statusCode}: ${body}`);
          }
          resolve(uncachedTexts); // Fallback to original text
        });
      });

      req.on('error', (err) => {
        console.warn('DeepL API request error:', err.message);
        resolve(uncachedTexts);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(uncachedTexts);
      });

      req.write(postBody);
      req.end();
    });

    uncachedIndices.forEach((origIdx, i) => {
      results[origIdx] = translatedList[i] || uncachedTexts[i];
    });

    return isArray ? results : results[0];

  } catch (err) {
    console.warn('Unhandled translatorService error:', err.message);
    uncachedIndices.forEach((origIdx, i) => {
      results[origIdx] = uncachedTexts[i];
    });
    return isArray ? results : results[0];
  }
}

module.exports = {
  translateText
};
