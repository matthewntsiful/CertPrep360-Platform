const fs = require('fs');
const { execSync } = require('child_process');

// Path to node binary as discovered in the environment
const NODE_BIN = '/usr/local/bin/node';
const TABLE_NAME = process.argv[2];
const SOURCE_FILE = 'data/questions-saa-c03.json';

const TARGET_CERTS = [
  'clf-c02', 'aif-c01', 
  'saa-c03', 'dva-c02', 'soa-c02',
  'sap-c02', 'dop-c02', 'gdp-c01',
  'ans-c01', 'scs-c02', 'mls-c01'
];

if (!TABLE_NAME) {
  console.error('Usage: node scripts/mass_inject.js <tableName>');
  process.exit(1);
}

async function runMassInjection() {
  console.log('🚀 Starting Mass Injection for ' + TARGET_CERTS.length + ' tracks...');

  if (!fs.existsSync('data')) fs.mkdirSync('data');
  if (!fs.existsSync(SOURCE_FILE)) {
    console.error('Source SAA file not found: ' + SOURCE_FILE);
    process.exit(1);
  }

  for (const certId of TARGET_CERTS) {
    const targetFile = 'data/questions-' + certId + '.json';
    
    if (certId !== 'saa-c03') {
      console.log('\n📦 Duplicating master content for: ' + certId);
      fs.copyFileSync(SOURCE_FILE, targetFile);
    }

    console.log('⚡ Seeding ' + certId + ' into ' + TABLE_NAME + '...');
    try {
      execSync(`${NODE_BIN} scripts/seed_dynamodb.js ${TABLE_NAME} ${targetFile} ${certId.toUpperCase()} 01`, { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Failed to seed ' + certId);
    }
  }

  console.log('\n✅ Mission Complete: Multi-Certification Hub Populated!');
}

runMassInjection().catch(console.error);
