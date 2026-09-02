import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3335),
  DATABASE_URL: z.string().default('file:./dev.db'),
  CLIENT_URL: z.string().default('http://localhost:5173')
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
