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
  "AIF-C01": {
    name: "AI Practitioner",
    domains: [
      { name: "Fundamentals of AI and ML", weight: 0.20 },
      { name: "Fundamentals of Generative AI", weight: 0.24 },
      { name: "Applications of Foundation Models", weight: 0.28 },
      { name: "Guidelines for Responsible AI", weight: 0.14 },
      { name: "Security, Compliance, and Governance", weight: 0.14 }
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
  },
  "SAP-C02": {
    name: "Solutions Architect Professional",
    domains: [
      { name: "Design Solutions for Organizational Complexity", weight: 0.26 },
      { name: "Design for New Solutions", weight: 0.29 },
      { name: "Continuous Improvement for Existing Solutions", weight: 0.25 },
      { name: "Accelerate Workload Migration and Modernization", weight: 0.20 }
    ]
  },
  "DOP-C02": {
    name: "DevOps Engineer Professional",
    domains: [
      { name: "SDLC Automation", weight: 0.22 },
      { name: "Configuration Management and IaC", weight: 0.17 },
      { name: "Resilient Cloud Solutions", weight: 0.15 },
      { name: "Monitoring and Logging", weight: 0.15 },
      { name: "Incident and Event Response", weight: 0.14 },
      { name: "Security and Compliance", weight: 0.17 }
    ]
  },
  "SCS-C02": {
    name: "Security Specialty",
    domains: [
      { name: "Threat Detection and Incident Response", weight: 0.14 },
      { name: "Security Logging and Monitoring", weight: 0.18 },
      { name: "Infrastructure Security", weight: 0.20 },
      { name: "Identity and Access Management", weight: 0.16 },
      { name: "Data Protection", weight: 0.18 },
      { name: "Management and Security Governance", weight: 0.14 }
    ]
  },
  "ANS-C01": {
    name: "Advanced Networking Specialty",
    domains: [
      { name: "Network Design", weight: 0.30 },
      { name: "Network Implementation", weight: 0.26 },
      { name: "Network Management and Operation", weight: 0.20 },
      { name: "Network Security, Compliance, and Governance", weight: 0.24 }
    ]
  },
  "COE-C01": {
    name: "CloudOps Engineer Associate",
    domains: [
      { name: "Monitoring, Logging, and Remediation", weight: 0.20 },
      { name: "Reliability and Business Continuity", weight: 0.16 },
      { name: "Deployment, Provisioning, and Automation", weight: 0.18 },
      { name: "Security and Compliance", weight: 0.16 },
      { name: "Networking and Content Delivery", weight: 0.18 },
      { name: "Cost and Performance Optimization", weight: 0.12 }
    ]
  },
  "DEA-C01": {
    name: "Data Engineer Associate",
    domains: [
      { name: "Data Ingestion and Transformation", weight: 0.34 },
      { name: "Data Store Management", weight: 0.26 },
      { name: "Data Operations and Support", weight: 0.22 },
      { name: "Data Security and Governance", weight: 0.18 }
    ]
  },
  "MLE-C01": {
    name: "Machine Learning Engineer Associate",
    domains: [
      { name: "Data Preparation for ML", weight: 0.28 },
      { name: "ML Model Development", weight: 0.26 },
      { name: "ML Implementation and Operations", weight: 0.28 },
      { name: "AI Solutions and Safety", weight: 0.18 }
    ]
  },
  "GDP-C01": {
    name: "Generative AI Developer Professional",
    domains: [
      { name: "Foundation Model Integration", weight: 0.31 },
      { name: "Implementation and Integration", weight: 0.26 },
      { name: "AI Safety, Security, and Governance", weight: 0.20 },
      { name: "Operational Efficiency", weight: 0.12 },
      { name: "Testing and Validation", weight: 0.11 }
    ]
  }
};

const invokeModel = async (prompt, maxTokens = 4000) => {
  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7
  };
  const command = new InvokeModelCommand({
    modelId: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload)
  });
  const response = await client.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.content[0].text;
};

export const handler = async (event) => {
  console.log("AI Factory Request:", JSON.stringify(event));

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { mode = 'generate', certId, topic, context, count = 1, domain, question } = body;

    // ── ENRICH MODE ──────────────────────────────────────────────────────────
    if (mode === 'enrich') {
      if (!question) return { statusCode: 400, headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com" }, body: JSON.stringify({ error: "question object required" }) };

      const optionsText = Object.entries(question.options || {})
        .map(([k, v]) => `${k}. ${v}`).join('\n');

      const prompt = `You are an AWS certification expert. Given this exam question, write a detailed explanation and provide relevant AWS documentation links.

Question: ${question.text}
Options:\n${optionsText}
Correct Answer: ${question.correct}
Domain: ${question.domain}
Certification: ${certId}

Return ONLY a JSON object in this exact format:
{
  "explanation": "3-5 sentence explanation of why the correct answer is right and briefly why each wrong answer is incorrect. Be specific about AWS services and concepts.",
  "resources": [
    { "type": "📖 AWS Docs", "url": "https://docs.aws.amazon.com/..." },
    { "type": "📖 AWS Docs", "url": "https://docs.aws.amazon.com/..." }
  ]
}

Return ONLY the JSON object. No other text.`;

      const aiText = await invokeModel(prompt, 1500);
      const jsonStr = aiText.substring(aiText.indexOf('{'), aiText.lastIndexOf('}') + 1);
      const enriched = JSON.parse(jsonStr);

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com", "Content-Type": "application/json" },
        body: JSON.stringify(enriched)
      };
    }

    // ── FIX MODE ─────────────────────────────────────────────────────────────
    if (mode === 'fix') {
      if (!question) return { statusCode: 400, headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com" }, body: JSON.stringify({ error: "question object required" }) };

      const optionsText = Object.entries(question.options || {})
        .map(([k, v]) => `${k}. ${v}`).join('\n');

      const prompt = `You are an AWS certification expert. The following exam question has wording issues or is incomplete. Rewrite it clearly and completely.

Original Question: ${question.text}
Original Options:\n${optionsText}
Correct Answer: ${question.correct}
Domain: ${question.domain}
Certification: ${certId}

Rules:
- Keep the same AWS technical concept and correct answer
- Fix any garbled text, artifacts, or incomplete sentences
- Complete any truncated options
- Keep the same difficulty level and domain
- Do NOT change which option is correct

Return ONLY a JSON object in this exact format:
{
  "text": "The rewritten question text",
  "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
  "explanation": "3-5 sentence explanation of why the correct answer is right.",
  "resources": [
    { "type": "📖 AWS Docs", "url": "https://docs.aws.amazon.com/..." }
  ]
}

Return ONLY the JSON object. No other text.`;

      const aiText = await invokeModel(prompt, 2000);
      const jsonStr = aiText.substring(aiText.indexOf('{'), aiText.lastIndexOf('}') + 1);
      const fixed = JSON.parse(jsonStr);

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com", "Content-Type": "application/json" },
        body: JSON.stringify(fixed)
      };
    }

    // ── GENERATE MODE (default) ───────────────────────────────────────────────
    if (!certId || !BLUEPRINTS[certId]) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com" },
        body: JSON.stringify({ error: "Valid certId is required" })
      };
    }

    const blueprint = BLUEPRINTS[certId];
    const targetDomain = domain || blueprint.domains[Math.floor(Math.random() * blueprint.domains.length)].name;

    const generatePrompt = `You are an elite AWS Certification Psychometrician specializing in ${blueprint.name} (${certId}).
Generate ${count} high-fidelity exam question(s) for domain: ${targetDomain}.
${topic ? `Focus topic: ${topic}` : ''}
${context ? `Context: ${context}` : ''}

Return ONLY a JSON array of question objects:
[{
  "q_id": "unique_id",
  "cert_id": "${certId}",
  "type": "QUESTION",
  "domain": "${targetDomain}",
  "text": "scenario-based question",
  "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
  "correct": "A|B|C|D",
  "explanation": "Detailed explanation of correct and incorrect answers.",
  "resources": [{ "type": "📖 AWS Docs", "url": "https://docs.aws.amazon.com/..." }]
}]`;

    const aiText = await invokeModel(generatePrompt);
    const questions = JSON.parse(aiText.substring(aiText.indexOf('['), aiText.lastIndexOf(']') + 1));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com", "Content-Type": "application/json" },
      body: JSON.stringify({ questions })
    };

  } catch (error) {
    console.error("AI Generation Error:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com" },
      body: JSON.stringify({ error: "Failed to generate content", details: error.message })
    };
  }
};
