// Keep browser QA traffic out of production analytics while checking the payload.
async function isolateAnalytics(browser) {
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...options) => {
    const context = await newContext(...options);
    await context.route('https://us.i.posthog.com/i/v0/e/', async (route) => {
      if (route.request().method() === 'POST') {
        const data = route.request().postDataJSON();
        if (data?.properties?.game !== 'BlackJak' || data?.properties?.$process_person_profile !== false) {
          throw new Error('Unexpected analytics payload');
        }
      }
      await route.fulfill({ status: 200, contentType: 'application/json', headers: {
        'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
      }, body: '{"status":"Ok"}' });
    });
    return context;
  };
}
module.exports = { isolateAnalytics };
