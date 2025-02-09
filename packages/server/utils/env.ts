// import 'jsr:@std/dotenv/load';
// TODO: import right .env files based on the MODE

/**
 * Can be localhost and lan for now (2025-02-09)
 */
export const MODE = Deno.env.get('MODE') || 'localhost';
