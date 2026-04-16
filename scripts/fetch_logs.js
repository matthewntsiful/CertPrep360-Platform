import { CloudWatchLogsClient, FilterLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { fromIni } from "@aws-sdk/credential-providers";

async function getLogs() {
  const client = new CloudWatchLogsClient({ 
    region: "us-east-1", 
    credentials: fromIni({profile: "Matthew_Cli"}) 
  });
  const params = {
    logGroupName: "/aws/lambda/CertPrep360-Dev-GetQuestions",
    startTime: Date.now() - 30 * 60 * 1000, // last 30 minutes
  };
  try {
    const command = new FilterLogEventsCommand(params);
    const data = await client.send(command);
    data.events.slice(-20).forEach((event) => {
      console.log(event.message);
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
  }
}
getLogs();
