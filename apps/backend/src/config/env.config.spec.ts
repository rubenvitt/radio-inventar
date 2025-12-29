import { validateEnv, envSchema } from './env.config';

describe('env.config', () => {
  describe('envSchema', () => {
    it('should accept valid environment variables', () => {
      const validEnv = {
        NODE_ENV: 'development',
        PORT: '3000',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        API_TOKEN: 'test-api-token-at-least-32-characters-long',
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
        API_TOKEN: 'test-api-token-at-least-32-characters-long',
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
        API_TOKEN: 'test-api-token-at-least-32-characters-long',
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
        API_TOKEN: 'test-api-token-at-least-32-characters-long',
      };

      const result = envSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.PORT).toBe('number');
        expect(result.data.PORT).toBe(8080);
      }
    });

    describe('PUBLIC_APP_URL validation', () => {
      it('should use localhost fallback when PUBLIC_APP_URL not provided in development', () => {
        const env = {
          NODE_ENV: 'development',
          DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
          API_TOKEN: 'test-api-token-at-least-32-characters-long',
        };

        const result = envSchema.safeParse(env);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.PUBLIC_APP_URL).toBe('http://localhost:5173');
        }
      });

      it('should accept valid HTTPS URL', () => {
        const env = {
          NODE_ENV: 'development',
          DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
          PUBLIC_APP_URL: 'https://radio-inventar.example.com',
          API_TOKEN: 'test-api-token-at-least-32-characters-long',
        };

        const result = envSchema.safeParse(env);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.PUBLIC_APP_URL).toBe('https://radio-inventar.example.com');
        }
      });

      it('should accept HTTP URL in development', () => {
        const env = {
          NODE_ENV: 'development',
          DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
          PUBLIC_APP_URL: 'http://localhost:5173',
          API_TOKEN: 'test-api-token-at-least-32-characters-long',
        };

        const result = envSchema.safeParse(env);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.PUBLIC_APP_URL).toBe('http://localhost:5173');
        }
      });

      it('should reject HTTP URL in production', () => {
        const env = {
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
          PUBLIC_APP_URL: 'http://radio-inventar.example.com',
          API_TOKEN: 'test-api-token-at-least-32-characters-long',
        };

        const result = envSchema.safeParse(env);
        expect(result.success).toBe(false);
      });

      it('should reject invalid URL format', () => {
        const env = {
          NODE_ENV: 'development',
          DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
          PUBLIC_APP_URL: 'not-a-valid-url',
          API_TOKEN: 'test-api-token-at-least-32-characters-long',
        };

        const result = envSchema.safeParse(env);
        expect(result.success).toBe(false);
      });

      it('should require HTTPS in production with explicit URL', () => {
        const env = {
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
          PUBLIC_APP_URL: 'https://radio-inventar.example.com',
          API_TOKEN: 'test-api-token-at-least-32-characters-long',
        };

        const result = envSchema.safeParse(env);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.PUBLIC_APP_URL).toBe('https://radio-inventar.example.com');
        }
      });
    });
  });

  describe('validateEnv', () => {
    it('should return validated config for valid input', () => {
      const validConfig = {
        NODE_ENV: 'production',
        PORT: '3001',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        PUBLIC_APP_URL: 'https://radio-inventar.example.com',
        API_TOKEN: 'test-api-token-at-least-32-characters-long',
      };

      const result = validateEnv(validConfig);
      expect(result.NODE_ENV).toBe('production');
      expect(result.PORT).toBe(3001);
      expect(result.PUBLIC_APP_URL).toBe('https://radio-inventar.example.com');
    });

    it('should throw for invalid config', () => {
      const invalidConfig = {
        NODE_ENV: 'invalid',
      };

      expect(() => validateEnv(invalidConfig)).toThrow('Invalid environment configuration');
    });

    it('should throw for HTTP URL in production', () => {
      const invalidConfig = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        PUBLIC_APP_URL: 'http://radio-inventar.example.com',
        API_TOKEN: 'test-api-token-at-least-32-characters-long',
      };

      expect(() => validateEnv(invalidConfig)).toThrow();
    });

    it('should reject API_TOKEN shorter than 32 characters', () => {
      const invalidConfig = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        API_TOKEN: 'too-short',
      };

      const result = envSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should require API_TOKEN', () => {
      const missingToken = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      };

      const result = envSchema.safeParse(missingToken);
      expect(result.success).toBe(false);
    });
  });
});
