function dd_mm_yy() {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0'); // Get day and pad with zero if needed
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = String(date.getFullYear()).slice(-2); // Get last two digits of the year

    return `${day}/${month}/${year}`; // Format as dd/mm/yy
}

module.exports = { dd_mm_yy };