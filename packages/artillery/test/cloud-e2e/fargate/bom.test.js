const { test, before, beforeEach } = require('tap');
const { $ } = require('zx');
const fs = require('fs');
const {
  generateTmpReportPath,
  getTestTags,
  execute
} = require('../../cli/_helpers.js');

const A9 = process.env.A9 || 'artillery';

before(async () => {
  await $`${A9} -V`;
});

//NOTE: all these tests report to Artillery Dashboard to dogfood and improve visibility
const baseTags = getTestTags(['type:acceptance']);
let reportFilePath;
beforeEach(async (t) => {
  $.verbose = true;

  reportFilePath = generateTmpReportPath(t.name, 'json');
});

test('Run simple-bom', async (t) => {
  const scenarioPath = `${__dirname}/fixtures/simple-bom/simple-bom.yml`;
  const [exitCode, output] = await execute([
    'run-fargate',
    '--environment',
    'test',
    '--region',
    'eu-west-1',
    '--count',
    '51',
    '--tags',
    baseTags,
    '--record',
    scenarioPath
  ]);

  t.equal(exitCode, 0, 'CLI Exit Code should be 0');

  t.match(output.stdout, /summary report/i, 'print summary report');
  t.match(output.stdout, /p99/i, 'a p99 value is reported');
  t.match(
    output.stdout,
    /created:.+510/i,
    'expected number of vusers is reported'
  );
});

test('Run mixed-hierarchy', async (t) => {
  const scenarioPath = `${__dirname}/fixtures/mixed-hierarchy/scenarios/mixed-hierarchy-dino.yml`;
  const configPath = `${__dirname}/fixtures/mixed-hierarchy/config/config.yml`;

  const output =
    await $`${A9} run-fargate ${scenarioPath} --config ${configPath} -e main --record --tags ${baseTags} --output ${reportFilePath}`;

  const report = JSON.parse(fs.readFileSync(reportFilePath, 'utf8'));

  t.equal(output.exitCode, 0, 'CLI Exit Code should be 0');

  t.equal(
    report.aggregate.counters['vusers.completed'],
    20,
    'Should have 20 total VUs'
  );
  t.equal(
    report.aggregate.counters['http.codes.200'],
    20,
    'Should have 20 "200 OK" responses'
  );
});
