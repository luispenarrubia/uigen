import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder and TextDecoder for jsdom environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Set environment variables before any modules are imported
process.env.JWT_SECRET = "test-secret-key-for-testing";
process.env.NODE_ENV = "test";
