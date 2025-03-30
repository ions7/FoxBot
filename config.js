/**
 * Configuration File for FoxFarm Bot
 * Contains all constants, settings and environment validations
 */

// 1. Country Configuration
const countryCodes = {
    CA: "Canada",
    AT: "Austria",
    GR: "Greece",
    AU: "Australia",
    DE: "Germany",
    NL: "Netherlands",
    IRL: "Ireland",
    ES: "Spain",
    PT: "Portugal",
    IN: "India",
    // Add more as needed
};

// 2. Bot Settings
const botSettings = {
    adminIds: [6742445633], // Array of admin user IDs
    maxInputLength: 4000,   // Max characters for user input
    sessionTTL: 86400,      // Session time-to-live in seconds (1 day)
    rateLimit: {
        window: 60,         // 1 minute
        max: 20             // Max requests per window
    }
};

// 3. Campaign Defaults
const campaignDefaults = {
    search: {
        minBudget: 5,
        maxBudget: 8,
        defaultDays: 30
    },
    display: {
        minBudget: 8,
        maxBudget: 15,
        defaultDays: 30
    }
};

// 4. Content Limits (Google Ads)
const contentLimits = {
    headlines: {
        maxLength: 28,
        minCount: 4,
        maxCount: 8
    },
    descriptions: {
        maxLength: 88,
        minCount: 2,
        maxCount: 5
    },
    keywords: {
        maxCount: 20,
        bannedWords: ['casino', 'win', 'winning', 'gamble', 'bet']
    }
};

// 5. API Configuration
const apiConfig = {
    openai: {
        model: "gpt-4",
        temperature: 0.3,
        maxTokens: 2000
    },
    deepseek: {
        model: "deepseek-chat",
        temperature: 0.5,
        maxTokens: 2500
    }
};

// 6. Environment Validation
const validateEnv = () => {
    const requiredEnvVars = [
        'BOT_TOKEN',
        'REDIS_URL',
        'OPENAI_API_KEY'
    ];

    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
        throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
    }
};

module.exports = {
    countryCodes,
    botSettings,
    campaignDefaults,
    contentLimits,
    apiConfig,
    validateEnv
};