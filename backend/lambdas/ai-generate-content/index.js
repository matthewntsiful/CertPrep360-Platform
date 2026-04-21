import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({ region: "us-east-1" });

const BLUEPRINTS = {
  "SAA-C03": {
    name: "Solutions Architect Associate",
    domains: [
      { name: "Design Secure Architectures", weight: 0.30 },
      { name: "Design Resilient Architectures", weight: 0.26 },
      { name: "Design High-Performing Architectures", weight: 0.24 },
      { name: "Design Cost-Optimized Architectures", weight: 0.20 }
    ]
  },
  "CLF-C02": {
    name: "Cloud Practitioner",
    domains: [
      { name: "Cloud Concepts", weight: 0.24 },
      { name: "Security and Compliance", weight: 0.30 },
      { name: "Cloud Technology and Services", weight: 0.34 },
      { name: "Billing, Pricing, and Support", weight: 0.12 }
    ]
  },
  "DVA-C02": {
    name: "Developer Associate",
    domains: [
      { name: "Development with AWS Services", weight: 0.32 },
      { name: "Security", weight: 0.26 },
      { name: "Deployment", weight: 0.24 },
      { name: "Troubleshooting and Optimization", weight: 0.18 }
    ]
  }
};

export const handler = async (event) => {
  console.log("AI Factory Request:", JSON.stringify(event));

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { certId, topic, context, count = 1, domain } = body;

    if (!certId || !BLUEPRINTS[certId]) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Valid certId is required" })
      };
    }

    const blueprint = BLUEPRINTS[certId];
    const targetDomain = domain || blueprint.domains[Math.floor(Math.random() * blueprint.domains.length)].name;

    const systemPrompt = `You are an elite AWS Certification Psychometrician specializing in ${blueprint.name} (${certId}).
Your goal is to generate high-fidelity exam questions that match the official exam difficulty and style.

REQUIRED JSON FORMAT:
Return an array of question objects. Each object must strictly follow this structure:
{
  "q_id": "string (unique)",
  "cert_id": "${certId}",
  "type": "QUESTION",
  "domain": "${targetDomain}",
  "text": "The scenario-based question text",
  "options": {
    "A": "Response",
    "B": "Response",
    "C": "Response",
    "D": "Response"
  },
  "correct": "A|B|C|D",
  "explanation": "Detailed professional explanation of why the correct choice is right and others are wrong.",
  "resources": [
    { "type": "📖 AWS Docs", "url": "https://docs.aws.amazon.com/..." }
  ]
}

CONSTRAINTS:
- No conversational text. ONLY return the JSON array.
- Scenarios must be expert-level.
- Questions must be technically accurate.
- If context text is provided, base the questions on that text while staying within the ${certId} domain.`;

    const userPrompt = `Generate ${count} question(s) for the topic: ${topic || "General " + targetDomain}.
Target Domain: ${targetDomain}
Content Context: ${context || "None provided"}`;

    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `${systemPrompt}\n\n${userPrompt}`
        }
      ],
      temperature: 0.7
    };

    const command = new InvokeModelCommand({
      modelId: "us.anthropic.claude-sonnet-4-5-20250929-v1:0", // Claude 4.5 Sonnet (Elite tier via Inference Profile)
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload)
    });

    const response = await client.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    
    // Parse the AI response text into JSON
    const aiText = result.content[0].text;
    const questions = JSON.parse(aiText.substring(aiText.indexOf("["), aiText.lastIndexOf("]") + 1));

    return {
      statusCode: 200,
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ questions })
    };

  } catch (error) {
    console.error("AI Generation Error:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Failed to generate content", details: error.message })
    };
  }
};
