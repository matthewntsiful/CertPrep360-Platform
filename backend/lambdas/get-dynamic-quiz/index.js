import { QueryCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./common/db.js";
import { selectAndAllocate } from "./common/adaptiveSelection.js";
import { getScheduledQuestions } from "./common/spacedScheduler.js";
import { computeDomainScores } from "./common/domainScoring.js";

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
    console.log("Event:", JSON.stringify(event, null, 2));

    const headers = {
        "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com",
        "Content-Type": "application/json",
    };

    const mode = event.queryStringParameters?.mode || null;
    const domainParam = event.queryStringParameters?.domain || null;
    const certId = (event.queryStringParameters?.certId || "SAA-C03").toUpperCase();
    const limit = parseInt(event.queryStringParameters?.limit || "20", 10);
    const excludeIds = event.queryStringParameters?.exclude
        ? event.queryStringParameters.exclude.split(',')
        : [];

    // Determine the quiz mode
    const isAdaptive = mode === "adaptive";
    const isMultiDomain = domainParam && domainParam.includes(",");

    // For single-domain mode (original behavior), domain is required unless adaptive
    if (!domainParam && !isAdaptive) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: "Missing required query string parameter: domain or mode=adaptive" }),
        };
    }

    // Get userId from Cognito authorizer (optional for backward compatibility)
    const userId = event.requestContext?.authorizer?.claims?.sub || null;

    try {
        let questions = [];
        let selectedDomains = [];
        let resolvedMode = "single-domain";
        let weakPoolIncluded = 0;

        if (isAdaptive) {
            // Adaptive mode: identify weak domains and distribute questions
            resolvedMode = "adaptive";
            const result = await handleAdaptiveMode(userId, certId, limit, excludeIds);
            questions = result.questions;
            selectedDomains = result.domains;
            weakPoolIncluded = result.weakPoolIncluded;

            // If adaptive fell back to all domains, note it
            if (result.fallback) {
                resolvedMode = "adaptive";
            }
        } else if (isMultiDomain) {
            // Multi-domain mode: explicit comma-separated domain list
            resolvedMode = "multi-domain";
            const domains = domainParam.split(",").map(d => decodeURIComponent(d.trim()));
            const result = await handleMultiDomainMode(userId, certId, limit, excludeIds, domains);
            questions = result.questions;
            selectedDomains = result.domains;
            weakPoolIncluded = result.weakPoolIncluded;
        } else {
            // Single-domain mode (original behavior)
            resolvedMode = "single-domain";
            const decodedDomain = decodeURIComponent(domainParam);
            selectedDomains = [decodedDomain];
            const result = await handleSingleDomainMode(userId, certId, limit, excludeIds, decodedDomain);
            questions = result.questions;
            weakPoolIncluded = result.weakPoolIncluded;
        }

        // Clean response — only send what the frontend needs
        const cleanQuestions = questions.map(q => ({
            q_id: q.q_id,
            cert_id: q.cert_id,
            exam_id: q.exam_id,
            text: q.text,
            options: q.options,
            correct: typeof q.correct === 'string'
                ? q.correct.toUpperCase().split(/[,\s]+/).filter(c => /^[A-Z]$/.test(c)).join('')
                : q.correct,
            explanation: q.explanation || "",
            resources: q.resources || [],
            domain: q.domain,
            primary_service: q.primary_service,
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                mode: resolvedMode,
                domains: selectedDomains,
                count: cleanQuestions.length,
                totalAvailable: cleanQuestions.length,
                weakPoolIncluded,
                questions: cleanQuestions,
            }),
        };
    } catch (error) {
        console.error("Error fetching dynamic quiz:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};

/**
 * Handle adaptive mode: identify weak domains, allocate questions, mix in Weak Pool.
 */
async function handleAdaptiveMode(userId, certId, limit, excludeIds) {
    // Get user's domain performance data
    const domainScores = userId ? await getUserDomainPerformance(userId, certId) : {};

    // Check if user has enough domain data (< 2 domains → fall back to all)
    const domainCount = Object.keys(domainScores).length;
    let fallback = false;
    let domains;
    let allocation;

    if (domainCount < 2) {
        // Fall back to all available domains for this cert
        fallback = true;
        const allDomains = await getAllDomainsForCert(certId);
        domains = allDomains;
        // Even distribution when falling back
        const perDomain = Math.max(1, Math.floor(limit / Math.max(domains.length, 1)));
        allocation = {};
        for (const d of domains) {
            allocation[d] = perDomain;
        }
    } else {
        // Use adaptive selection to identify weak domains and allocate
        const result = selectAndAllocate(domainScores, limit);
        domains = result.domains;
        allocation = result.allocation;
    }

    // Fetch Weak Pool scheduled questions and increment session counter
    let weakPoolQuestions = [];
    if (userId) {
        weakPoolQuestions = await getAndScheduleWeakPool(userId, certId);
    }

    // Fetch questions for each domain based on allocation
    const excludeSet = new Set(excludeIds);
    // Also exclude weak pool question IDs from domain fetch to avoid duplicates
    const weakPoolIds = new Set(weakPoolQuestions.map(q => q.q_id));
    for (const id of weakPoolIds) {
        excludeSet.add(id);
    }

    let domainQuestions = [];
    for (const domain of domains) {
        const domainLimit = allocation[domain] || 0;
        if (domainLimit <= 0) continue;

        const fetched = await fetchQuestionsForDomain(domain, certId, domainLimit, excludeSet);
        domainQuestions.push(...fetched);

        // Add fetched IDs to exclude set to avoid cross-domain duplicates
        for (const q of fetched) {
            excludeSet.add(q.q_id);
        }
    }

    // Mix in Weak Pool questions (up to remaining capacity)
    const remainingCapacity = Math.max(0, limit - domainQuestions.length);
    const includedWeakPool = weakPoolQuestions.slice(0, remainingCapacity);

    // Combine and shuffle
    const allQuestions = [...domainQuestions, ...includedWeakPool];
    shuffle(allQuestions);

    return {
        questions: allQuestions.slice(0, limit),
        domains,
        weakPoolIncluded: includedWeakPool.length,
        fallback,
    };
}

/**
 * Handle multi-domain mode: explicit domain list with inverse weighting.
 */
async function handleMultiDomainMode(userId, certId, limit, excludeIds, domains) {
    // Get user's domain performance for weighting (if available)
    const domainScores = userId ? await getUserDomainPerformance(userId, certId) : {};

    // Use selectAndAllocate with explicit domains
    const { allocation } = selectAndAllocate(domainScores, limit, domains);

    // Fetch Weak Pool scheduled questions and increment session counter
    let weakPoolQuestions = [];
    if (userId) {
        weakPoolQuestions = await getAndScheduleWeakPool(userId, certId);
    }

    // Fetch questions for each domain
    const excludeSet = new Set(excludeIds);
    const weakPoolIds = new Set(weakPoolQuestions.map(q => q.q_id));
    for (const id of weakPoolIds) {
        excludeSet.add(id);
    }

    let domainQuestions = [];
    for (const domain of domains) {
        const domainLimit = allocation[domain] || 0;
        if (domainLimit <= 0) continue;

        const fetched = await fetchQuestionsForDomain(domain, certId, domainLimit, excludeSet);
        domainQuestions.push(...fetched);

        for (const q of fetched) {
            excludeSet.add(q.q_id);
        }
    }

    // Mix in Weak Pool questions
    const remainingCapacity = Math.max(0, limit - domainQuestions.length);
    const includedWeakPool = weakPoolQuestions.slice(0, remainingCapacity);

    const allQuestions = [...domainQuestions, ...includedWeakPool];
    shuffle(allQuestions);

    return {
        questions: allQuestions.slice(0, limit),
        domains,
        weakPoolIncluded: includedWeakPool.length,
    };
}

/**
 * Handle single-domain mode (original behavior, enhanced with Weak Pool).
 */
async function handleSingleDomainMode(userId, certId, limit, excludeIds, domain) {
    // Fetch Weak Pool scheduled questions and increment session counter
    let weakPoolQuestions = [];
    if (userId) {
        weakPoolQuestions = await getAndScheduleWeakPool(userId, certId);
        // Filter weak pool to only include questions from this domain
        weakPoolQuestions = weakPoolQuestions.filter(q => q.domain === domain);
    }

    const excludeSet = new Set(excludeIds);
    const weakPoolIds = new Set(weakPoolQuestions.map(q => q.q_id));
    for (const id of weakPoolIds) {
        excludeSet.add(id);
    }

    // Fetch domain questions (reduced by weak pool count to maintain total limit)
    const domainLimit = Math.max(0, limit - weakPoolQuestions.length);
    const domainQuestions = await fetchQuestionsForDomain(domain, certId, domainLimit, excludeSet);

    // Combine and shuffle
    const weakPoolToInclude = Math.max(0, limit - domainQuestions.length);
    const includedWeakPool = weakPoolQuestions.slice(0, weakPoolToInclude);
    const allQuestions = [...domainQuestions, ...includedWeakPool];
    shuffle(allQuestions);

    return {
        questions: allQuestions.slice(0, limit),
        weakPoolIncluded: includedWeakPool.length,
    };
}

/**
 * Fetch the user's domain performance by querying their attempt records.
 * Returns a map of domain → accuracy percentage.
 */
async function getUserDomainPerformance(userId, certId) {
    try {
        // Query all attempts for this user and cert
        const attempts = [];
        let lastKey;

        do {
            const command = new QueryCommand({
                TableName: TABLE_NAME,
                KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
                FilterExpression: "certId = :certId",
                ExpressionAttributeValues: {
                    ":pk": `USER#${userId}`,
                    ":skPrefix": "ATTEMPT#",
                    ":certId": certId,
                },
                ExclusiveStartKey: lastKey,
            });
            const response = await docClient.send(command);
            attempts.push(...(response.Items || []));
            lastKey = response.LastEvaluatedKey;
        } while (lastKey);

        // If attempts have pre-computed domainScores, aggregate them
        // Otherwise compute from answers
        const aggregatedDomainStats = {};

        for (const attempt of attempts) {
            if (attempt.domainScores) {
                // Use pre-computed domain scores (weighted by attempt)
                for (const [domain, score] of Object.entries(attempt.domainScores)) {
                    if (!aggregatedDomainStats[domain]) {
                        aggregatedDomainStats[domain] = { totalScore: 0, count: 0 };
                    }
                    aggregatedDomainStats[domain].totalScore += score;
                    aggregatedDomainStats[domain].count += 1;
                }
            } else if (attempt.answers) {
                // Compute from raw answers
                const scores = computeDomainScores(attempt.answers);
                for (const [domain, score] of Object.entries(scores)) {
                    if (!aggregatedDomainStats[domain]) {
                        aggregatedDomainStats[domain] = { totalScore: 0, count: 0 };
                    }
                    aggregatedDomainStats[domain].totalScore += score;
                    aggregatedDomainStats[domain].count += 1;
                }
            }
        }

        // Average the scores across attempts
        const domainPerformance = {};
        for (const [domain, stats] of Object.entries(aggregatedDomainStats)) {
            domainPerformance[domain] = Math.round(stats.totalScore / stats.count);
        }

        return domainPerformance;
    } catch (error) {
        console.error("Error fetching domain performance:", error);
        return {};
    }
}

/**
 * Get all available domains for a certification by querying the question bank.
 */
async function getAllDomainsForCert(certId) {
    try {
        const domains = new Set();
        let lastKey;

        do {
            const command = new ScanCommand({
                TableName: TABLE_NAME,
                FilterExpression: "#type = :qType AND begins_with(PK, :certPrefix)",
                ExpressionAttributeNames: { "#type": "type", "#domain": "domain" },
                ExpressionAttributeValues: {
                    ":qType": "QUESTION",
                    ":certPrefix": `CERT#${certId}`,
                },
                ProjectionExpression: "#domain",
                ExclusiveStartKey: lastKey,
            });
            const response = await docClient.send(command);
            for (const item of (response.Items || [])) {
                if (item.domain) domains.add(item.domain);
            }
            lastKey = response.LastEvaluatedKey;
        } while (lastKey);

        return Array.from(domains);
    } catch (error) {
        console.error("Error fetching all domains:", error);
        return [];
    }
}

/**
 * Fetch and schedule Weak Pool questions, incrementing the session counter atomically.
 * Returns full question objects for scheduled questions.
 */
async function getAndScheduleWeakPool(userId, certId) {
    const pk = `USER#${userId}`;
    const sk = `WEAK_POOL#${certId}`;

    try {
        // Atomically increment session counter and get the pool
        const updateResult = await docClient.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: pk, SK: sk },
            UpdateExpression: "ADD sessionCounter :inc",
            ExpressionAttributeValues: { ":inc": 1 },
            ReturnValues: "ALL_NEW",
        }));

        const poolItem = updateResult.Attributes;
        if (!poolItem || !poolItem.questions || Object.keys(poolItem.questions).length === 0) {
            return [];
        }

        const sessionCounter = poolItem.sessionCounter || 1;
        const now = new Date();

        // Determine which questions are scheduled for this session
        const scheduled = getScheduledQuestions(poolItem.questions, sessionCounter, now);

        if (scheduled.length === 0) {
            return [];
        }

        // Fetch the actual question content for scheduled questions
        const questionIds = scheduled.map(s => s.questionId);
        const questions = await fetchQuestionsByIds(questionIds, certId);

        return questions;
    } catch (error) {
        // If the Weak Pool item doesn't exist, the UpdateCommand will create it
        // with just sessionCounter=1. That's fine — no questions to schedule.
        if (error.name === "ConditionalCheckFailedException") {
            return [];
        }
        console.error("Error fetching Weak Pool:", error);
        return [];
    }
}

/**
 * Fetch specific questions by their IDs from the question bank.
 */
async function fetchQuestionsByIds(questionIds, certId) {
    if (questionIds.length === 0) return [];

    const questions = [];

    for (const qId of questionIds) {
        try {
            // Try to get the question by its known key pattern
            const command = new QueryCommand({
                TableName: TABLE_NAME,
                KeyConditionExpression: "PK = :pk AND SK = :sk",
                ExpressionAttributeValues: {
                    ":pk": `CERT#${certId}`,
                    ":sk": `QUESTION#${qId}`,
                },
            });
            const response = await docClient.send(command);
            if (response.Items && response.Items.length > 0) {
                questions.push(response.Items[0]);
            }
        } catch (error) {
            console.warn(`Failed to fetch question ${qId}:`, error.message);
        }
    }

    return questions;
}

/**
 * Fetch questions for a specific domain, limited to a count, excluding certain IDs.
 */
async function fetchQuestionsForDomain(domain, certId, maxCount, excludeSet) {
    if (maxCount <= 0) return [];

    let questions = [];

    // Strategy 1: Try GSI1 query (fast, indexed)
    try {
        let lastKey;
        do {
            const command = new QueryCommand({
                TableName: TABLE_NAME,
                IndexName: "GSI1",
                KeyConditionExpression: "#gpk = :pk AND begins_with(#gsk, :skPrefix)",
                ExpressionAttributeNames: {
                    "#gpk": "GSI1-PK",
                    "#gsk": "GSI1-SK",
                },
                ExpressionAttributeValues: {
                    ":pk": `DOMAIN#${domain}`,
                    ":skPrefix": `CERT#${certId}`,
                },
                ExclusiveStartKey: lastKey,
            });
            const response = await docClient.send(command);
            questions.push(...(response.Items || []));
            lastKey = response.LastEvaluatedKey;
        } while (lastKey);
    } catch (gsiError) {
        console.warn("GSI1 query failed, falling back to scan:", gsiError.message);
    }

    // Strategy 2: If GSI1 returned nothing, fall back to scanning by domain field
    if (questions.length === 0) {
        let lastKey;
        do {
            const command = new ScanCommand({
                TableName: TABLE_NAME,
                FilterExpression: "#type = :qType AND #domain = :domain AND begins_with(PK, :certPrefix)",
                ExpressionAttributeNames: {
                    "#type": "type",
                    "#domain": "domain",
                },
                ExpressionAttributeValues: {
                    ":qType": "QUESTION",
                    ":domain": domain,
                    ":certPrefix": `CERT#${certId}`,
                },
                ExclusiveStartKey: lastKey,
            });
            const response = await docClient.send(command);
            questions.push(...(response.Items || []));
            lastKey = response.LastEvaluatedKey;
        } while (lastKey);
    }

    // Deduplicate by q_id
    const seen = new Set();
    questions = questions.filter(q => {
        const id = q.q_id || q.SK;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
    });

    // Exclude previously seen questions
    if (excludeSet.size > 0) {
        questions = questions.filter(q => !excludeSet.has(q.q_id));
    }

    // Shuffle for randomization
    shuffle(questions);

    // Limit to requested count
    return questions.slice(0, maxCount);
}

/**
 * Fisher-Yates shuffle for true randomization.
 */
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
