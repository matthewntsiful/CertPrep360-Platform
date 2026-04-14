const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.S3_BUCKET || `saa-c03-exams-${Date.now()}`;

async function deploy() {
  console.log('🚀 Deploying to S3...');
  
  try {
    // Create bucket
    await s3.createBucket({ Bucket: BUCKET_NAME }).promise();
    console.log(`✅ Created bucket: ${BUCKET_NAME}`);
    
    // Upload exam files
    const examDir = path.join(__dirname, '../SAA-C03_Complete_Exam_Suite/Enhanced_HTML_Quizzes');
    const files = fs.readdirSync(examDir).filter(f => f.endsWith('.html'));
    
    for (const file of files) {
      const content = fs.readFileSync(path.join(examDir, file));
      await s3.putObject({
        Bucket: BUCKET_NAME,
        Key: `exams/${file}`,
        Body: content,
        ContentType: 'text/html',
        CacheControl: 'max-age=86400'
      }).promise();
    }
    
    console.log(`📝 Uploaded ${files.length} exam files`);
    console.log(`🌐 Access at: http://${BUCKET_NAME}.s3-website-us-east-1.amazonaws.com`);
    
  } catch (error) {
    console.error('❌ Deploy failed:', error.message);
  }
}

deploy();