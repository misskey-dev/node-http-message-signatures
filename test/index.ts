import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe } from '@jest/globals';

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

describe('test', () => {
});
