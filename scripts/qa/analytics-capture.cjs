// Browser QA opts out of analytics so test sessions do not enter live metrics.
async function isolateAnalytics(browser) {
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...options) => {
    const context = await newContext(...options);
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'globalPrivacyControl', { value: true, configurable: true });
    });
    return context;
  };
}
module.exports = { isolateAnalytics };
