const removeTrailingZeros = (num) => {
    // Convert number to string with fixed decimal places
    const str = Number(num).toFixed(5);
    // Remove trailing zeros after decimal point and trailing decimal point if no decimals
    return str.replace(/\.?0+$/, '');
};

const escapeMarkdown = (text) => {
    const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
    let escaped = text;
    specialChars.forEach(char => {
        escaped = escaped.replace(new RegExp('\\' + char, 'g'), '\\' + char);
    });
    return escaped;
}

const isSnowBall = (collection) => {
    return collection.type === 8;
}

module.exports = {removeTrailingZeros, escapeMarkdown, isSnowBall};
