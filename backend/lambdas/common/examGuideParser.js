/**
 * ExamGuideParser — downloads AWS exam guide PDFs from S3, extracts structured
 * domain/task/service data, and caches results in DynamoDB with a 30-day TTL.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 8.1, 8.3
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
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

// ── Domain Parsing ────────────────────────────────────────────────────────────

/**
 * Parses domain names, percentage weights, and task statements from raw PDF text.
 *
 * AWS exam guides follow a consistent structure:
 *   "Domain 1: Design Secure Architectures"  (standalone section header line)
 *   "30%"  (weight on next line, or inline as "(30% of scored content)")
 *   "Task Statement 1.1: Design secure access to AWS resources."
 *
 * The content outline at the top of the guide also lists domains as bullet points
 * like "• Domain 1: Design Secure Architectures (30% of scored content)" — these
 * are deduplicated by keeping only the LAST occurrence of each domain number,
 * which is the actual section header.
 *
 * @param {string} text - Raw text extracted from the exam guide PDF
 * @returns {Array<{name: string, weight: number, task_statements: Array<{id: string, text: string, services: string[]}>}>}
 */
export function parseDomains(text) {
  const lines = text.split(/\r?\n/);

  // Match any line containing "Domain N: Name" (with optional leading bullets/spaces)
  // Capture: domain number, name, optional inline weight
  const domainLineRegex =
    /^[\s\u2022\u2023\u25E6\u2043\u2219\u00B7\u25AA\u25AB\u25CF\u25CB\u25A0\u25A1\u2013\u2014\-*]*Domain\s+(\d+)\s*:\s*(.+?)(?:\s*\(?([\d.]+)\s*%[^)]*\)?)?\s*$/i;

  const domainEntries = [];
  for (let i = 0; i < lines.length; i++) {
    const m = domainLineRegex.exec(lines[i]);
    if (!m) continue;

    const number = parseInt(m[1], 10);
    // Strip trailing parenthetical weight like "(30% of scored content)"
    let name = m[2].trim().replace(/\s*\([\d.]+\s*%[^)]*\)\s*$/, '').trim();
    const inlineWeight = m[3] ? parseFloat(m[3]) / 100 : null;

    domainEntries.push({ lineIndex: i, number, name, inlineWeight });
  }

  if (domainEntries.length === 0) return [];

  // Deduplicate: keep only the LAST occurrence of each domain number.
  // Content outline entries appear earlier; actual section headers appear later.
  const byNumber = new Map();
  for (const entry of domainEntries) {
    byNumber.set(entry.number, entry);
  }

  // Sort by line index to maintain document order
  const uniqueDomains = Array.from(byNumber.values()).sort(
    (a, b) => a.lineIndex - b.lineIndex
  );

  const domains = [];

  for (let i = 0; i < uniqueDomains.length; i++) {
    const entry = uniqueDomains[i];
    const nextLineIndex =
      i + 1 < uniqueDomains.length ? uniqueDomains[i + 1].lineIndex : lines.length;

    // Lines belonging to this domain section
    const sectionLines = lines.slice(entry.lineIndex + 1, nextLineIndex);
    const sectionText = sectionLines.join('\n');

    // Determine weight: from inline capture or scan the first few lines of the section
    let weight = entry.inlineWeight || 0;
    if (!weight) {
      for (let j = 0; j < Math.min(5, sectionLines.length); j++) {
        const wm = /^\s*([\d.]+)\s*%/.exec(sectionLines[j]);
        if (wm) {
          weight = parseFloat(wm[1]) / 100;
          break;
        }
      }
    }

    // Extract task statements
    const taskStatements = parseTaskStatements(sectionText, entry.number);

    domains.push({ name: entry.name, weight, task_statements: taskStatements });
  }

  return domains;
}

/**
 * Extracts task statements from a domain section of text.
 *
 * @param {string} sectionText - Text belonging to a single domain
 * @param {number} domainNumber - The domain number (for context)
 * @returns {Array<{id: string, text: string, services: string[]}>}
 */
function parseTaskStatements(sectionText, domainNumber) {
  const taskStatements = [];
  const lines = sectionText.split(/\r?\n/);

  // Match lines like "Task Statement 1.1: Design secure access to AWS resources."
  // Also handles "Task Statement 1.1 Design ..." (no colon)
  const taskLineRegex =
    /^[\s]*Task\s+Statement\s+(\d+\.\d+)\s*[:\-\u2013\u2014]?\s*(.+)$/i;

  const taskMatches = [];
  for (let i = 0; i < lines.length; i++) {
    const m = taskLineRegex.exec(lines[i]);
    if (!m) continue;
    taskMatches.push({
      lineIndex: i,
      id: m[1].trim(),
      text: m[2].trim(),
    });
  }

  for (let i = 0; i < taskMatches.length; i++) {
    const task = taskMatches[i];
    const nextLineIndex =
      i + 1 < taskMatches.length ? taskMatches[i + 1].lineIndex : lines.length;

    // Body lines for this task statement
    const bodyLines = lines.slice(task.lineIndex + 1, nextLineIndex);
    const bodyText = bodyLines.join('\n');

    // Extract any AWS service names mentioned in the task body
    const services = extractServicesFromText(bodyText);

    taskStatements.push({
      id: task.id,
      text: task.text.replace(/\.$/, ''), // strip trailing period
      services,
    });
  }

  return taskStatements;
}

/**
 * Extracts AWS service names mentioned inline in a block of text.
 * Uses a heuristic: "Amazon X" or "AWS X" patterns.
 *
 * @param {string} text
 * @returns {string[]}
 */
function extractServicesFromText(text) {
  const serviceRegex = /(?:Amazon|AWS)\s+[A-Z][A-Za-z0-9\s\-]+(?=[\s,.()\n])/g;
  const found = new Set();
  let sm;
  while ((sm = serviceRegex.exec(text)) !== null) {
    const name = sm[0].trim().replace(/\s+/g, ' ');
    if (name.length < 60) found.add(name);
  }
  return Array.from(found);
}

// ── Service Parsing ───────────────────────────────────────────────────────────

/**
 * Parses in-scope and out-of-scope service lists from raw PDF text.
 *
 * AWS exam guides include appendix sections like:
 *   "In-scope AWS services and features"
 *   "Out-of-scope AWS services and features"
 *
 * Each section contains a list of service names, often grouped by category.
 *
 * @param {string} text - Raw text extracted from the exam guide PDF
 * @returns {{ inScope: string[], outOfScope: string[] }}
 */
export function parseServices(text) {
  const inScope = extractServiceSection(text, /in[\s\-]*scope/i);
  const outOfScope = extractServiceSection(text, /out[\s\-]*of[\s\-]*scope/i);
  return { inScope, outOfScope };
}

/**
 * Finds a service list section by its header keyword and extracts service names.
 *
 * @param {string} text - Full PDF text
 * @param {RegExp} sectionKeyword - Regex to identify the section header
 * @returns {string[]}
 */
function extractServiceSection(text, sectionKeyword) {
  const lines = text.split(/\r?\n/);

  // Find the line index of the section header.
  // The header line contains the keyword AND typically "AWS services" or "services and features".
  let sectionStartLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      sectionKeyword.test(line) &&
      /(?:AWS\s+services?|services?\s+and\s+features?)/i.test(line)
    ) {
      sectionStartLine = i + 1; // content starts on the next line
      break;
    }
  }

  if (sectionStartLine === -1) return [];

  // The section ends when we hit another SECTION HEADER (not just any line containing
  // the keyword). A section header must contain "AWS services" or "services and features"
  // in addition to the keyword, OR be a domain header, OR be "Appendix".
  const sectionHeaderRegex =
    /^(?:(?:in[\s\-]*scope|out[\s\-]*of[\s\-]*scope).*(?:AWS\s+services?|services?\s+and\s+features?)|appendix|domain\s+\d+)/i;

  let sectionEndLine = lines.length;
  for (let i = sectionStartLine; i < lines.length; i++) {
    if (sectionHeaderRegex.test(lines[i].trim())) {
      sectionEndLine = i;
      break;
    }
  }

  const sectionLines = lines.slice(sectionStartLine, sectionEndLine);
  return parseServiceLines(sectionLines);
}

/**
 * Parses individual service names from an array of lines.
 * Handles bullet-point lists, category headers, and plain line-separated lists.
 *
 * @param {string[]} lines
 * @returns {string[]}
 */
function parseServiceLines(lines) {
  const services = new Set();

  for (const rawLine of lines) {
    // Strip leading bullets and whitespace
    const line = rawLine
      .replace(/^[\s\u2022\u2023\u25E6\u2043\u2219\u00B7\u25AA\u25AB\u25CF\u25CB\u25A0\u25A1\u2013\u2014\-*]+/, '')
      .trim();

    if (!line) continue;

    // Skip category headers: all-caps lines (e.g. "Analytics:", "Compute:")
    if (/^[A-Z][A-Z\s&\/\-]+:?\s*$/.test(line)) continue;

    // Skip lines that are just page numbers
    if (/^\d+$/.test(line)) continue;

    // Skip lines that are too long to be a service name
    if (line.length > 120) continue;

    // Skip lines that look like descriptive sentences (contain lowercase words mid-sentence)
    if (/[a-z]{4,}\s+[a-z]{4,}/.test(line) && !/^(?:Amazon|AWS)\s/.test(line)) continue;

    // Accept lines that look like service names:
    // - Start with "Amazon" or "AWS"
    // - Or are short capitalized phrases (e.g. "EC2", "S3", "Lambda")
    if (
      /^(?:Amazon|AWS)\s+\S/.test(line) ||
      /^[A-Z][A-Za-z0-9\s\-\/().]+$/.test(line)
    ) {
      const cleaned = line.replace(/\s+/g, ' ').trim();
      if (cleaned.length >= 2 && cleaned.length <= 100) {
        services.add(cleaned);
      }
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

  // 4. Parse domains and services
  let domains, inScopeServices, outOfScopeServices;
  try {
    domains = parseDomains(text);
    const services = parseServices(text);
    inScopeServices = services.inScope;
    // Req 8.3: treat out-of-scope list as empty if not found — do not block generation
    outOfScopeServices = services.outOfScope;
  } catch (err) {
    throw {
      certId,
      reason: `Failed to parse exam guide content: ${err.message || String(err)}`,
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
