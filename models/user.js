"use strict";

const { NotFoundError } = require("../expressError");
const db = require("../db");
const bcrypt = require("bcrypt");
const { BCRYPT_WORK_FACTOR } = require("../config");

/** User of the site. */

class User {
  /** Register new user. Returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

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
      [username, hashedPassword, first_name, last_name, phone]
    );

    return result.rows[0];
  }

  /** Authenticate: is username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    const result = await db.query(
      `SELECT password FROM users
        WHERE username = $1`,
      [username]
    );

    const user = result.rows[0];

    if (user) {
      if ((await bcrypt.compare(password, user.password)) === true) {
        return true;
      }
    }
    return false;
  }

  /** Update last_login_at for user */
  //TODO: Add error if user is not found use (RETURNING)
  static async updateLoginTimestamp(username) {
    await db.query(
      `UPDATE users
        SET last_login_at = current_timestamp
        WHERE username = $1
        RETURNING last_login_at`,
      [username]
    );
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name}, ...] */

  static async all() {
    const result = await db.query(
      `SELECT username, first_name, last_name
      FROM users
      ORDER BY username
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
  //TODO: refactor with join or two queries
  static async messagesFrom(username) {
    const messages = await db.query(
      `SELECT m.id, m.to_username AS to_user, m.body, m.sent_at, m.read_at,
      u.username, u.first_name, u.last_name, u.phone
      FROM messages AS m
      JOIN users AS u
      ON m.to_username = u.username
      WHERE from_username = $1
      `,
      [username]
    );

    for (const m of messages.rows) {
      const { username, first_name, last_name, phone } = m;

      m.to_user = {
        username,
        first_name,
        last_name,
        phone,
      };

      for (const key in m.to_user) {
        delete m[key];
      }
    }

    return messages.rows;

    //OLD CODE
    // await Promise.all(messages.rows.map(async function(message){
    //   const to_user = await User.get(message.to_user);

    //   delete to_user.last_login_at;
    //   delete to_user.join_at;

    //   message.to_user = to_user;
    //   return message;
    // }));
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */
  //TODO: refactor with join or two queries
  static async messagesTo(username) {
    const messages = await db.query(
      `SELECT m.id, m.from_username AS from_user, m.body, m.sent_at, m.read_at,
      u.username, u.first_name, u.last_name, u.phone
      FROM messages AS m
      JOIN users AS u
      ON m.from_username = u.username
      WHERE to_username = $1
      `,
      [username]
    );

    for (const m of messages.rows) {
      const { username, first_name, last_name, phone } = m;

      m.from_user = {
        username,
        first_name,
        last_name,
        phone,
      };

      for (const key in m.from_user) {
        delete m[key];
      }
    }

    return messages.rows;

    //OLD CODE
    //   await Promise.all(
    //     messages.rows.map(async function (message) {
    //       const from_user = await User.get(message.from_user);

    //       delete from_user.last_login_at;
    //       delete from_user.join_at;

    //       message.from_user = from_user;
    //       return message;
    //     })
    //   );

    //   return messages.rows;
  }
}

module.exports = User;
