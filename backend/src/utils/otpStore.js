const otps = {};

exports.setOtp = (email, code) => {
    otps[email] = code;
};

exports.getOtp = (email) => {
    return otps[email];
};

exports.deleteOtp = (email) => {
    delete otps[email];
};