"use strict";
const express = require("express");
const Router = require("express").Router;
const router = new Router();

const { ensureLoggedIn } = require("../middleware/auth");
const { UnauthorizedError, BadRequestError } = require("../expressError");
const Message = require("../models/message.js");

/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Makes sure that the currently-logged-in users is either the to or from user.
 *
 **/
router.get("/:id", ensureLoggedIn, async function (req, res, next) {
  const message = await Message.get(req.params.id);

  const fromUserName = message.from_user.username;
  const toUserName = message.to_user.username;
  const currentUserName = res.locals.user.username;

  if (currentUserName === toUserName || currentUserName === fromUserName) {
    return res.json({ message });
  }

  throw new UnauthorizedError();
});

/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/
router.post("/:id", ensureLoggedIn, async function (req, res, next) {
  if (req.body === undefined) throw new BadRequestError();

  const { to_username, body } = req.body;
  const from_username = res.locals.user.username;

  const message = await Message.create({ from_username, to_username, body });
  await Message.sendSMS(message)

  return res.json({ message });
});

/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Makes sure that the only the intended recipient can mark as read.
 *
 **/
router.post("/:id/read", ensureLoggedIn, async function (req, res, next) {
  const message = await Message.get(req.params.id);
  const toUserName = message.to_user.username;
  const currentUserName = res.locals.user.username;

  if (toUserName === currentUserName) {
    const message = await Message.markRead(req.params.id);
    console.log("message inside if=", message);
    return res.json({ message });
  }

  throw new UnauthorizedError();
});

module.exports = router;
