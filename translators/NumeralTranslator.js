const OpenAI = require('openai');
const logger = require('../utils/logger');

class NumeralTranslator {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        // Cache for numeral conversions to avoid repeated API calls
        this.cache = new Map();
    }

    /**
     * Convert numerals in text to target language script
     * @param {string} text - Text containing numerals to convert
     * @param {string} targetLanguage - Target language code (e.g., 'hi', 'ar', 'fa')
     * @param {Object} options - Additional options
     * @returns {Promise<string>} - Text with converted numerals
     */
    async convertNumerals(text, targetLanguage, options = {}) {
        try {
            // Create cache key
            const cacheKey = `${text}|${targetLanguage}|${JSON.stringify(options)}`;
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            // Get target script info
            const scriptInfo = this.getScriptInfo(targetLanguage);
            
            const prompt = this.buildNumeralConversionPrompt(text, targetLanguage, scriptInfo, options);
            
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a specialized numeral conversion expert. Convert numerals to target scripts while preserving all formatting, punctuation, and non-numeral content exactly.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0, // Deterministic output
                max_tokens: 2000
            });

            let convertedText = response.choices[0].message.content.trim();
            
            // Remove any markdown formatting that might be added
            convertedText = convertedText.replace(/```[a-z]*\n?/g, '').replace(/```/g, '');
            
            // Cache the result
            this.cache.set(cacheKey, convertedText);
            
            logger.info(`Converted numerals for language ${targetLanguage}: ${text.length} chars`);
            
            return convertedText;
            
        } catch (error) {
            logger.error('Error in numeral conversion:', error);
            // Return original text if conversion fails
            return text;
        }
    }

    /**
     * Build the prompt for numeral conversion
     */
    buildNumeralConversionPrompt(text, targetLanguage, scriptInfo, options) {
        const examples = this.getExamples(targetLanguage);
        
        return `Convert all numerals in the following text to ${scriptInfo.name} script (${targetLanguage}).

CRITICAL RULES:
1. ONLY convert numerals (0-9) to ${scriptInfo.name} numerals
2. PRESERVE all formatting, punctuation, currency symbols, and spacing EXACTLY
3. PRESERVE all non-numeral content EXACTLY as provided
4. Do NOT translate any words or text - only convert numerals
5. Maintain the exact structure and formatting of the original text

Target Script: ${scriptInfo.name}
Numerals: ${scriptInfo.numerals}

Examples for ${targetLanguage}:
${examples}

Text to convert:
${text}

Return ONLY the converted text with no additional formatting or explanation:`;
    }

    /**
     * Get script information for target language
     */
    getScriptInfo(languageCode) {
        const scripts = {
            'hi': {
                name: 'Devanagari (Hindi)',
                numerals: '० (0), १ (1), २ (2), ३ (3), ४ (4), ५ (5), ६ (6), ७ (7), ८ (8), ९ (9)'
            },
            'ar': {
                name: 'Arabic-Indic',
                numerals: '٠ (0), ١ (1), ٢ (2), ٣ (3), ٤ (4), ٥ (5), ٦ (6), ٧ (7), ٨ (8), ٩ (9)'
            },
            'fa': {
                name: 'Persian',
                numerals: '۰ (0), ۱ (1), ۲ (2), ۳ (3), ۴ (4), ۵ (5), ۶ (6), ۷ (7), ۸ (8), ۹ (9)'
            },
            'bn': {
                name: 'Bengali',
                numerals: '০ (0), ১ (1), ২ (2), ৩ (3), ৪ (4), ৫ (5), ৬ (6), ৭ (7), ৮ (8), ৯ (9)'
            },
            'ur': {
                name: 'Urdu (Arabic-Indic)',
                numerals: '٠ (0), ١ (1), ٢ (2), ٣ (3), ٤ (4), ٥ (5), ٦ (6), ٧ (7), ٨ (8), ٩ (9)'
            },
            'ta': {
                name: 'Tamil',
                numerals: '௦ (0), ௧ (1), ௨ (2), ௩ (3), ௪ (4), ௫ (5), ௬ (6), ௭ (7), ௮ (8), ௯ (9)'
            },
            'te': {
                name: 'Telugu',
                numerals: '౦ (0), ౧ (1), ౨ (2), ౩ (3), ౪ (4), ౫ (5), ౬ (6), ౭ (7), ౮ (8), ౯ (9)'
            },
            'kn': {
                name: 'Kannada',
                numerals: '೦ (0), ೧ (1), ೨ (2), ೩ (3), ೪ (4), ೫ (5), ೬ (6), ೭ (7), ೮ (8), ೯ (9)'
            },
            'ml': {
                name: 'Malayalam',
                numerals: '൦ (0), ൧ (1), ൨ (2), ൩ (3), ൪ (4), ൫ (5), ൬ (6), ൭ (7), ൮ (8), ൯ (9)'
            },
            'gu': {
                name: 'Gujarati',
                numerals: '૦ (0), ૧ (1), ૨ (2), ૩ (3), ૪ (4), ૫ (5), ૬ (6), ૭ (7), ૮ (8), ૯ (9)'
            },
            'pa': {
                name: 'Gurmukhi (Punjabi)',
                numerals: '੦ (0), ੧ (1), ੨ (2), ੩ (3), ੪ (4), ੫ (5), ੬ (6), ੭ (7), ੮ (8), ੯ (9)'
            },
            'or': {
                name: 'Odia',
                numerals: '୦ (0), ୧ (1), ୨ (2), ୩ (3), ୪ (4), ୫ (5), ୬ (6), ୭ (7), ୮ (8), ୯ (9)'
            },
            'th': {
                name: 'Thai',
                numerals: '๐ (0), ๑ (1), ๒ (2), ๓ (3), ๔ (4), ๕ (5), ๖ (6), ๗ (7), ๘ (8), ๙ (9)'
            },
            'my': {
                name: 'Myanmar',
                numerals: '၀ (0), ၁ (1), ၂ (2), ၃ (3), ၄ (4), ၅ (5), ၆ (6), ၇ (7), ၈ (8), ၉ (9)'
            },
            'zh': {
                name: 'Chinese',
                numerals: '〇 (0), 一 (1), 二 (2), 三 (3), 四 (4), 五 (5), 六 (6), 七 (7), 八 (8), 九 (9)'
            }
        };

        return scripts[languageCode] || {
            name: 'Latin',
            numerals: '0, 1, 2, 3, 4, 5, 6, 7, 8, 9'
        };
    }

    /**
     * Get examples for specific language
     */
    getExamples(languageCode) {
        const examples = {
            'hi': `Input: "Price: ¥15,000-30,000"
Output: "Price: ¥१५,०००-३०,०००"

Input: "Room 123, Floor 5"
Output: "Room १२३, Floor ५"`,

            'ar': `Input: "Price: $25.99"
Output: "Price: $٢٥.٩٩"

Input: "Page 42 of 100"
Output: "Page ٤٢ of ١٠٠"`,

            'fa': `Input: "¥15,000-30,000"
Output: "¥۱۵,۰۰۰-۳۰,۰۰۰"

Input: "Chapter 7, verse 12"
Output: "Chapter ۷, verse ۱۲"`,

            'bn': `Input: "Price: ৳500"
Output: "Price: ৳৫০০"

Input: "Year 2024"
Output: "Year ২০২৪"`
        };

        return examples[languageCode] || `Input: "Price: $25.99"
Output: "Price: $25.99" (no conversion needed for Latin numerals)`;
    }

    /**
     * Check if text contains numerals that need conversion
     */
    hasNumeralsToConvert(text, targetLanguage) {
        // Check if text contains Latin numerals (0-9)
        const hasLatinNumerals = /[0-9]/.test(text);
        
        // For non-Latin target languages, we need to convert Latin numerals
        const nonLatinLanguages = ['hi', 'ar', 'fa', 'bn', 'ur', 'ta', 'te', 'kn', 'ml', 'gu', 'pa', 'or', 'th', 'my', 'zh'];
        
        return hasLatinNumerals && nonLatinLanguages.includes(targetLanguage);
    }

    /**
     * Clear the cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: 1000 // We can implement LRU if needed
        };
    }
}

module.exports = NumeralTranslator; 