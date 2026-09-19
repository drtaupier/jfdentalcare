import bcrypt from 'bcrypt';
import { randomInt } from 'crypto';

const requiredEnvironmentValue = (name: string): string => {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`Missing required environment variable: ${name}`);
	return value;
};

let legacyPepperWarningShown = false;

const passwordPepper = (): string => {
	const pepper = process.env.PEPPER?.trim();
	if (pepper) return pepper;

	const legacyPepper = process.env.PAPPER?.trim();
	if (legacyPepper) {
		if (!legacyPepperWarningShown) {
			console.warn(
				'Deprecated environment variable PAPPER detected; rename it to PEPPER.'
			);
			legacyPepperWarningShown = true;
		}
		return legacyPepper;
	}

	throw new Error('Missing required environment variable: PEPPER');
};

const passwordValue = (password: string): string =>
	password + passwordPepper();

export const validatePassword = (password: string): string[] => {
	const errors: string[] = [];
	if (password.length < 8) errors.push('at least 8 characters');
	if (!/[a-z]/.test(password)) errors.push('one lowercase letter');
	if (!/[A-Z]/.test(password)) errors.push('one uppercase letter');
	if (!/\d/.test(password)) errors.push('one number');
	if (!/[^A-Za-z0-9]/.test(password)) errors.push('one special character');
	return errors;
};

export const generateTemporaryPassword = (length = 16): string => {
	if (length < 8) throw new Error('Temporary password length must be at least 8');

	const groups = [
		'ABCDEFGHJKLMNPQRSTUVWXYZ',
		'abcdefghijkmnopqrstuvwxyz',
		'23456789',
		'!@#$%^&*',
	];
	const allCharacters = groups.join('');
	const characters = groups.map((group) => group[randomInt(group.length)]);

	while (characters.length < length) {
		characters.push(allCharacters[randomInt(allCharacters.length)]);
	}
	for (let index = characters.length - 1; index > 0; index -= 1) {
		const swapIndex = randomInt(index + 1);
		[characters[index], characters[swapIndex]] = [
			characters[swapIndex],
			characters[index],
		];
	}
	return characters.join('');
};

export const hashPassword = async (password: string): Promise<string> => {
	const saltRounds = Number(requiredEnvironmentValue('SALT_ROUNDS'));
	if (!Number.isInteger(saltRounds) || saltRounds < 10) {
		throw new Error('SALT_ROUNDS must be an integer of at least 10');
	}
	return bcrypt.hash(passwordValue(password), saltRounds);
};

export const verifyPassword = (
	password: string,
	passwordHash: string
): Promise<boolean> => bcrypt.compare(passwordValue(password), passwordHash);
