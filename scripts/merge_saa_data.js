const fs = require('fs');

const OLD_FILE = 'data/questions-saa-c03.json';
const NEW_FILE = 'data/questions-saa-c03-ext.json';
const MASTER_FILE = 'data/questions-saa-c03-master.json';

function mergeData() {
  console.log('🔄 Merging SAA-C03 datasets...');

  if (!fs.existsSync(OLD_FILE) || !fs.existsSync(NEW_FILE)) {
    console.error('Source files missing.');
    process.exit(1);
  }

  const oldQuestions = JSON.parse(fs.readFileSync(OLD_FILE, 'utf8'));
  const extQuestions = JSON.parse(fs.readFileSync(NEW_FILE, 'utf8'));

  const masterMap = new Map();

  oldQuestions.forEach(q => {
    const key = q.text.toLowerCase().replace(/\s+/g, ' ').trim();
    masterMap.set(key, q);
  });

  let addedCount = 0;
  extQuestions.forEach(q => {
    const key = q.text.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!masterMap.has(key)) {
      addedCount++;
      masterMap.set(key, q);
    }
  });

  const masterList = Array.from(masterMap.values()).map((q, index) => ({
    ...q,
    q_id: (index + 1).toString().padStart(4, '0')
  }));

  console.log('✅ Merge Complete!');
  console.log('Original Count: ' + oldQuestions.length);
  console.log('New Unique Questions Found: ' + addedCount);
  console.log('Total Master Questions: ' + masterList.length);

  fs.writeFileSync(MASTER_FILE, JSON.stringify(masterList, null, 2));
}

mergeData();
