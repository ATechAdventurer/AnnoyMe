"use strict";
require('dotenv').config();
const {HA_URL, HA_TOKEN} = process.env;

const express = require('express');
const csrf = require('csurf');
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser');
const rateLimit = require("express-rate-limit");

let csrfProtection = csrf({ cookie: true })

let que = [];
let intervalID;

let app = express();
app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
}));
const handlebars = require('express-handlebars');
//Sets our app to use the handlebars engine
app.set('view engine', 'handlebars');

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(csrf({ cookie: true }))
app.engine('handlebars', handlebars({
    layoutsDir: __dirname + '/views/layouts',
}));

app.get("/", (req, res) => {
    res.render('form', { layout: "index", csrfToken: req.csrfToken() });
});

app.post("/", csrfProtection, (req, res) => {
    res.redirect("/");
    if (!req.body.message) {
        return;
    }
    let { message, volume = 5, name = "None Provided" } = req.body;
    if(message > 255){
        message = message.slice(0,254);
    }
    que.push({message, volume, name});
    
    
    
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Listening`);
});


function sendMessage({message, volume, name}) {
    try{
    var unirest = require('unirest');
    var req = unirest('POST', `${HA_URL}/api/states/sensor.annoying_message`)
        .headers({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${HA_TOKEN}`
        })
        .send(JSON.stringify(
            {
                state: message,
                last_updated: new Date().toISOString(),
                attributes: {
                    name,
                    volume
                }
                
            }
        ))
        .end(function (res) {
            if (res.error) throw new Error(res.error);
        });
    }catch(e){
        console.warn(e.message);
        return;
    }
}

setInterval(() => {
    if(que.length == 0){
        return;
    }
    sendMessage(que[0]);
    que.shift();
}, 10000);