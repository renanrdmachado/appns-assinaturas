function formatError(error) {
    return {
        success: false,
        message: error.message,
        error: error.name
    };
}

module.exports = {
    formatError
};
