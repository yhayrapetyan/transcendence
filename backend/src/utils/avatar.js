function createRandomProfileImage(userIdentifier) {
	const sanitizedIdentifier = userIdentifier.replace(/[^a-zA-Z0-9]/g, '');
	const availableImageSets = [1, 2, 3, 5];
	const selectedSet = `set${availableImageSets[Math.floor(Math.random() * availableImageSets.length)]}`;
	const backgroundStyle = `bg${Math.floor(Math.random() * 2) + 1}`;
	return `${process.env.DEFAULT_AVATAR}${encodeURIComponent(sanitizedIdentifier)}?set=${selectedSet}&bgset=${backgroundStyle}`;
}

export { createRandomProfileImage }