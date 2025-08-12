import { assert } from "@bella/assert";
import { generateId as generateIdAsync } from "@bella/id-generator/promise";

const POOL_MAX_SIZE = 50;
const POOL_MIN_SIZE = 25;

const ID_POOL: Array<string> = [];

let isRefillInProgress = false;

const refillPool = async () => {
	if (isRefillInProgress) {
		return;
	}

	const idsToGenerateCount = POOL_MAX_SIZE - ID_POOL.length;

	isRefillInProgress = true;

	await Promise.all(
		Array.from({ length: idsToGenerateCount }, async () => {
			const newId = await generateIdAsync();

			ID_POOL.push(newId);
		}),
	);

	// eslint-disable-next-line require-atomic-updates -- I'm pretty sure it's correct
	isRefillInProgress = false;
};

export const generateId = () => {
	const id = ID_POOL.shift();

	assert(id, "Trying to use ID from empty pool");

	if (ID_POOL.length < POOL_MIN_SIZE) {
		void refillPool();
	}

	return id;
};

void refillPool();
