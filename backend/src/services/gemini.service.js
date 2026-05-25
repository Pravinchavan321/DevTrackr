import { getGeminiClients } from '../config/gemini.js';
import * as promptBuilder from '../utils/promptBuilder.js';
import logger from '../config/logger.js';

/**
 * Executes a call to the Gemini API, falls through configured keys when quota is exhausted,
 * handles a single retry for API or parsing failures,
 * and returns the parsed JSON object or null.
 */
const defaultGeminiErrorMessage = 'Gemini AI service is currently unavailable. Please try again in a few minutes.';
const allGeminiKeysExhaustedMessage = 'All configured Gemini API keys are currently rate-limited or out of quota. Please wait for quota reset or add another billing-enabled Gemini API key.';
const geminiNetworkErrorMessage = 'Gemini network request failed before AI could respond. Please regenerate this insight in a moment.';
const geminiDailyQuotaCooldownMs = 24 * 60 * 60 * 1000;
const geminiRateLimitCooldownMs = 60 * 1000;
const rateLimitedKeyCooldowns = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const isRateLimitError = (error) => {
  const message = String(error?.message || '');
  const lowerMessage = message.toLowerCase();
  return (
    message.includes('429') ||
    lowerMessage.includes('too many requests') ||
    lowerMessage.includes('free_tier_requests') ||
    lowerMessage.includes('retrydelay')
  );
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

const getRateLimitCooldownMs = (error) => {
  const message = String(error?.message || '');
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes('free_tier_requests') ||
    lowerMessage.includes('generaterequestsperdayperprojectpermodel-freetier')
  ) {
    return geminiDailyQuotaCooldownMs;
  }

  const retryDelayMatch = message.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/i)
    || message.match(/retry in (\d+(?:\.\d+)?)s/i);
  const retryDelayMs = retryDelayMatch ? Math.ceil(Number.parseFloat(retryDelayMatch[1]) * 1000) : 0;
  return Math.max(retryDelayMs, geminiRateLimitCooldownMs);
};

const markKeyRateLimited = (clientIndex, error) => {
  const cooldownMs = getRateLimitCooldownMs(error);
  rateLimitedKeyCooldowns.set(clientIndex, Date.now() + cooldownMs);
  return cooldownMs;
};

const isKeyCoolingDown = (clientIndex) => {
  const cooldownUntil = rateLimitedKeyCooldowns.get(clientIndex);
  if (!cooldownUntil) return false;
  if (Date.now() >= cooldownUntil) {
    rateLimitedKeyCooldowns.delete(clientIndex);
    return false;
  }
  return true;
};

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
        error: error.message
      });

      const retryDelayMs = getNetworkRetryDelayMs();
      if (retryDelayMs > 0) {
        await sleep(retryDelayMs);
      }
    }
  }

  throw new Error('Gemini network request failed');
};

const callGeminiWithRetry = async (prompt) => {
  const clients = getGeminiClients();
  if (!clients.length) {
    logger.warn('Gemini clients not initialized or disabled');
    return {
      _aiError: true,
      _aiErrorMessage: 'Gemini AI is not configured for this environment. Please add a valid Gemini API key.'
    };
  }
  
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const timeoutMs = Number.parseInt(process.env.GEMINI_TIMEOUT_MS || '20000', 10);
  const requestOptions = Number.isFinite(timeoutMs) && timeoutMs > 0 ? { timeout: timeoutMs } : undefined;

  const cleanAndParse = (text) => {
    let cleaned = text.trim();
    // Strip markdown code fences if present
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
    }
    return JSON.parse(cleaned.trim());
  };

  let lastErrorMessage = defaultGeminiErrorMessage;
  let sawRateLimit = false;
  let sawNetworkError = false;
  let availableKeyCount = 0;

  for (const [clientIndex, client] of clients.entries()) {
    if (isKeyCoolingDown(clientIndex)) {
      sawRateLimit = true;
      continue;
    }

    availableKeyCount += 1;
    const model = client.getGenerativeModel({ model: modelName });
    let responseText = '';
    const requestContext = {
      keyIndex: clientIndex + 1,
      totalKeys: clients.length
    };

    try {
      const result = await generateContentWithNetworkRetry(model, prompt, requestOptions, requestContext);
      responseText = result.response.text();
      return cleanAndParse(responseText);
    } catch (error) {
      lastErrorMessage = getGeminiErrorMessage(error);

      if (isRateLimitError(error)) {
        sawRateLimit = true;
        const cooldownMs = markKeyRateLimited(clientIndex, error);
        logger.error('Gemini API key quota exhausted, trying fallback key if available', {
          keyIndex: clientIndex + 1,
          totalKeys: clients.length,
          cooldownMs,
          error: error.message
        });
        continue;
      }

      if (isNetworkError(error)) {
        sawNetworkError = true;
        lastErrorMessage = geminiNetworkErrorMessage;
        logger.error('Gemini network request failed after retry, trying fallback key if available', {
          ...requestContext,
          error: error.message
        });
        continue;
      }

      logger.error('Gemini API call or parse failed, retrying once...', {
        ...requestContext,
        error: error.message
      });

      try {
        const result = await generateContentWithNetworkRetry(model, prompt, requestOptions, requestContext);
        responseText = result.response.text();
        return cleanAndParse(responseText);
      } catch (retryError) {
        lastErrorMessage = getGeminiErrorMessage(retryError);

        if (isRateLimitError(retryError)) {
          sawRateLimit = true;
          const cooldownMs = markKeyRateLimited(clientIndex, retryError);
          logger.error('Gemini API key quota exhausted on retry, trying fallback key if available', {
            keyIndex: clientIndex + 1,
            totalKeys: clients.length,
            cooldownMs,
            error: retryError.message
          });
          continue;
        }

        if (isNetworkError(retryError)) {
          sawNetworkError = true;
          lastErrorMessage = geminiNetworkErrorMessage;
          logger.error('Gemini network request failed on retry, trying fallback key if available', {
            ...requestContext,
            error: retryError.message
          });
          continue;
        }

        logger.error('Gemini API call or parse failed on retry', {
          ...requestContext,
          error: retryError.message
        });

        return {
          _aiError: true,
          _aiErrorMessage: lastErrorMessage
        };
      }
    }
  }

  if (!availableKeyCount && sawRateLimit) {
    logger.warn('All Gemini API keys are cooling down after quota errors', {
      totalKeys: clients.length
    });
  }

  return {
    _aiError: true,
    _aiErrorMessage: sawRateLimit && !sawNetworkError ? allGeminiKeysExhaustedMessage : lastErrorMessage
  };
};

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
      sprintScore: 0
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
      topRecommendation: 'AI bottleneck analysis is temporarily unavailable.'
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
      insights: ['AI contributor analysis is temporarily unavailable.']
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
      nextBestAction: 'AI recommendations are temporarily unavailable.'
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
      recommendations: []
    };
  }

  return {
    riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors.slice(0, 3) : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 3) : []
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
      recommendations: []
    };
  }

  return {
    topRisk: typeof parsed.topRisk === 'string' ? parsed.topRisk : '',
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 4) : []
  };
};

export const generateSprintRetrospectiveNarrative = async (inputData) => {
  const prompt = promptBuilder.buildSprintRetrospectivePrompt(inputData);
  const parsed = await callGeminiWithRetry(prompt);

  if (!parsed || parsed._aiError) {
    return {
      _aiError: true,
      _aiErrorMessage: parsed?._aiErrorMessage || defaultGeminiErrorMessage
    };
  }

  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    whatWentWell: Array.isArray(parsed.whatWentWell) ? parsed.whatWentWell.slice(0, 5) : [],
    whatWentWrong: Array.isArray(parsed.whatWentWrong) ? parsed.whatWentWrong.slice(0, 5) : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks.slice(0, 5) : [],
    actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems.slice(0, 5) : []
  };
};
