import { handler } from '../backend/lambdas/get-questions/index.js';

// Mock the Lambda environment and event
process.env.TABLE_NAME = "CertPrep360-Dev-Main";
process.env.AWS_REGION = "us-east-1";
process.env.AWS_PROFILE = "Matthew_Cli";

const testEvent = {
  pathParameters: {
    certId: "saa-c03",
    examId: "01"
  }
};

(async () => {
  try {
    const result = await handler(testEvent);
    console.log("Lambda Output:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Lambda crashed:", error);
  }
})();
