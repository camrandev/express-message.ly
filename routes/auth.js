"use strict";

const Router = require("express").Router;
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config.js");
const User = require("../models/user");
const { BadRequestError, UnauthorizedError } = require("../expressError.js");

const router = new Router();

/** POST /login: {username, password} => {token} */
router.post("/login", async function (req, res, next) {
  if (req.body === undefined) throw new BadRequestError();
  const { username, password } = req.body;

  const user = await User.authenticate(username, password);
  console.log("user after authenticate", user);

  if (user) {
    const token = jwt.sign({ username }, SECRET_KEY);
    console.log("token from /login=", token);
    return res.json({ token });
  }
  throw new UnauthorizedError("Invalid user/password");
});

/** POST /register: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 */
router.post("/register", async function (req, res, next) {
  if (req.body === undefined) throw new BadRequestError();
  const { username, password } = req.body;

  await User.register(req.body);

  if (await User.authenticate(username, password)) {
    const token = jwt.sign({ username }, SECRET_KEY);

    return res.json({ token });
  }

  throw new UnauthorizedError("Invalid user/password");
});

module.exports = router;
