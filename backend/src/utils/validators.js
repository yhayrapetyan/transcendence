export function verifyEmailFormat(emailAddress) {
	const emailValidationPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailValidationPattern.test(emailAddress);
}

export function verifyPasswordStrength(userPassword) {
	const passwordValidationPattern = /^(?=.*[A-Z]).{8,}$/;
	return passwordValidationPattern.test(userPassword);
}
  