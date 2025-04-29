const express = require("express");
const router = express.Router();
const Users = require("../db/Users/Users");
const Jwt = require("jsonwebtoken");
const verifyToken = require("../middleware/verify_token");

const jwtKey = 'ai-storybook';

router.post("/register", async (req, res) => {
    try {
        let user = new Users(req.body);
        let result = await user.save();
        result = result.toObject();
        delete result.password;
        res.status(200).send(result);
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).send("Error registering user");
    }
});

router.post("/login", async (req, res) => {
    try {
        if (req.body.email && req.body.password) {
            let user = await Users.findOne(req.body).select("-password");
            if (user) {
                Jwt.sign({ user }, jwtKey, { expiresIn: "6h" }, (err, token) => {
                    if (err) {
                        res.status(500).send("Something went wrong");
                    } else {
                        user = user.toObject();
                        user.token = token;
                        res.status(200).send(user);
                    }
                });
            } else {
                res.status(400).send({ error: "Invalid Email or Password" });
            }
        } else {
            res.status(400).send("Missing Email or Password");
        }
    } catch (error) {
        res.status(500).send("Error logging in");
    }
});

router.get("/profile", verifyToken, async (req, res) => {
    if (req.authData.user._id) {
        res.status(200).send(req.authData.user);
    } else {
        res.status(401).send({ error: "Unauthorized" });
    }
});

module.exports = router;