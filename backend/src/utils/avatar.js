function createRandomProfileImage(userIdentifier) {
    const sanitizedIdentifier = userIdentifier.replace(/[^a-zA-Z0-9]/g, '');

    const selectedStyle = 'pixel-art';

    return `${process.env.DEFAULT_AVATAR}${selectedStyle}/svg?seed=${encodeURIComponent(sanitizedIdentifier)}`;
}

export { createRandomProfileImage };