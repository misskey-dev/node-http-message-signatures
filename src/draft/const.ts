/**
 * Draftのalgorithm用
 */
export const keyHashAlgosForDraftEncofing = {
	'SHA': 'sha1',
	'SHA-1': 'sha1',
	'SHA-256': 'sha256',
	'SHA-384': 'sha384',
	'SHA-512': 'sha512',
	'MD5': 'md5',
} as const;

/**
 * Draftのalgorithm用
 */
export const keyHashAlgosForDraftDecoding = {
	'sha1': 'SHA',
	'sha256': 'SHA-256',
	'sha384': 'SHA-384',
	'sha512': 'SHA-512',
	'md5': 'MD5',
} as const;
