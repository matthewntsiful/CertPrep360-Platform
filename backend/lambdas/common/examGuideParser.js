/**
 * ExamGuideParser — downloads AWS exam guide PDFs from S3, extracts structured
 * domain/task/service data using Claude AI, and caches results in DynamoDB with a 30-day TTL.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 8.1, 8.3
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { readFile } from 'fs/promises';
import pdfParse from 'pdf-parse';
import { docClient } from './db.js';

// ── Configuration ─────────────────────────────────────────────────────────────

/**
 * Mapping of certification IDs to their S3 PDF paths.
 * Adding a new certification requires only adding an entry here (Req 8.1).
 */
export const GUIDE_MAP = {
  'SAA-C03': 'exam-guides/SAA-C03.pdf',
  'CLF-C02': 'exam-guides/CLF-C02.pdf',
  'AIF-C01': 'exam-guides/AIF-C01.pdf',
  'DVA-C02': 'exam-guides/DVA-C02.pdf',
  'SAP-C02': 'exam-guides/SAP-C02.pdf',
  'DOP-C02': 'exam-guides/DOP-C02.pdf',
  'SCS-C02': 'exam-guides/SCS-C02.pdf',
  'ANS-C01': 'exam-guides/ANS-C01.pdf',
  'COE-C01': 'exam-guides/COE-C01.pdf',
  'DEA-C01': 'exam-guides/DEA-C01.pdf',
  'MLE-C01': 'exam-guides/MLE-C01.pdf',
  'GDP-C01': 'exam-guides/GDP-C01.pdf',
};

const TABLE_NAME = process.env.TABLE_NAME || 'CertPrep360-Dev-Main';
const BUCKET_NAME = process.env.EXAM_GUIDES_BUCKET || 'certprep360-dev-assets';
const TTL_DAYS = 30;

const s3Client = new S3Client({});
const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });

// ── S3 Download ───────────────────────────────────────────────────────────────

/**
 * Downloads the exam guide PDF for a given certId from S3 to Lambda /tmp.
 *
 * @param {string} certId - The certification ID (e.g. 'SAA-C03')
 * @returns {Promise<string>} The local file path of the downloaded PDF
 * @throws {{ certId, reason }} if the PDF is not found or download fails
 */
export async function downloadPdf(certId) {
  const s3Key = GUIDE_MAP[certId];
  if (!s3Key) {
    throw { certId, reason: `No PDF mapping found for certId '${certId}'` };
  }

  const localPath = `/tmp/${certId}.pdf`;

  let response;
  try {
    response = await s3Client.send(
      new GetObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key })
    );
  } catch (err) {
    throw {
      certId,
      reason: `Failed to download PDF from S3 (${BUCKET_NAME}/${s3Key}): ${err.message}`,
    };
  }

  try {
    await pipeline(response.Body, createWriteStream(localPath));
  } catch (err) {
    throw {
      certId,
      reason: `Failed to write PDF to ${localPath}: ${err.message}`,
    };
  }

  return localPath;
}

// ── Text Extraction ───────────────────────────────────────────────────────────

/**
 * Extracts raw text from a PDF file using pdf-parse.
 *
 * @param {string} pdfPath - Absolute path to the PDF file
 * @returns {Promise<string>} The extracted text content
 * @throws {{ reason }} if the file cannot be read or parsed
 */
export async function extractText(pdfPath) {
  let buffer;
  try {
    buffer = await readFile(pdfPath);
  } catch (err) {
    throw { reason: `Cannot read PDF file at ${pdfPath}: ${err.message}` };
  }

  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (err) {
    throw { reason: `pdf-parse failed on ${pdfPath}: ${err.message}` };
  }
}

// ── AI-Powered Extraction ─────────────────────────────────────────────────────

/**
 * Uses Claude to extract structured exam guide data from raw PDF text.
 * This approach handles any PDF layout variation across different cert guides.
 *
 * @param {string} text - Raw text extracted from the exam guide PDF
 * @param {string} certId - The certification ID for context
 * @returns {Promise<{ domains: Array, inScopeServices: string[], outOfScopeServices: string[] }>}
 */
async function extractWithClaude(text, certId) {
  // Truncate text to fit within Claude's context (keep first ~40000 chars which covers all domains + services for a 26-page guide)
  const truncatedText = text.length > 40000 ? text.substring(0, 40000) : text;

  const prompt = `You are analyzing an AWS certification exam guide PDF. Extract the structured data from this document.

EXAM GUIDE TEXT:
${truncatedText}

Extract and return a JSON object with this exact structure:
{
  "domains": [
    {
      "name": "exact domain name from the document (e.g. 'Design Secure Architectures')",
      "weight": 0.30,
      "task_statements": [
        {
          "id": "1.1",
          "text": "exact task statement text",
          "services": ["Amazon IAM", "AWS STS"]
        }
      ]
    }
  ],
  "inScopeServices": ["Amazon S3", "Amazon EC2", "AWS Lambda"],
  "outOfScopeServices": ["Amazon SimpleDB", "AWS IoT Core"]
}

RULES:
1. Extract ALL domains with their exact percentage weights as decimals (30% = 0.30)
2. Extract ALL task statements under each domain with their IDs (e.g. 1.1, 1.2, 2.1)
3. For each task statement, list AWS services mentioned in its knowledge/skills section
4. Extract ALL in-scope AWS services listed in the "In-Scope AWS Services" section
5. Extract ALL out-of-scope AWS services listed in the "Out-of-Scope AWS Services" section
6. If a section is not present, return an empty array for that field
7. Service names must start with "Amazon" or "AWS"

Return ONLY the JSON object. No other text.`;

  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
  };

  const command = new InvokeModelCommand({
    modelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  });

  const response = await bedrockClient.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  const aiText = result.content[0].text;

  // Extract JSON from response
  const jsonStr = aiText.substring(aiText.indexOf('{'), aiText.lastIndexOf('}') + 1);
  const extracted = JSON.parse(jsonStr);

  return {
    domains: extracted.domains || [],
    inScopeServices: extracted.inScopeServices || [],
    outOfScopeServices: extracted.outOfScopeServices || [],
  };
}

// ── Legacy regex helpers (kept for unit tests, not used in production) ────────

export function parseDomains(text) {
  // Kept for backward compatibility with unit tests
  // Production code uses extractWithClaude instead
  const lines = text.split(/\r?\n/);
  const domainLineRegex = /^[•\s\u2022\-]*(?:Content\s+)?Domain\s+(\d+)\s*:\s*(.+?)(?:\s*\(([\d.]+)\s*%[^)]*\))?\s*$/i;
  const weightMap = new Map();
  const domainEntries = [];

  for (let i = 0; i < lines.length; i++) {
    const m = domainLineRegex.exec(lines[i].trim());
    if (!m) continue;
    const number = parseInt(m[1], 10);
    let name = m[2].trim().replace(/\s*\([\d.]+\s*%[^)]*\)\s*$/, '').replace(/\s*\d+$/, '').trim();
    const inlineWeight = m[3] ? parseFloat(m[3]) / 100 : null;
    if (inlineWeight) weightMap.set(number, inlineWeight);
    domainEntries.push({ lineIndex: i, number, name, inlineWeight });
  }

  if (domainEntries.length === 0) return [];

  const byNumber = new Map();
  for (const entry of domainEntries) byNumber.set(entry.number, entry);
  const uniqueDomains = Array.from(byNumber.values()).sort((a, b) => a.lineIndex - b.lineIndex);
  const domains = [];

  for (let i = 0; i < uniqueDomains.length; i++) {
    const entry = uniqueDomains[i];
    const nextLineIndex = i + 1 < uniqueDomains.length ? uniqueDomains[i + 1].lineIndex : lines.length;
    const sectionLines = lines.slice(entry.lineIndex + 1, nextLineIndex);
    const sectionText = sectionLines.join('\n');
    let weight = weightMap.get(entry.number) || 0;
    if (!weight) {
      for (let j = 0; j < Math.min(10, sectionLines.length); j++) {
        const wm = /\(([\d.]+)\s*%/.exec(sectionLines[j]);
        if (wm) { weight = parseFloat(wm[1]) / 100; break; }
      }
    }
    const taskStatements = parseTaskStatements(sectionText, entry.number);
    domains.push({ name: entry.name, weight, task_statements: taskStatements });
  }
  return domains;
}

function parseTaskStatements(sectionText, domainNumber) {
  const lines = sectionText.split(/\r?\n/);
  const taskLineRegex = /^[•\s\u2022\-]*Task\s+(\d+\.\d+)\s*[:\-\u2013\u2014]\s*(.+)$/i;
  const taskMatches = [];
  for (let i = 0; i < lines.length; i++) {
    const m = taskLineRegex.exec(lines[i].trim());
    if (!m) continue;
    taskMatches.push({ lineIndex: i, id: m[1].trim(), text: m[2].trim() });
  }
  const result = [];
  for (let i = 0; i < taskMatches.length; i++) {
    const task = taskMatches[i];
    const nextLineIndex = i + 1 < taskMatches.length ? taskMatches[i + 1].lineIndex : lines.length;
    const bodyText = lines.slice(task.lineIndex + 1, nextLineIndex).join('\n');
    const serviceRegex = /(?:Amazon|AWS)\s+[A-Z][A-Za-z0-9\s\-]+(?=[\s,.()\n])/g;
    const services = new Set();
    let sm;
    while ((sm = serviceRegex.exec(bodyText)) !== null) {
      const name = sm[0].trim().replace(/\s+/g, ' ');
      if (name.length < 60) services.add(name);
    }
    result.push({ id: task.id, text: task.text.replace(/\.$/, ''), services: Array.from(services) });
  }
  return result;
}

export function parseServices(text) {
  // Kept for backward compatibility with unit tests
  const inScope = extractServiceSectionRegex(text, /in[\s\-]*scope\s+aws\s+services/i);
  const outOfScope = extractServiceSectionRegex(text, /out[\s\-]*of[\s\-]*scope\s+aws\s+services/i);
  return { inScope, outOfScope };
}

function extractServiceSectionRegex(text, sectionKeyword) {
  const lines = text.split(/\r?\n/);
  let sectionStartLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/\.{5,}/.test(trimmed)) continue;
    if (sectionKeyword.test(trimmed)) { sectionStartLine = i + 1; break; }
  }
  if (sectionStartLine === -1) return [];
  const nextSectionRegex = /^(?:out[\s\-]*of[\s\-]*scope\s+aws|in[\s\-]*scope\s+aws|content\s+domain|appendix|technologies|mentions\s+of\s+aws|survey)/i;
  let sectionEndLine = lines.length;
  for (let i = sectionStartLine; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/\.{5,}/.test(trimmed)) continue;
    if (nextSectionRegex.test(trimmed)) { sectionEndLine = i; break; }
  }
  const services = new Set();
  for (const rawLine of lines.slice(sectionStartLine, sectionEndLine)) {
    const line = rawLine.replace(/^[\s•\u2022\-]+/, '').trim();
    if (!line || line.length > 120 || /^\d+$/.test(line)) continue;
    if (/^(?:Amazon|AWS)\s+\S/.test(line)) {
      services.add(line.replace(/\s*\d+$/, '').trim());
    }
  }
  return Array.from(services);
}

// ── DynamoDB Cache ────────────────────────────────────────────────────────────

/**
 * Writes parsed exam guide data to DynamoDB with a 30-day TTL.
 *
 * Item key: PK=EXAM_GUIDE#<certId>, SK=METADATA
 *
 * @param {string} certId
 * @param {{ domains: Array, inScopeServices: string[], outOfScopeServices: string[] }} guideData
 * @returns {Promise<void>}
 */
export async function cacheGuide(certId, guideData) {
  const ttl = Math.floor(Date.now() / 1000) + TTL_DAYS * 24 * 60 * 60;

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `EXAM_GUIDE#${certId}`,
        SK: 'METADATA',
        cert_id: certId,
        parsed_at: new Date().toISOString(),
        domains: guideData.domains,
        in_scope_services: guideData.inScopeServices,
        out_of_scope_services: guideData.outOfScopeServices,
        ttl,
      },
    })
  );
}

/**
 * Reads a cached exam guide from DynamoDB.
 *
 * @param {string} certId
 * @returns {Promise<object|null>} The cached item, or null on cache miss
 */
export async function getCachedGuide(certId) {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `EXAM_GUIDE#${certId}`,
        SK: 'METADATA',
      },
    })
  );

  if (!result.Item) return null;

  // Check TTL manually (DynamoDB TTL deletion is eventually consistent)
  const now = Math.floor(Date.now() / 1000);
  if (result.Item.ttl && result.Item.ttl < now) return null;

  return result.Item;
}

// ── Main Entry Point ──────────────────────────────────────────────────────────

/**
 * Returns the parsed exam guide for a given certId.
 *
 * Checks the DynamoDB cache first (Req 1.5). On a cache miss, downloads the PDF
 * from S3, parses it, caches the result, and returns it (Req 1.4).
 *
 * Throws a structured error if the certId is unknown or the PDF cannot be
 * read/parsed (Req 1.3).
 *
 * @param {string} certId - The certification ID (e.g. 'SAA-C03')
 * @returns {Promise<{
 *   cert_id: string,
 *   parsed_at: string,
 *   domains: Array,
 *   in_scope_services: string[],
 *   out_of_scope_services: string[],
 *   ttl: number
 * }>}
 * @throws {{ certId, reason }} on failure
 */
export async function getExamGuide(certId) {
  // Validate certId
  if (!GUIDE_MAP[certId]) {
    throw {
      certId,
      reason: `Unknown certId '${certId}'. Supported IDs: ${Object.keys(GUIDE_MAP).join(', ')}`,
    };
  }

  // 1. Check cache (Req 1.5)
  const cached = await getCachedGuide(certId);
  if (cached) return cached;

  // 2. Download PDF from S3 (Req 1.1, 1.2)
  const pdfPath = await downloadPdf(certId); // throws { certId, reason } on failure

  // 3. Extract text
  let text;
  try {
    text = await extractText(pdfPath);
  } catch (err) {
    throw { certId, reason: err.reason || String(err) };
  }

  // 4. Parse domains and services using Claude AI
  let domains, inScopeServices, outOfScopeServices;
  try {
    const extracted = await extractWithClaude(text, certId);
    domains = extracted.domains;
    inScopeServices = extracted.inScopeServices;
    // Req 8.3: treat out-of-scope list as empty if not found — do not block generation
    outOfScopeServices = extracted.outOfScopeServices;
  } catch (err) {
    throw {
      certId,
      reason: `Failed to extract exam guide content with Claude: ${err.message || String(err)}`,
    };
  }

  const guideData = { domains, inScopeServices, outOfScopeServices };

  // 5. Cache the result (Req 1.4)
  await cacheGuide(certId, guideData);

  // Return in the same shape as the cached item
  return {
    PK: `EXAM_GUIDE#${certId}`,
    SK: 'METADATA',
    cert_id: certId,
    parsed_at: new Date().toISOString(),
    domains,
    in_scope_services: inScopeServices,
    out_of_scope_services: outOfScopeServices,
    ttl: Math.floor(Date.now() / 1000) + TTL_DAYS * 24 * 60 * 60,
  };
}
