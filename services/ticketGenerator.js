function generateTicketNumber() {

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ123456789";

    let code = "EBUS-";

    for (let i = 0; i < 8; i++) {

        code += chars.charAt(
            Math.floor(Math.random() * chars.length)
        );

    }

    return code;
}

module.exports = {
    generateTicketNumber
};