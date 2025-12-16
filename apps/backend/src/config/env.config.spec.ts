import { validateEnv, envSchema } from './env.config';

describe('env.config', () => {
  describe('envSchema', () => {
    it('should accept valid environment variables', () => {
      const validEnv = {
        NODE_ENV: 'development',
        PORT: '3000',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      };

      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('development');
        expect(result.data.PORT).toBe(3000);
        expect(result.data.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');
      }
    });

    it('should use default values when not provided', () => {
      const minimalEnv = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      };

      const result = envSchema.safeParse(minimalEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('development');
        expect(result.data.PORT).toBe(3000);
      }
    });

    it('should reject invalid NODE_ENV', () => {
      const invalidEnv = {
        NODE_ENV: 'invalid',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      };

      const result = envSchema.safeParse(invalidEnv);
      expect(result.success).toBe(false);
    });

    it('should require DATABASE_URL', () => {
      const missingDb = {
        NODE_ENV: 'development',
        PORT: '3000',
      };

      const result = envSchema.safeParse(missingDb);
      expect(result.success).toBe(false);
    });

    it('should coerce PORT to number', () => {
      const env = {
        PORT: '8080',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      };

      const result = envSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.PORT).toBe('number');
        expect(result.data.PORT).toBe(8080);
      }
    });
  });

  describe('validateEnv', () => {
    it('should return validated config for valid input', () => {
      const validConfig = {
        NODE_ENV: 'production',
        PORT: '3001',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      };

      const result = validateEnv(validConfig);
      expect(result.NODE_ENV).toBe('production');
      expect(result.PORT).toBe(3001);
    });

    it('should throw for invalid config', () => {
      const invalidConfig = {
        NODE_ENV: 'invalid',
      };

      expect(() => validateEnv(invalidConfig)).toThrow('Invalid environment configuration');
    });
  });
});
