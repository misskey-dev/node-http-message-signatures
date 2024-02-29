/*
 * SPDX-FileCopyrightText: mei23
 * SPDX-License-Identifier: MIT
 */

export type * from './types.js';
export * from './parse.js';
export * from './utils.js';
export * from './keypair.js';

export * from './shared/verify.js';

import * as draftParse from './draft/parse.js';
import * as draftSign from './draft/sign.js';
import * as draftVerify from './draft/verify.js';

export const HttpSignatureDraft = {
	...draftParse,
	...draftSign,
	...draftVerify,
};
/**
import * as rfc9421Parse from './rfc9421/parse.js';
import * as rfc9421Sign from './rfc9421/sign.js';
import * as rfc9421Verify from './rfc9421/verify.js';

export const RFC9421 = {
	...rfc9421Parse,
	...rfc9421Sign,
	...rfc9421Verify,
};
*/
