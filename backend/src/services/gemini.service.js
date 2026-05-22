import { getGeminiClient } from '../config/gemini.js';
import * as promptBuilder from '../utils/promptBuilder.js';
import logger from '../config/logger.js';

/**
 * Executes a call to the Gemini API, handles a single retry for API or parsing failures,
 * and returns the parsed JSON object or null.
 */
const callGeminiWithRetry = async (prompt) => {
  const client = getGeminiClient();
  if (!client) {
    logger.warn('Gemini client not initialized or disabled');
    return null;
  }
  
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const model = client.getGenerativeModel({ model: modelName });

  const cleanAndParse = (text) => {
    let cleaned = text.trim();
    // Strip markdown code fences if present
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
    }
    return JSON.parse(cleaned.trim());
  };

  let responseText = '';
  try {
    const result = await model.generateContent(prompt);
    responseText = result.response.text();
    return cleanAndParse(responseText);
  } catch (error) {
    logger.error('Gemini API call or parse failed, retrying once...', { error: error.message });
    
    // Retry once
    try {
      const result = await model.generateContent(prompt);
      responseText = result.response.text();
      return cleanAndParse(responseText);
    } catch (retryError) {
      logger.error('Gemini API call or parse failed on retry', { error: retryError.message });
      return null;
    }
  }
};

/**
 * Generates Sprint Summary insight.
 */
export const generateSprintSummary = async (inputData) => {
  const prompt = promptBuilder.buildSprintSummaryPrompt(inputData);
  const parsed = await callGeminiWithRetry(prompt);
  
  if (!parsed) {
    return {
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
  
  if (!parsed) {
    return {
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
  
  if (!parsed) {
    return {
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
  
  if (!parsed) {
    return {
      recommendations: [],
      nextBestAction: 'AI recommendations are temporarily unavailable.'
    };
  }
  
  return parsed;
};
