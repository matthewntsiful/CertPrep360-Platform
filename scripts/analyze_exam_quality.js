const fs = require('fs');

const data17 = JSON.parse(fs.readFileSync('/Users/Matthieu/Documents/Jomacs_DevOps/MyProjects/CertPrep360-Platform/scripts/exam17_raw.json'));
const data18 = JSON.parse(fs.readFileSync('/Users/Matthieu/Documents/Jomacs_DevOps/MyProjects/CertPrep360-Platform/scripts/exam18_raw.json'));

function analyzeExam(items, examName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`EXAM: ${examName} (${items.length} questions)`);
  console.log('='.repeat(60));

  // 1. Domain distribution
  const domains = {};
  items.forEach(item => {
    const d = item.domain ? item.domain.S : 'Unknown';
    domains[d] = (domains[d] || 0) + 1;
  });
  console.log('\n📊 Domain Distribution:');
  Object.entries(domains).sort((a,b) => b[1]-a[1]).forEach(([d, count]) => {
    const pct = ((count/items.length)*100).toFixed(1);
    const bar = '█'.repeat(Math.round(count/items.length*30));
    console.log(`  ${bar} ${pct}% (${count}) - ${d}`);
  });

  // 2. Topic/keyword frequency from question text
  const keywords = {
    'RDS/Database': /\bRDS\b|database|MySQL|PostgreSQL|Aurora/i,
    'EC2/Auto Scaling': /\bEC2\b|Auto Scaling|instance/i,
    'S3': /\bS3\b|bucket|object storage/i,
    'Credentials/Secrets': /credential|secret|rotation|Secrets Manager|password/i,
    'Encryption/KMS': /encrypt|KMS|key management/i,
    'Cost Optimization': /cost|Spot|savings|On-Demand|optimize/i,
    'High Availability/AZ': /availability zone|multi-AZ|failover|highly available/i,
    'CloudFront/CDN': /CloudFront|CDN|edge|latency|global/i,
    'VPC/Networking': /VPC|subnet|security group|NAT|gateway/i,
    'Lambda/Serverless': /Lambda|serverless/i,
    'SQS/SNS/Messaging': /SQS|SNS|queue|message/i,
  };
  console.log('\n🔍 Topic Frequency (questions touching each topic):');
  Object.entries(keywords).forEach(([topic, regex]) => {
    const count = items.filter(i => regex.test(i.text.S)).length;
    const pct = ((count/items.length)*100).toFixed(1);
    if (count > 0) {
      const bar = '█'.repeat(Math.round(count/items.length*30));
      console.log(`  ${bar} ${pct}% (${count}) - ${topic}`);
    }
  });

  // 3. Near-duplicate detection (similar question endings)
  console.log('\n⚠️  Repeated Question Patterns (similar endings):');
  const endings = {};
  items.forEach(item => {
    const text = item.text.S;
    // Get last 80 chars as fingerprint
    const ending = text.slice(-80).replace(/\s+/g, ' ').trim();
    if (!endings[ending]) endings[ending] = [];
    endings[ending].push(item.q_id.S);
  });
  let dupeCount = 0;
  Object.entries(endings).filter(([,ids]) => ids.length > 1).forEach(([ending, ids]) => {
    dupeCount++;
    console.log(`  DUPLICATE ending (${ids.length}x): "${ending.slice(-60)}"`);
    ids.forEach(id => console.log(`    - ${id}`));
  });
  if (dupeCount === 0) console.log('  None found by ending fingerprint');

  // 4. Keyword overlap in question text (first 100 chars)
  console.log('\n⚠️  Questions with very similar openings:');
  const openings = {};
  items.forEach(item => {
    const opening = item.text.S.slice(0, 100).replace(/\s+/g, ' ').trim();
    if (!openings[opening]) openings[opening] = [];
    openings[opening].push(item.q_id.S);
  });
  let openingDupes = 0;
  Object.entries(openings).filter(([,ids]) => ids.length > 1).forEach(([opening, ids]) => {
    openingDupes++;
    console.log(`  SIMILAR opening (${ids.length}x): "${opening.slice(0,80)}..."`);
    ids.forEach(id => console.log(`    - ${id}`));
  });
  if (openingDupes === 0) console.log('  None found');
}

analyzeExam(data17.Items, 'SAA-C03-EXAM-17');
analyzeExam(data18.Items, 'SAA-C03-EXAM-18');

// Cross-exam duplicates
console.log('\n' + '='.repeat(60));
console.log('CROSS-EXAM ANALYSIS (17 vs 18)');
console.log('='.repeat(60));
const texts17 = new Map(data17.Items.map(i => [i.q_id.S, i.text.S.slice(0,120)]));
const texts18 = new Map(data18.Items.map(i => [i.q_id.S, i.text.S.slice(0,120)]));

let crossDupes = 0;
texts17.forEach((t17, id17) => {
  texts18.forEach((t18, id18) => {
    // Check if first 120 chars are very similar (>80% overlap)
    const words17 = new Set(t17.toLowerCase().split(/\s+/));
    const words18 = new Set(t18.toLowerCase().split(/\s+/));
    const intersection = [...words17].filter(w => words18.has(w)).length;
    const similarity = intersection / Math.max(words17.size, words18.size);
    if (similarity > 0.85) {
      crossDupes++;
      console.log(`\n  NEAR-DUPLICATE (${(similarity*100).toFixed(0)}% similar):`);
      console.log(`    Exam17: ${id17} - "${t17.slice(0,80)}..."`);
      console.log(`    Exam18: ${id18} - "${t18.slice(0,80)}..."`);
    }
  });
});
if (crossDupes === 0) console.log('  No near-duplicates found between exams 17 and 18');
console.log(`\nTotal cross-exam near-duplicates: ${crossDupes}`);
