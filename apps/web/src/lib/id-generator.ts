/*
Based on https://github.com/shuding/legid
MIT License

Copyright (c) 2025 Shu Ding
*/

/* eslint-disable fp/no-loops -- that's how it's supposed to be */

import { assert } from "#src/lib/assert.js";

const SALT = "custom-salt-for-id-generation";

const DEFAULT_ID_LENGTH = 16;

// eslint-disable-next-line no-secrets/no-secrets -- that's custom alphabet for ID generation
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"; // cspell:disable-line

const HEX_TO_ALPHABET_RATIO = 1.464_495;

const MAX_ID_LENGTH = 54;

const calculateHexLength = (alphabetLength: number) => Math.floor(alphabetLength * HEX_TO_ALPHABET_RATIO);

const hexToCustomAlphabet = (hex: string) => {
	if (!hex) {
		return "";
	}

	let decimal = BigInt(`0x${hex}`);
	let result = "";

	const base = BigInt(ALPHABET.length);

	do {
		const remainder = decimal % base;

		const char = ALPHABET[Number(remainder)];

		assert(char, "Char must exist here");

		result = char + result;
		decimal /= base;
	} while (decimal > 0n);

	return result;
};

const customAlphabetToHex = (customString: string) => {
	let decimal = 0n;
	const base = BigInt(ALPHABET.length);

	for (const char of customString) {
		const index = ALPHABET.indexOf(char);

		if (index === -1) {
			throw new Error(`Invalid character: ${char}`);
		}
		decimal = decimal * base + BigInt(index);
	}

	return decimal.toString(16);
};

const generateRandomHexToken = (length: number) => {
	const array = new Uint8Array(Math.ceil(length / 2));

	crypto.getRandomValues(array);

	assert(array[0] !== undefined, "Byte array can't be empty");

	while (array[0] < 16) {
		crypto.getRandomValues(array);
	}

	const hex = Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");

	return hex.slice(0, Math.max(0, length));
};

const arrayBufferToHex = (buffer: ArrayBuffer) => {
	const byteArray = new Uint8Array(buffer);

	return Array.from(byteArray, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const sha1 = async (text: string) => {
	const encoder = new TextEncoder();
	const data = encoder.encode(text);
	const hashBuffer = await crypto.subtle.digest("SHA-1", data);

	return arrayBufferToHex(hashBuffer);
};

export const createId = async ({ approximateLength = DEFAULT_ID_LENGTH, salt = SALT, step = 2 } = {}) => {
	if (approximateLength <= 0) {
		throw new Error("ID length must be a positive integer");
	}
	if (approximateLength > MAX_ID_LENGTH) {
		throw new Error(`ID length exceeds maximum of ${MAX_ID_LENGTH.toString()} characters`);
	}
	if (step <= 1) {
		throw new Error("Step must be at least 2");
	}

	const hexLength = calculateHexLength(approximateLength);

	if (step > hexLength - 1) {
		throw new Error(`Step cannot be greater than the data length: ${(hexLength - 1).toString()}`);
	}

	const hexToken = generateRandomHexToken(Math.ceil((hexLength * (step - 1)) / step));

	const hexHash = await sha1(salt + hexToken);

	let hexId = "";

	let tokenIndex = 0;
	let hashIndex = 0;

	for (let index = 0; index < hexLength; index += 1) {
		if ((index + 1) % step === 0) {
			const newChar = hexHash[hashIndex];

			assert(newChar, "Char must exist here");

			hexId += newChar;
			hashIndex += 1;
		} else {
			const newChar = hexToken[tokenIndex];

			assert(newChar, "Char must exist here");

			hexId += newChar;
			tokenIndex += 1;
		}
	}

	return hexToCustomAlphabet(hexId);
};

export const verifyId = async (id: string, { salt = SALT, step = 2 } = {}) => {
	if (!id || id.length > MAX_ID_LENGTH) {
		return false;
	}

	try {
		// Convert custom alphabet ID back to hex without specifying expected length
		const hexId = customAlphabetToHex(id);

		let extractedHexToken = "";
		let extractedHexHash = "";

		// eslint-disable-next-line @typescript-eslint/no-misused-spread -- that string contains only spreadable characters
		[...hexId].forEach((char, index) => {
			if ((index + 1) % step === 0) {
				extractedHexHash += char;
			} else {
				extractedHexToken += char;
			}
		});

		if (extractedHexHash.length === 0) {
			return false;
		}

		const expectedHexValue = await sha1(salt + extractedHexToken);

		return expectedHexValue.startsWith(extractedHexHash);
	} catch {
		return false;
	}
};

/* eslint-enable fp/no-loops -- that's how it's supposed to be */
