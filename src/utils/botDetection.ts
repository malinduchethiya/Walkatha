const BOT_USER_AGENT_REGEX =
  /googlebot|google-inspectiontool|google-extended|googleother|google-safety|google-read-aloud|adsbot-google|apis-google|mediapartners-google|storebot-google|duplexweb-google|feedfetcher-google|bingbot|msnbot|adidxbot|bingpreview|slurp|duckduckbot|baiduspider|yandex|sogou|exabot|applebot|petalbot|seznambot|qwantify|facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|pinterest|slackbot|chrome-lighthouse|lighthouse|pagespeed|gtmetrix|pingdom|headlesschrome|phantomjs|puppeteer|playwright|selenium/i;

export function isBotUserAgent(userAgent?: string | null): boolean {
  if (!userAgent) return false;
  return BOT_USER_AGENT_REGEX.test(userAgent);
}

export function isSearchEngineCrawler(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return true;
  }
  if ((window as any).__isSearchEngineCrawler === true) {
    return true;
  }
  if (navigator.webdriver === true) {
    return true;
  }
  return isBotUserAgent(navigator.userAgent);
}
