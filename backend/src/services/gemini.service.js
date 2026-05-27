import { getGeminiClients } from '../config/gemini.js';
import * as promptBuilder from '../utils/promptBuilder.js';
import logger from '../config/logger.js';

// ─────────────────────────────────────────────────────────────────────────────
// Constants & Configuration
// ─────────────────────────────────────────────────────────────────────────────

const defaultGeminiErrorMessage =
  'Gemini AI service is currently unavailable. Please try again in a few minutes.';
const allGeminiKeysExhaustedMessage =
  'All configured Gemini API keys are currently rate-limited or out of quota. Please wait for quota reset or add another billing-enabled Gemini API key.';
const geminiNetworkErrorMessage =
  'Gemini network request failed before AI could respond. Please regenerate this insight in a moment.';

/** Ordered list of models to attempt — first entry is the preferred model. */
const MODEL_FALLBACK_CHAIN = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-pro-latest',
];

/** Maximum total retries (across key/model combos) per logical request. */
const MAX_RETRIES = 3;

// ─── Cooldown durations ──────────────────────────────────────────────────────
const DAILY_QUOTA_COOLDOWN_MS   = 24 * 60 * 60 * 1000;  // 24 h
const RPM_QUOTA_DEFAULT_MS      = 30 * 1000;             // 30 s
const UNKNOWN_QUOTA_COOLDOWN_MS = 2 * 60 * 1000;         // 2 min
const NON_QUOTA_COOLDOWN_MS     = 10 * 1000;             // 10 s

// ─── Queue / throttler ───────────────────────────────────────────────────────
const MAX_QUEUE_SIZE = 50;
const MIN_REQUEST_INTERVAL_MS = 12_000;

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-(keyIndex, modelName) cooldown.
 * cooldownMap[keyIndex][modelName] = { until: <epoch ms>, reason: <string> }
 */
const cooldownMap = {};

/**
 * Global per-model cooldown — set when ALL keys are exhausted for a model.
 * globalModelCooldown[modelName] = { until: <epoch ms> }
 */
const globalModelCooldown = {};

/** Simple FIFO request queue. */
const requestQueue = [];
let isProcessingQueue = false;
let lastRequestTime = 0;

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Strip markdown code fences and parse JSON.
 */
const cleanAndParse = (text) => {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
  }
  return JSON.parse(cleaned.trim());
};

// ─────────────────────────────────────────────────────────────────────────────
// Error classification helpers
// ─────────────────────────────────────────────────────────────────────────────

const getGeminiErrorMessage = (error) => {
  const message = String(error?.message || '');
  const lowerMessage = message.toLowerCase();

  if (message.includes('429') || lowerMessage.includes('quota')) {
    return 'Gemini daily quota is exhausted for this API key. Please wait for the quota reset or use a billing-enabled Gemini API key.';
  }
  if (lowerMessage.includes('api key')) {
    return 'Gemini API key configuration needs attention. Please verify the configured API key and try again.';
  }
  if (lowerMessage.includes('parse') || lowerMessage.includes('json')) {
    return 'Gemini returned a response that DevTrackr could not read cleanly. Please regenerate this insight.';
  }
  return defaultGeminiErrorMessage;
};

const isNetworkError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('aborted') ||
    message.includes('operation was aborted') ||
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('etimedout') ||
    message.includes('econnreset') ||
    message.includes('enotfound')
  );
};

const isRateLimitError = (error) => {
  const message = String(error?.message || '');
  const lowerMessage = message.toLowerCase();
  return (
    message.includes('429') ||
    lowerMessage.includes('too many requests') ||
    lowerMessage.includes('free_tier_requests') ||
    lowerMessage.includes('retrydelay') ||
    lowerMessage.includes('resource_exhausted') ||
    lowerMessage.includes('quota')
  );
};

/**
 * Returns true when the error signals a daily / per-day quota exhaustion
 * (as opposed to a per-minute rate limit).
 */
const isDailyQuotaError = (error) => {
  const msg = String(error?.message || '').toLowerCase();
  return (
    msg.includes('daily') ||
    msg.includes('per_day') ||
    msg.includes('free_tier_requests') ||
    msg.includes('generaterequestsperdayperprojectpermodel')
  );
};

/**
 * Returns true when the error is a per-minute / RPM rate-limit.
 */
const isRpmError = (error) => {
  const msg = String(error?.message || '').toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('too many requests') ||
    msg.includes('generaterequestsperminuteperprojectpermodel') ||
    msg.includes('retrydelay')
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Smart cooldown duration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine how long to cool down a (key, model) pair based on the error.
 * Returns { cooldownMs, reason }.
 */
const classifyCooldown = (error) => {
  if (isDailyQuotaError(error)) {
    return { cooldownMs: DAILY_QUOTA_COOLDOWN_MS, reason: 'daily_quota' };
  }

  if (isRpmError(error)) {
    // Try to extract retryDelay from the error body
    const raw = String(error?.message || '');
    const match =
      raw.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/i) ||
      raw.match(/retry in (\d+(?:\.\d+)?)s/i);
    const extractedMs = match
      ? Math.ceil(Number.parseFloat(match[1]) * 1000)
      : 0;
    const cooldownMs = extractedMs > 0 ? extractedMs : RPM_QUOTA_DEFAULT_MS;
    return { cooldownMs, reason: 'rpm_quota' };
  }

  if (isRateLimitError(error)) {
    return { cooldownMs: UNKNOWN_QUOTA_COOLDOWN_MS, reason: 'unknown_quota' };
  }

  return { cooldownMs: NON_QUOTA_COOLDOWN_MS, reason: 'non_quota_error' };
};

// ─────────────────────────────────────────────────────────────────────────────
// Cooldown management
// ─────────────────────────────────────────────────────────────────────────────

const markCooldown = (keyIndex, modelName, cooldownMs, reason) => {
  if (!cooldownMap[keyIndex]) cooldownMap[keyIndex] = {};
  const until = Date.now() + cooldownMs;
  cooldownMap[keyIndex][modelName] = { until, reason };
  logger.warn('Gemini key/model marked as cooling down', {
    keyIndex: keyIndex + 1,
    model: modelName,
    cooldownMs,
    reason,
  });
};

const isKeyModelCoolingDown = (keyIndex, modelName) => {
  const entry = cooldownMap[keyIndex]?.[modelName];
  if (!entry) return false;
  if (Date.now() >= entry.until) {
    delete cooldownMap[keyIndex][modelName];
    logger.info('Gemini key/model cooldown expired — back online', {
      keyIndex: keyIndex + 1,
      model: modelName,
    });
    return false;
  }
  return true;
};

const isModelGloballyCooledDown = (modelName) => {
  const entry = globalModelCooldown[modelName];
  if (!entry) return false;
  if (Date.now() >= entry.until) {
    delete globalModelCooldown[modelName];
    logger.info('Gemini model global cooldown expired — back online', {
      model: modelName,
    });
    return false;
  }
  return true;
};

/**
 * After marking a key for a model, check whether ALL keys are now cooled down
 * for that model.  If so, set a global model cooldown.
 */
const maybeSetGlobalModelCooldown = (modelName, totalKeys) => {
  let allCooled = true;
  let soonest = Infinity;
  for (let k = 0; k < totalKeys; k++) {
    const entry = cooldownMap[k]?.[modelName];
    if (!entry || Date.now() >= entry.until) {
      allCooled = false;
      break;
    }
    soonest = Math.min(soonest, entry.until);
  }
  if (allCooled && soonest < Infinity) {
    globalModelCooldown[modelName] = { until: soonest };
    logger.warn('All Gemini keys cooled down for model — setting global model cooldown', {
      model: modelName,
      cooldownEndsAt: new Date(soonest).toISOString(),
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Key + Model selection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Walk through every (key, model) combination and return the first one that
 * is NOT cooling down.
 *
 * Iteration order: for each KEY → try all MODELS (skip globally-cooled models)
 * → then rotate to the next KEY.
 *
 * If nothing is immediately available, returns the combo whose cooldown expires
 * soonest so the caller can decide to wait or fail.
 */
const getAvailableKeyAndModel = (clients) => {
  let soonestCombo = null;
  let soonestUntil = Infinity;

  for (let keyIndex = 0; keyIndex < clients.length; keyIndex++) {
    for (const modelName of MODEL_FALLBACK_CHAIN) {
      // Skip models that are globally cooled down (all keys exhausted)
      if (isModelGloballyCooledDown(modelName)) continue;

      if (!isKeyModelCoolingDown(keyIndex, modelName)) {
        return { keyIndex, client: clients[keyIndex], model: modelName };
      }

      // Track the soonest-expiring cooldown as a fallback
      const entry = cooldownMap[keyIndex]?.[modelName];
      if (entry && entry.until < soonestUntil) {
        soonestUntil = entry.until;
        soonestCombo = { keyIndex, client: clients[keyIndex], model: modelName, waitMs: entry.until - Date.now() };
      }
    }
  }

  return soonestCombo; // null when no clients exist
};

// ─────────────────────────────────────────────────────────────────────────────
// Network-level retry wrapper
// ─────────────────────────────────────────────────────────────────────────────

const getNetworkRetryDelayMs = () => {
  const retryDelayMs = Number.parseInt(process.env.GEMINI_NETWORK_RETRY_DELAY_MS || '750', 10);
  return Number.isFinite(retryDelayMs) && retryDelayMs > 0 ? retryDelayMs : 0;
};

const generateContentWithNetworkRetry = async (model, prompt, requestOptions, context) => {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await model.generateContent(prompt, requestOptions);
    } catch (error) {
      if (!isNetworkError(error) || attempt === maxAttempts) {
        throw error;
      }

      logger.warn('Gemini network request failed, retrying once', {
        ...context,
        attempt,
        error: error.message,
      });

      const retryDelayMs = getNetworkRetryDelayMs();
      if (retryDelayMs > 0) {
        await sleep(retryDelayMs);
      }
    }
  }

  throw new Error('Gemini network request failed');
};

// ─────────────────────────────────────────────────────────────────────────────
// Request queue & throttler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enqueue a request function.  Returns a Promise that resolves/rejects when
 * the request eventually executes.
 */
const enqueueRequest = (requestFn) => {
  return new Promise((resolve, reject) => {
    if (requestQueue.length >= MAX_QUEUE_SIZE) {
      return reject(new Error('Gemini request queue is full. Please try again later.'));
    }
    requestQueue.push({ requestFn, resolve, reject });
    processQueue();
  });
};

const processQueue = async () => {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    while (requestQueue.length > 0) {
      // Throttle: ensure MIN_REQUEST_INTERVAL_MS between calls
      const elapsed = Date.now() - lastRequestTime;
      if (elapsed < MIN_REQUEST_INTERVAL_MS) {
        await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
      }

      const { requestFn, resolve, reject } = requestQueue.shift();
      lastRequestTime = Date.now();

      try {
        const result = await requestFn();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    }
  } finally {
    isProcessingQueue = false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Core Gemini call with multi-model fallback
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Internal implementation that performs the actual API call with key rotation
 * and model fallback.
 */
const callGeminiInternal = async (prompt) => {
  const clients = getGeminiClients();
  if (!clients.length) {
    logger.warn('Gemini clients not initialized or disabled');
    return {
      _aiError: true,
      _aiErrorMessage:
        'Gemini AI is not configured for this environment. Please add a valid Gemini API key.',
    };
  }

  const timeoutMs = Number.parseInt(process.env.GEMINI_TIMEOUT_MS || '20000', 10);
  const requestOptions =
    Number.isFinite(timeoutMs) && timeoutMs > 0 ? { timeout: timeoutMs } : undefined;

  let lastErrorMessage = defaultGeminiErrorMessage;
  let sawRateLimit = false;
  let sawNetworkError = false;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const combo = getAvailableKeyAndModel(clients);

    if (!combo) {
      // All keys/models are exhausted globally
      logger.error('Gemini total failure — no available key/model combo', {
        totalKeys: clients.length,
        totalModels: MODEL_FALLBACK_CHAIN.length,
      });
      break;
    }

    // If the best available combo is still cooling down, we have a waitMs
    if (combo.waitMs && combo.waitMs > 0) {
      const waitSec = Math.ceil(combo.waitMs / 1000);
      logger.error('Gemini all combos cooling down', {
        nextAvailableInSec: waitSec,
        model: combo.model,
        keyIndex: combo.keyIndex + 1,
      });
      return {
        _aiError: true,
        _aiErrorMessage: `${allGeminiKeysExhaustedMessage} Estimated wait: ${waitSec}s.`,
      };
    }

    const { keyIndex, client, model: modelName } = combo;
    const model = client.getGenerativeModel({ model: modelName });
    const requestContext = {
      keyIndex: keyIndex + 1,
      totalKeys: clients.length,
      model: modelName,
      attempt: attempt + 1,
    };

    try {
      const result = await generateContentWithNetworkRetry(
        model,
        prompt,
        requestOptions,
        requestContext
      );
      const responseText = result.response.text();
      const parsed = cleanAndParse(responseText);

      logger.info('Gemini API call succeeded', {
        keyIndex: keyIndex + 1,
        model: modelName,
      });

      return parsed;
    } catch (error) {
      lastErrorMessage = getGeminiErrorMessage(error);

      if (isRateLimitError(error)) {
        sawRateLimit = true;
        const { cooldownMs, reason } = classifyCooldown(error);
        markCooldown(keyIndex, modelName, cooldownMs, reason);
        maybeSetGlobalModelCooldown(modelName, clients.length);

        logger.warn('Gemini fallback triggered — rate limit / quota error', {
          ...requestContext,
          cooldownMs,
          reason,
          error: error.message,
        });
        continue; // try next combo
      }

      if (isNetworkError(error)) {
        sawNetworkError = true;
        lastErrorMessage = geminiNetworkErrorMessage;
        // Brief cooldown to avoid hammering the same combo
        markCooldown(keyIndex, modelName, NON_QUOTA_COOLDOWN_MS, 'network_error');

        logger.warn('Gemini fallback triggered — network error after retry', {
          ...requestContext,
          error: error.message,
        });
        continue;
      }

      // Parse / unknown error — do a single immediate retry on the same combo
      logger.error('Gemini API call or parse failed, retrying once on same combo...', {
        ...requestContext,
        error: error.message,
      });

      try {
        const retryResult = await generateContentWithNetworkRetry(
          model,
          prompt,
          requestOptions,
          requestContext
        );
        const retryText = retryResult.response.text();
        const retryParsed = cleanAndParse(retryText);

        logger.info('Gemini API call succeeded on immediate retry', {
          keyIndex: keyIndex + 1,
          model: modelName,
        });
        return retryParsed;
      } catch (retryError) {
        lastErrorMessage = getGeminiErrorMessage(retryError);

        if (isRateLimitError(retryError)) {
          sawRateLimit = true;
          const { cooldownMs, reason } = classifyCooldown(retryError);
          markCooldown(keyIndex, modelName, cooldownMs, reason);
          maybeSetGlobalModelCooldown(modelName, clients.length);
          logger.warn('Gemini quota hit on retry — falling back', {
            ...requestContext,
            cooldownMs,
            reason,
            error: retryError.message,
          });
          continue;
        }

        if (isNetworkError(retryError)) {
          sawNetworkError = true;
          lastErrorMessage = geminiNetworkErrorMessage;
          markCooldown(keyIndex, modelName, NON_QUOTA_COOLDOWN_MS, 'network_error');
          logger.warn('Gemini network error on retry — falling back', {
            ...requestContext,
            error: retryError.message,
          });
          continue;
        }

        // Non-recoverable error for this combo — mark it briefly & try next
        markCooldown(keyIndex, modelName, NON_QUOTA_COOLDOWN_MS, 'parse_or_unknown');
        logger.error('Gemini API call or parse failed on retry — trying next combo', {
          ...requestContext,
          error: retryError.message,
        });
        continue;
      }
    }
  }

  // Exhausted all retries
  if (sawRateLimit && !sawNetworkError) {
    // Compute estimated wait
    const combo = getAvailableKeyAndModel(clients);
    const waitSec = combo?.waitMs ? Math.ceil(combo.waitMs / 1000) : 0;
    const waitSuffix = waitSec > 0 ? ` Estimated wait: ${waitSec}s.` : '';
    logger.error('Gemini total failure — all retries exhausted (rate limited)', {
      totalKeys: clients.length,
    });
    return {
      _aiError: true,
      _aiErrorMessage: `${allGeminiKeysExhaustedMessage}${waitSuffix}`,
    };
  }

  return {
    _aiError: true,
    _aiErrorMessage: sawNetworkError ? geminiNetworkErrorMessage : lastErrorMessage,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Public callGeminiWithRetry — entry point with optional queue bypass
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} prompt - The full prompt string.
 * @param {object} [options]
 * @param {'high'|'normal'} [options.priority='normal'] - High priority bypasses
 *   the request queue and executes immediately.
 */
const callGeminiWithRetry = async (prompt, options = {}) => {
  if (options.priority === 'high') {
    return callGeminiInternal(prompt);
  }
  // Enqueue for throttled execution
  return enqueueRequest(() => callGeminiInternal(prompt));
};

// ─────────────────────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a snapshot of the Gemini subsystem health.
 */
export const getGeminiHealth = () => {
  const clients = getGeminiClients();
  const totalKeys = clients.length;
  const now = Date.now();

  let soonestAvailableMs = 0;

  const models = MODEL_FALLBACK_CHAIN.map((modelName) => {
    let availableKeys = 0;
    let cooledDownKeys = 0;

    // Check global model cooldown first
    const globalEntry = globalModelCooldown[modelName];
    const globallyBlocked = globalEntry && now < globalEntry.until;

    for (let k = 0; k < totalKeys; k++) {
      const entry = cooldownMap[k]?.[modelName];
      if (entry && now < entry.until) {
        cooledDownKeys++;
        const remaining = entry.until - now;
        if (soonestAvailableMs === 0 || remaining < soonestAvailableMs) {
          soonestAvailableMs = remaining;
        }
      } else {
        availableKeys++;
      }
    }

    let status;
    if (globallyBlocked || availableKeys === 0) {
      status = 'unavailable';
    } else if (cooledDownKeys > 0) {
      status = 'degraded';
    } else {
      status = 'ok';
    }

    return { model: modelName, status, availableKeys, cooledDownKeys };
  });

  const nextAvailableSec = Math.ceil(soonestAvailableMs / 1000);

  return {
    totalKeys,
    models,
    nextAvailableIn: `${nextAvailableSec}s`,
    queueLength: requestQueue.length,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Exported generator functions (unchanged public API)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates Sprint Summary insight.
 */
export const generateSprintSummary = async (inputData) => {
  const prompt = promptBuilder.buildSprintSummaryPrompt(inputData);
  const parsed = await callGeminiWithRetry(prompt);

  if (!parsed || parsed._aiError) {
    return {
      _aiError: true,
      _aiErrorMessage: parsed?._aiErrorMessage || defaultGeminiErrorMessage,
      summary: 'AI summary is temporarily unavailable.',
      velocity: 'unknown',
      highlights: [],
      concerns: ['Unable to generate AI summary at this time.'],
      sprintScore: 0,
    };
  }

  return parsed;
};

/**
 * Generates Bottleneck Analysis insight.
 */
export const generateBottleneckAnalysis = async (inputData) => {
  const prompt = promptBuilder.buildBottleneckPrompt(inputData);
  const parsed = await callGeminiWithRetry(prompt);

  if (!parsed || parsed._aiError) {
    return {
      _aiError: true,
      _aiErrorMessage: parsed?._aiErrorMessage || defaultGeminiErrorMessage,
      bottlenecks: [],
      riskLevel: 'unknown',
      topRecommendation: 'AI bottleneck analysis is temporarily unavailable.',
    };
  }

  return parsed;
};

/**
 * Generates Contributor Analysis insight.
 */
export const generateContributorAnalysis = async (inputData) => {
  const prompt = promptBuilder.buildContributorAnalysisPrompt(inputData);
  const parsed = await callGeminiWithRetry(prompt);

  if (!parsed || parsed._aiError) {
    return {
      _aiError: true,
      _aiErrorMessage: parsed?._aiErrorMessage || defaultGeminiErrorMessage,
      activeContributors: 0,
      inactiveContributors: [],
      busContributors: [],
      teamHealthScore: 0,
      insights: ['AI contributor analysis is temporarily unavailable.'],
    };
  }

  return parsed;
};

/**
 * Generates Prioritization Recommendations insight.
 */
export const generateRecommendations = async (inputData) => {
  const prompt = promptBuilder.buildRecommendationsPrompt(inputData);
  const parsed = await callGeminiWithRetry(prompt);

  if (!parsed || parsed._aiError) {
    return {
      _aiError: true,
      _aiErrorMessage: parsed?._aiErrorMessage || defaultGeminiErrorMessage,
      recommendations: [],
      nextBestAction: 'AI recommendations are temporarily unavailable.',
    };
  }

  return parsed;
};

export const generateReleaseReadinessNarrative = async (inputData) => {
  const prompt = promptBuilder.buildReleaseReadinessPrompt(inputData);
  const parsed = await callGeminiWithRetry(prompt);

  if (!parsed || parsed._aiError) {
    return {
      _aiError: true,
      _aiErrorMessage: parsed?._aiErrorMessage || defaultGeminiErrorMessage,
      riskFactors: [],
      recommendations: [],
    };
  }

  return {
    riskFactors: Array.isArray(parsed.riskFactors)
      ? parsed.riskFactors.slice(0, 3)
      : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.slice(0, 3)
      : [],
  };
};

export const generateWorkloadIntelligenceNarrative = async (inputData) => {
  const prompt = promptBuilder.buildWorkloadIntelligencePrompt(inputData);
  const parsed = await callGeminiWithRetry(prompt);

  if (!parsed || parsed._aiError) {
    return {
      _aiError: true,
      _aiErrorMessage: parsed?._aiErrorMessage || defaultGeminiErrorMessage,
      topRisk: '',
      recommendations: [],
    };
  }

  return {
    topRisk: typeof parsed.topRisk === 'string' ? parsed.topRisk : '',
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.slice(0, 4)
      : [],
  };
};

export const generateSprintRetrospectiveNarrative = async (inputData) => {
  const prompt = promptBuilder.buildSprintRetrospectivePrompt(inputData);
  const parsed = await callGeminiWithRetry(prompt);

  if (!parsed || parsed._aiError) {
    return {
      _aiError: true,
      _aiErrorMessage: parsed?._aiErrorMessage || defaultGeminiErrorMessage,
    };
  }

  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    whatWentWell: Array.isArray(parsed.whatWentWell)
      ? parsed.whatWentWell.slice(0, 5)
      : [],
    whatWentWrong: Array.isArray(parsed.whatWentWrong)
      ? parsed.whatWentWrong.slice(0, 5)
      : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks.slice(0, 5) : [],
    actionItems: Array.isArray(parsed.actionItems)
      ? parsed.actionItems.slice(0, 5)
      : [],
  };
};
