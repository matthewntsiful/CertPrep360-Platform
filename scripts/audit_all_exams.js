const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1', credentials: undefined });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE = 'CertPrep360-Dev-Main';

// All non-SAA exams to audit
const EXAMS = [
  { cert: 'AIF-C01', exam: 'AIF-C01-EXAM-01' },
  { cert: 'CLF-C02', exam: 'CLF-C02-EXAM-01' },
  { cert: 'CLF-C02', exam: 'CLF-C02-EXAM-02' },
  { cert: 'CLF-C02', exam: 'CLF-C02-EXAM-03' },
  { cert: 'CLF-C02', exam: 'CLF-C02-EXAM-04' },
  { cert: 'CLF-C02', exam: 'CLF-C02-EXAM-05' },
  { cert: 'COE-C01', exam: 'COE-C01-EXAM-01' },
  { cert: 'DVA-C02', exam: 'DVA-C02-EXAM-01' },
  { cert: 'MLE-C01', exam: 'MLE-C01-EXAM-01' },
];

async function getExamQuestions(cert, examId) {
  const items = [];
  let lastKey;
  do {
    const cmd = new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `CERT#${cert}`,
        ':sk': `EXAM#${examId}#QUESTION#`,
      },
      ExclusiveStartKey: lastKey,
    });
    const res = await docClient.send(cmd);
    items.push(...(res.Items || []));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

function detectRepetition(items, examId) {
  const openings = {};
  items.forEach(item => {
    const opening = (item.text || '').slice(0, 100).replace(/\s+/g, ' ').trim();
    if (!openings[opening]) openings[opening] = [];
    openings[opening].push(item.q_id);
  });

  const dupes = Object.entries(openings).filter(([, ids]) => ids.length > 1);
  const dupeCount = dupes.reduce((sum, [, ids]) => sum + ids.length, 0);
  const dupePct = ((dupeCount / items.length) * 100).toFixed(1);

  // Domain distribution
  const domains = {};
  items.forEach(item => {
    const d = item.domain || 'Unknown';
    domains[d] = (domains[d] || 0) + 1;
  });

  // Topic coverage
  const topics = {
    'EC2/Compute': /\bEC2\b|compute|instance/i,
    'RDS/Database': /\bRDS\b|database|MySQL|PostgreSQL|Aurora|DynamoDB/i,
    'S3/Storage': /\bS3\b|bucket|storage/i,
    'Networking/VPC': /VPC|subnet|security group|Route 53|CloudFront|ALB|NLB/i,
    'Security/IAM': /IAM|role|policy|KMS|encrypt|secret|credential/i,
    'Serverless': /Lambda|serverless|API Gateway|SQS|SNS|EventBridge/i,
    'Cost': /cost|Spot|savings|On-Demand|Reserved/i,
  };
  const topicCoverage = {};
  Object.entries(topics).forEach(([t, re]) => {
    topicCoverage[t] = items.filter(i => re.test(i.text || '')).length;
  });

  return { examId, total: items.length, dupeCount, dupePct, dupes: dupes.length, domains, topicCoverage };
}

async function main() {
  console.log('Auditing all non-SAA exams for repetition patterns...\n');

  for (const { cert, exam } of EXAMS) {
    try {
      const items = await getExamQuestions(cert, exam);
      if (items.length === 0) {
        console.log(`${exam}: NO QUESTIONS FOUND`);
        continue;
      }
      const result = detectRepetition(items, exam);
      const status = result.dupePct > 20 ? '🔴 HIGH REPETITION' : result.dupePct > 5 ? '🟡 MODERATE' : '🟢 OK';
      console.log(`${status} ${exam} (${result.total} questions)`);
      console.log(`  Repeated openings: ${result.dupes} groups, ${result.dupeCount} questions (${result.dupePct}%)`);
      console.log(`  Domains: ${Object.entries(result.domains).map(([d,c]) => `${d.split(' ').slice(-1)[0]}:${c}`).join(', ')}`);
      const lowTopics = Object.entries(result.topicCoverage).filter(([,c]) => c === 0).map(([t]) => t);
      if (lowTopics.length > 0) console.log(`  Missing topics: ${lowTopics.join(', ')}`);
      console.log('');
    } catch (e) {
      console.log(`${exam}: ERROR - ${e.message}`);
    }
  }
}

main().catch(console.error);
