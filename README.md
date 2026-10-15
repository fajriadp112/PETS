# Petstore API automation (Jest + Node built-in fetch)

Requires Node >= 18.

    npm install
    npm test                 # all 42 tests
    npm run test:post        # POST-001..020
    npm run test:get         # GET-001..012
    npm run test:delete      # DELETE-001..010
    BASE_URL=https://petstore.swagger.io npm test   # base URL (this is the default)

## Report
After every run a summary table prints in the console and these are written to `report/`:
- `report/report.html` (filterable results table with error details) - open it in a browser, or run `npm run report`
- `report/results.json`
