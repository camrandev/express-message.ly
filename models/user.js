"use strict";

const { NotFoundError } = require("../expressError");
const db = require("../db");

/** User of the site. */

class User {
  /** Register new user. Returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    const result = await db.query(
      `INSERT INTO users (username,
                             password,
                             first_name,
                             last_name,
                             phone,
                             join_at,
                             last_login_at)
         VALUES
           ($1, $2, $3, $4, $5, current_timestamp, current_timestamp)
         RETURNING username, password, first_name, last_name, phone`,
      [username, password, first_name, last_name, phone]
    );

    return result.rows[0];
  }

  /** Authenticate: is username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    const result = await db.query(
      `SELECT FROM users
        WHERE username = $1 AND password = $2`,
      [username, password]
    );
    //console.log("RESULT IS:", result)

    return Boolean(result.rows[0]);
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    await db.query(
      `UPDATE users
        SET last_login_at = current_timestamp
        WHERE username = $1`,
      [username]
    );
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name}, ...] */

  static async all() {
    const result = await db.query(
      `SELECT username, first_name, last_name
      FROM users
    `
    );

    return result.rows;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const result = await db.query(
      `SELECT username,
                  first_name,
                  last_name,
                  phone,
                  join_at,
                  last_login_at
        FROM users
        WHERE username = $1
      `,
      [username]
    );

    if (!result.rows[0]) throw new NotFoundError("User does not exist");

    return result.rows[0];
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    const messages = await db.query(
      `SELECT id, to_username AS to_user, body, sent_at, read_at
        FROM messages
        WHERE from_username = $1
      `,
      [username]
    );

    await Promise.all(messages.rows.map(async function(message){
      const to_user = await User.get(message.to_user);

      delete to_user.last_login_at;
      delete to_user.join_at;

      message.to_user = to_user;
      return message;
    }));

    return messages.rows;
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const messages = await db.query(
      `SELECT id, from_username AS from_user, body, sent_at, read_at
        FROM messages
        WHERE to_username = $1
      `,
      [username]
    );

    await Promise.all(messages.rows.map(async function(message){
      const from_user = await User.get(message.from_user);

      delete from_user.last_login_at;
      delete from_user.join_at;

      message.from_user = from_user;
      return message;
    }));

    return messages.rows;
  }

}


module.exports = User;
