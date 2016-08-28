function login(req, res) {
    res.send("login...");
}

function signup(req, res) {
    res.send("register changed...");
}

module.exports = {
    login: login,
    signup: signup
};