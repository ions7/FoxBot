if (state === 'awaiting_autocamp_input') {
    try {
        // 1. Prelucrare input
        const [domain, countryCode] = ctx.message.text.split('*');
        const countryName = countryCodes[countryCode?.toUpperCase()];

        // Validare
        if (!domain || !countryName) {
            return ctx.reply(`⚠️ Format invalid. Exemplu corect: domeniu.com*RO\n\nCoduri țări valide: ${Object.keys(countryCodes).join(', ')}`);
        }

        // 2. Extrage conținut
        await ctx.reply(`🔍 Extrag conținut de pe ${domain}...`);
        const response = await axios.get(`https://${domain}`, {
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const $ = cheerio.load(response.data);
        let content = '';
        $('h1, h2, h3, p').each((_, el) => {
            content += $(el).text().trim() + '\n';
        });

        if (!content || content.length < 100) {
            throw new Error('Conținut insuficient pe pagină');
        }

        // 3. Generează elemente cu ChatGPT
        await ctx.reply('🧠 Generez elementele campaniei...');
        const gptResponse = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{
                role: "system",
                content: `Generează în format JSON strict:
                {
                    "headlines": ["Max 25 caractere", ...4 elemente],
                    "descriptions": ["Max 85 caractere", ...2 elemente],
                    "keywords": ["lowercase", ...5-8 elemente]
                }`
            }, {
                role: "user",
                content: `Site: ${domain}\nȚară: ${countryName}\nConținut:\n${content.substring(0, 8000)}`
            }]
        });

        // 4. Parsează răspunsul
        const responseText = gptResponse.choices[0].message.content;
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Format GPT invalid');

        const { headlines, descriptions, keywords } = JSON.parse(jsonMatch[0]);

        // 5. Generează fișierul TXT
        const campaignData = `
Google Ads Campaign Script
=========================

Campaign Name: Search-${domain.slice(0, 8)}-${countryCode.toUpperCase()}
Ad Group: AdGroup-${countryCode.toUpperCase()}-1
Target Country: ${countryName}
Final URL: https://${domain}
Budget: ${(Math.random() * (8 - 5) + 5).toFixed(2)} EUR/day

HEADLINES:
${headlines.map((h, i) => `${i+1}. ${h}`).join('\n')}

DESCRIPTIONS:
${descriptions.map((d, i) => `${i+1}. ${d}`).join('\n')}

KEYWORDS:
${keywords.join(', ')}

Generated on: ${new Date().toLocaleString()}
        `;

        // 6. Trimite fișierul
        const fileName = `campaign_${domain.replace(/\./g, '_')}_${countryCode}.txt`;
        fs.writeFileSync(fileName, campaignData);

        await ctx.replyWithDocument({
            source: fileName,
            filename: fileName
        });

        // 7. Curăță
        fs.unlinkSync(fileName);
        ctx.session.state = null;

    } catch (error) {
        console.error('Eroare:', error);
        await ctx.reply(`❌ Eroare: ${error.message}\nÎncearcă din nou.`);
        ctx.session.state = null;
    }
}