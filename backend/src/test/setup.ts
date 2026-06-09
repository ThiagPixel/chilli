/**
 * Setup global de testes.
 * Garante defaults razoáveis para variáveis de ambiente que `loadEnv`
 * exige. Mesmo se já houver valor, sobrescrevemos para garantir
 * consistência em todo ambiente de teste.
 */
process.env['DATABASE_URL'] ??= 'postgres://chilli:chilli@localhost:5432/chilli_test';
process.env['JWT_SECRET'] ??= 'test-secret-must-be-at-least-32-chars-long-xxxx';
process.env['JWT_EXPIRES_IN'] ??= '1d';
process.env['NODE_ENV'] ??= 'test';
process.env['LOG_LEVEL'] ??= 'silent';
