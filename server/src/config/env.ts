import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3335),
  DATABASE_URL: z.string().default('file:./dev.db'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  SESSION_SAME_SITE: z.enum(['lax', 'none']).default('lax'),
  SESSION_SECURE: z.enum(['true', 'false']).optional().transform(value => value === undefined ? undefined : value === 'true')
}).superRefine((value, context) => {
  const secure = value.SESSION_SECURE ?? value.NODE_ENV === 'production';
  if (value.NODE_ENV === 'production' && value.SESSION_SECURE === false) context.addIssue({ code: z.ZodIssueCode.custom, path: ['SESSION_SECURE'], message: 'Produção exige cookies Secure e HTTPS.' });
  if (value.SESSION_SAME_SITE === 'none' && !secure) context.addIssue({ code: z.ZodIssueCode.custom, path: ['SESSION_SECURE'], message: 'SameSite=None exige SESSION_SECURE=true e HTTPS.' });
});

let parsedEnv: z.infer<typeof envSchema>;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Erro crítico de variáveis de ambiente:', error.format());
  }
  process.exit(1);
}

export const env = parsedEnv;
