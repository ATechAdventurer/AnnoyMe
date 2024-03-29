"use strict";
require("dotenv").config();
const { HA_URL, HA_TOKEN, DB_URL } = process.env;

const express = require("express");
const csrf = require("csurf");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const handlebars = require("express-handlebars");
const rateLimit = require("express-rate-limit");
const unirest = require("unirest");
const mongo = require("mongodb").MongoClient;

let csrfProtection = csrf({ cookie: true });

let queue = [];

mongo.connect(DB_URL, function (err, db) {
  if (err) throw err;
  const dbo = db.db("annoy");
  let app = express();
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // limit each IP to 100 requests per windowMs
    })
  );

  //Sets our app to use the handlebars engine
  app.set("view engine", "handlebars");

  app.use(express.static("public"));
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(csrf({ cookie: true }));
  app.engine(
    "handlebars",
    handlebars({
      layoutsDir: __dirname + "/views/layouts",
    })
  );

  app.get("/", (req, res) => {
    res.render("form", { layout: "index", csrfToken: req.csrfToken() });
  });

  app.post("/", csrfProtection, (req, res) => {
    res.redirect("/");
    if (!req.body.message) {
      return;
    }
    let { message, volume = 5, name = "None Provided" } = req.body;
    if (message > 255) {
      message = message.slice(0, 254);
    }
    if (name > 255) {
      name = name.slice(0, 254);
    }
    const ip = req.ip;
    console.log("Message Recived", message, name, volume);
    dbo
      .collection("messages")
      .insertOne({ message, name, volume, ip }, () => {});
    queue.push({ message, volume, name, ip });
  });

  app.listen(process.env.PORT || 3000, () => {
    console.log(`Listening`);
  });

  function sendMessage({ message, volume, name, ip, color }) {
    try {
      var req = unirest("POST", `${HA_URL}/api/states/sensor.annoying_message`)
        .headers({
          "Content-Type": "application/json",
          Authorization: `Bearer ${HA_TOKEN}`,
        })
        .send(
          JSON.stringify({
            state: `${name.length > 0 ? name + " says: " : ""}${message}`,
            last_updated: new Date().toISOString(),
            attributes: {
              name,
              volume,
              ip,
            },
          })
        )
        .end(function (res) {
          if (res.error) throw new Error(res.error);
        });
    } catch (e) {
      console.warn(e.message);
      return;
    }
  }

  setInterval(() => {
    if (queue.length == 0) {
      return;
    }
    sendMessage(queue[0]);
    queue.shift();
  }, 10000);
});
