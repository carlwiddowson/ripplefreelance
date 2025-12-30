import {
  Currency,
  getCurrencyConfig,
  getRLUSDIssuer,
  formatCurrencyAmount,
  parseCurrencyAmount,
  RLUSD_TESTNET_ISSUER,
} from '../config';

describe('XRPL Currency Configuration', () => {
  describe('getCurrencyConfig', () => {
    it('should return XRP configuration', () => {
      const config = getCurrencyConfig(Currency.XRP);
      expect(config.code).toBe('XRP');
      expect(config.displayName).toBe('XRP');
      expect(config.decimals).toBe(6);
      expect(config.issuer).toBeUndefined();
    });

    it('should return RLUSD configuration', () => {
      const config = getCurrencyConfig(Currency.RLUSD);
      expect(config.code).toBe('RLUSD');
      expect(config.displayName).toBe('Ripple USD');
      expect(config.decimals).toBe(6);
      expect(config.issuer).toBeDefined();
    });
  });

  describe('getRLUSDIssuer', () => {
    it('should return testnet issuer in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const issuer = getRLUSDIssuer();
      expect(issuer).toBe(RLUSD_TESTNET_ISSUER);
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should return correct issuer format', () => {
      const issuer = getRLUSDIssuer();
      expect(issuer).toMatch(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/);
    });
  });

  describe('formatCurrencyAmount', () => {
    it('should format XRP amount to drops', () => {
      const formatted = formatCurrencyAmount('10', Currency.XRP);
      expect(formatted).toBe('10000000'); // 10 XRP = 10,000,000 drops
    });

    it('should format RLUSD amount as object', () => {
      const formatted = formatCurrencyAmount('100.5', Currency.RLUSD);
      expect(typeof formatted).toBe('object');
      expect((formatted as any).currency).toBe('RLUSD');
      expect((formatted as any).value).toBe('100.5');
      expect((formatted as any).issuer).toBe(RLUSD_TESTNET_ISSUER);
    });

    it('should handle decimal XRP amounts', () => {
      const formatted = formatCurrencyAmount('0.5', Currency.XRP);
      expect(formatted).toBe('500000'); // 0.5 XRP = 500,000 drops
    });

    it('should handle large RLUSD amounts', () => {
      const formatted = formatCurrencyAmount('1000000', Currency.RLUSD);
      expect((formatted as any).value).toBe('1000000');
    });
  });

  describe('parseCurrencyAmount', () => {
    it('should parse XRP drops to decimal', () => {
      const parsed = parseCurrencyAmount('10000000');
      expect(parsed.value).toBe(10);
      expect(parsed.currency).toBe(Currency.XRP);
    });

    it('should parse RLUSD object', () => {
      const amount = {
        currency: 'RLUSD',
        value: '100.5',
        issuer: RLUSD_TESTNET_ISSUER,
      };
      const parsed = parseCurrencyAmount(amount);
      expect(parsed.value).toBe(100.5);
      expect(parsed.currency).toBe(Currency.RLUSD);
    });

    it('should handle small XRP amounts', () => {
      const parsed = parseCurrencyAmount('1');
      expect(parsed.value).toBe(0.000001);
      expect(parsed.currency).toBe(Currency.XRP);
    });

    it('should throw error for invalid format', () => {
      expect(() => parseCurrencyAmount(123 as any)).toThrow('Invalid currency amount format');
    });
  });
});
