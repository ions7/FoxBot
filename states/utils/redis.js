const Redis = require('ioredis');
const RedisSession = require('telegraf-session-redis');

// Conexiuni Redis
const statsRedis = new Redis(process.env.REDIS_URL, {
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

const sessionRedis = new Redis(process.env.REDIS_URL);

// Configurare sesiune
const session = new RedisSession({
    store: {
        url: process.env.REDIS_URL,
        ttl: 86400 // 1 zi
    },
    getSessionKey: (ctx) => {
        if (!ctx.from || !ctx.chat) return null;
        return `session:${ctx.from.id}:${ctx.chat.id}`;
    }
});

// Middleware pentru tracking comenzi
async function trackCommand(ctx, next) {
    if (ctx.message && ctx.message.text) {
        const userId = ctx.from.id;
        const command = ctx.message.text;
        const date = new Date().toISOString();

        try {
            await statsRedis.multi()
                .hincrby(`user:${userId}:commands`, command, 1)
                .hset(`user:${userId}:info`,
                    'username', ctx.from.username || ctx.from.first_name,
                    'last_seen', date
                )
                .hsetnx(`user:${userId}:info`, 'first_seen', date)
                .exec();
        } catch (err) {
            console.error('Redis tracking error:', err);
        }
    }
    await next();
}

// Funcții utilitare Redis
async function getUserStats(userId) {
    return {
        commands: await statsRedis.hgetall(`user:${userId}:commands`),
        info: await statsRedis.hgetall(`user:${userId}:info`)
    };
}

async function clearUserSessions(userId) {
    const keys = await sessionRedis.keys(`session:${userId}:*`);
    if (keys.length > 0) {
        return sessionRedis.del(keys);
    }
}

module.exports = {
    sessionMiddleware: session.middleware(),
    trackCommand,
    statsRedis,
    sessionRedis,
    getUserStats,
    clearUserSessions
};