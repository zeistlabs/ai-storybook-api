const Jwt = require("jsonwebtoken");
const jwtKey = 'ai-storybook';

const verifyToken = (req, res, next) => {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
        const bearer = bearerHeader.split(' ');
        const bearerToken = bearer[1];
        req.token = bearerToken;
        Jwt.verify(req.token, jwtKey, (err, authData) => {
            if (err) {
                res.status(401).send({ error: "Unauthorized" });
            } else {
                req.authData = authData;
                next();
            }
        });
    } else {
        res.status(401).send({ error: "Unauthorized" });
    }
};

module.exports = verifyToken;
