const { expect } = require('chai');
const NumeralTranslator = require('../translators/NumeralTranslator');

describe('NumeralTranslator', function() {
    this.timeout(30000); // Increase timeout for API calls
    
    let numeralTranslator;
    
    before(function() {
        numeralTranslator = new NumeralTranslator();
    });
    
    describe('hasNumeralsToConvert', function() {
        it('should detect Latin numerals for Hindi', function() {
            expect(numeralTranslator.hasNumeralsToConvert('Price: ¥15,000', 'hi')).to.be.true;
            expect(numeralTranslator.hasNumeralsToConvert('No numbers here', 'hi')).to.be.false;
            expect(numeralTranslator.hasNumeralsToConvert('Already in Hindi: ¥१५,०००', 'hi')).to.be.false;
        });
        
        it('should not convert for Latin languages', function() {
            expect(numeralTranslator.hasNumeralsToConvert('Price: $25.99', 'en')).to.be.false;
            expect(numeralTranslator.hasNumeralsToConvert('Price: $25.99', 'es')).to.be.false;
        });
    });
    
    describe('convertNumerals', function() {
        it('should convert Hindi numerals correctly', async function() {
            const input = 'Price: ¥15,000-30,000';
            const result = await numeralTranslator.convertNumerals(input, 'hi');
            
            // Should contain Hindi numerals
            expect(result).to.include('१'); // 1 in Hindi
            expect(result).to.include('५'); // 5 in Hindi
            expect(result).to.include('०'); // 0 in Hindi
            expect(result).to.include('३'); // 3 in Hindi
            
            // Should preserve formatting
            expect(result).to.include('¥');
            expect(result).to.include(',');
            expect(result).to.include('-');
            expect(result).to.include('Price:');
        });
        
        it('should convert Arabic numerals correctly', async function() {
            const input = 'Room 123, Floor 5';
            const result = await numeralTranslator.convertNumerals(input, 'ar');
            
            // Should contain Arabic numerals
            expect(result).to.include('١'); // 1 in Arabic
            expect(result).to.include('٢'); // 2 in Arabic
            expect(result).to.include('٣'); // 3 in Arabic
            expect(result).to.include('٥'); // 5 in Arabic
            
            // Should preserve text
            expect(result).to.include('Room');
            expect(result).to.include('Floor');
        });
        
        it('should convert Persian numerals correctly', async function() {
            const input = 'Chapter 7, verse 12';
            const result = await numeralTranslator.convertNumerals(input, 'fa');
            
            // Should contain Persian numerals
            expect(result).to.include('۷'); // 7 in Persian
            expect(result).to.include('۱'); // 1 in Persian
            expect(result).to.include('۲'); // 2 in Persian
            
            // Should preserve text
            expect(result).to.include('Chapter');
            expect(result).to.include('verse');
        });
        
        it('should handle complex price ranges', async function() {
            const input = '¥15,000-30,000 per night (taxes: 8.5%)';
            const result = await numeralTranslator.convertNumerals(input, 'hi');
            
            // Should preserve currency and formatting
            expect(result).to.include('¥');
            expect(result).to.include('per night');
            expect(result).to.include('taxes:');
            expect(result).to.include('%');
            expect(result).to.include('(');
            expect(result).to.include(')');
            
            // Should have converted numerals
            expect(result).to.not.include('15,000');
            expect(result).to.not.include('30,000');
            expect(result).to.not.include('8.5');
        });
        
        it('should handle mixed content', async function() {
            const input = 'Open 24/7, call +1-555-123-4567';
            const result = await numeralTranslator.convertNumerals(input, 'hi');
            
            // Should preserve phone number formatting
            expect(result).to.include('+');
            expect(result).to.include('-');
            expect(result).to.include('call');
            expect(result).to.include('Open');
            
            // Should convert numerals
            expect(result).to.not.include('24');
            expect(result).to.not.include('555');
        });
        
        it('should return original text on error', async function() {
            // Test with invalid language code
            const input = 'Price: $25.99';
            const result = await numeralTranslator.convertNumerals(input, 'invalid');
            
            // Should return original text
            expect(result).to.equal(input);
        });
        
        it('should handle empty or null input', async function() {
            expect(await numeralTranslator.convertNumerals('', 'hi')).to.equal('');
            expect(await numeralTranslator.convertNumerals(null, 'hi')).to.equal(null);
            expect(await numeralTranslator.convertNumerals(undefined, 'hi')).to.equal(undefined);
        });
    });
    
    describe('getScriptInfo', function() {
        it('should return correct script info for supported languages', function() {
            const hindiInfo = numeralTranslator.getScriptInfo('hi');
            expect(hindiInfo.name).to.include('Devanagari');
            expect(hindiInfo.numerals).to.include('०');
            
            const arabicInfo = numeralTranslator.getScriptInfo('ar');
            expect(arabicInfo.name).to.include('Arabic');
            expect(arabicInfo.numerals).to.include('٠');
            
            const persianInfo = numeralTranslator.getScriptInfo('fa');
            expect(persianInfo.name).to.include('Persian');
            expect(persianInfo.numerals).to.include('۰');
        });
        
        it('should return Latin for unsupported languages', function() {
            const info = numeralTranslator.getScriptInfo('unknown');
            expect(info.name).to.equal('Latin');
            expect(info.numerals).to.include('0, 1, 2');
        });
    });
    
    describe('caching', function() {
        it('should cache results', async function() {
            const input = 'Test 123';
            
            // First call
            const result1 = await numeralTranslator.convertNumerals(input, 'hi');
            const initialCacheSize = numeralTranslator.getCacheStats().size;
            
            // Second call with same input
            const result2 = await numeralTranslator.convertNumerals(input, 'hi');
            const finalCacheSize = numeralTranslator.getCacheStats().size;
            
            // Results should be the same
            expect(result1).to.equal(result2);
            
            // Cache should have grown
            expect(finalCacheSize).to.be.at.least(initialCacheSize);
        });
        
        it('should clear cache', function() {
            numeralTranslator.clearCache();
            expect(numeralTranslator.getCacheStats().size).to.equal(0);
        });
    });
    
    describe('integration scenarios', function() {
        it('should handle travel content with prices', async function() {
            const input = 'Luxury hotel room: ¥15,000-30,000 per night. Check-in: 3:00 PM, Check-out: 11:00 AM. Contact: +81-3-1234-5678';
            const result = await numeralTranslator.convertNumerals(input, 'hi');
            
            // Should preserve structure and convert numerals
            expect(result).to.include('Luxury hotel room:');
            expect(result).to.include('¥');
            expect(result).to.include('per night');
            expect(result).to.include('Check-in:');
            expect(result).to.include('PM');
            expect(result).to.include('AM');
            expect(result).to.include('+81-');
            
            // Should not contain original numerals
            expect(result).to.not.include('15,000');
            expect(result).to.not.include('30,000');
            expect(result).to.not.include('3:00');
            expect(result).to.not.include('11:00');
        });
        
        it('should handle restaurant menu with prices', async function() {
            const input = 'Sushi Set A: $25.99 (12 pieces), Ramen: $15.50, Sake: $8.00 per glass';
            const result = await numeralTranslator.convertNumerals(input, 'ar');
            
            // Should preserve menu structure
            expect(result).to.include('Sushi Set A:');
            expect(result).to.include('$');
            expect(result).to.include('pieces');
            expect(result).to.include('Ramen:');
            expect(result).to.include('Sake:');
            expect(result).to.include('per glass');
            
            // Should convert numerals
            expect(result).to.not.include('25.99');
            expect(result).to.not.include('15.50');
            expect(result).to.not.include('8.00');
        });
    });
}); 