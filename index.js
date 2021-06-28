const express = require('express');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ejs = require('ejs');
const {exec} = require('child_process');
const url = require('url');
const {Client} = require('pg');
const session = require('express-session');
const formidable = require('formidable');
const crypto = require('crypto');
const nodemailer = require("nodemailer");
const xmljs = require('xml-js');
const request = require('request');
const { text } = require('express');
const SendmailTransport = require('nodemailer/lib/sendmail-transport');
const { getMaxListeners } = require('process');
const { CLIENT_RENEG_WINDOW } = require('tls');

var app = express();

app.use(["/contact"], express.urlencoded({extended: true}));

app.use(session({
    secret: 'safaera',
    resave: true,
    saveUninitialized: false
}));

const client = new Client({
    host: 'localhost',
    user: 'david',
    password: 'david',
    database: 'tennis_garage',
    port: 5432
});

client.connect();

app.set("view engine", "ejs");
app.use("/resurse", express.static(__dirname + "/resurse"));

// TODO extra-functionalities
// contopeste titlul cu sectiunile you know

function toCapital(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

var categories = [];
var genders = [];

client.query(
    "select enumlabel from pg_catalog.pg_enum where enumtypid = 16448;", function(err, res) {
        let i = 0;

        for (let c of res.rows) {
            categories[i++] = c.enumlabel;
        }
    }
);

client.query(
    "select enumlabel from pg_catalog.pg_enum where enumtypid = 16466;", function(err, res) {
        let i = 0;

        for (let c of res.rows) {
            genders[i++] = toCapital(c.enumlabel);
        }
    }
);

var monthName = ["January", "February", "March", "April", "May", "June", "July",
                "August", "September", "October", "November", "December"];
var dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatDate(date) {
    let day = date.getDate();
    let str = dayOfWeek[date.getDay()] + ", the " + day;

    if (day % 10 == 1) {
        str += "st";
    } else if (day % 10 == 2) {
        str += "nd";
    } else if (day % 10 == 3) {
        str += "rd";
    } else {
        str += "th";
    }
    
    return str + " of " + monthName[date.getMonth()] + " " + date.getFullYear();
}

function checkTime(time) {
    let h1 = time.slice(0, 2);
    let m1 = time.slice(3, 5);
    let h2 = time.slice(6, 8);
    let m2 = time.slice(9, 11);
    
    let d = new Date();
    let h = d.getUTCHours() + 3;
    let m = d.getUTCMinutes();

    if (h > 23) {
        h -= 24;
    }

    return h1 < h && h < h2 || h1 == h && m1 <= m || h == h2 && m <= m2;
}

var n;

function randomize() {
    n = 10;

    while (n == 10) {
        n = Math.floor(Math.random() * 5) + 7;
    }

    return n;
}

function checkImages(type) {
    var fileContent = fs.readFileSync("resurse/json/gallery.json");
    var parsedContent = JSON.parse(fileContent);
    var galleryPath = parsedContent.gallery_path;

    var imgArray = [];
    var animatedImgArray = [];

    for (let image of parsedContent.images) {
        var bigImage = path.join(galleryPath, image.path);
        var ext = path.extname(image.path);
        var fileName = path.basename(image.path, ext);

        var mediumImage = path.join(galleryPath + "/medium/", fileName + "-medium" + ".jpg");
        var smallImage = path.join(galleryPath + "/small/", fileName + "-small" + ".webp");

        if (checkTime(image.time))
            imgArray.push({big: bigImage, medium: mediumImage, small: smallImage, title: image.title, 
                description: image.description, time: image.time, license: image.license});

        animatedImgArray.push({big: bigImage, medium: mediumImage, small: smallImage, title: image.title, 
            description: image.description, time: image.time, license: image.license});

        if (!fs.existsSync(mediumImage)) {
            sharp(bigImage)
                .resize(400)
                .toFile(mediumImage, function(err) {
                    if (err)
                        console.log("conversion error", bigImage, "->", mediumImage, err);
                });
        }

        if (!fs.existsSync(smallImage)) {
            sharp(bigImage)
                .resize(250)
                .toFile(smallImage, function(err) {
                    if (err)
                        console.log("conversion error", bigImage, "->", smallImage, err);
                });
        }
    }

    if (type == "static") {
        return imgArray;
    } else {
        var shuffled = animatedImgArray.sort(() => 0.5 - Math.random());
        randomize();

        return shuffled.slice(0, n);
    }
}

app.get("*/animated-gallery.css", function(req, res) {
    res.setHeader("Content-Type", "text/css");
    let scssString = fs.readFileSync("./resurse/sass/animated-gallery.scss").toString("utf-8");
    let scssResult = ejs.render(scssString, {imgCount: n});

    // console.log(scssResult);

    fs.writeFileSync("./temp/animated_gallery.scss", scssResult);
    exec("sass ./temp/animated_gallery.scss ./temp/animated_gallery.css", (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            res.end();
            return;
        } else if (stderr) {
            console.log(`stderr: ${stderr}`);
            res.end();
            return;
        }

        // console.log(`stdout: ${stdout}`);
        res.sendFile(path.join(__dirname, "temp/animated_gallery.css"));
    });
});

app.get("*/gallery.json", function(req, res) {
    res.status(403).render("pages/403", {
        categories: categories,
        user: req.session.user
    });
});

app.get(["/index", "/", "/home"], function(req, res) {
    client.query("select username from users where user_id in (select distinct user_id from accessings" + 
        " where now() - accessing_date < interval '10 minutes');").then(function(result) {
            console.log('result: ', result.rows);

            var location = '';

            request(
                'https://secure.geobytes.com/GetCityDetails?key=7c756203dbb38590a66e01a5a3e1ad96&fqcn=109.99.96.15',
                function(error, response, body) {
                    if (error) {
                        console.log('error: ', error);
                    } else {
                        var locationObject = JSON.parse(body);
                        location = locationObject.geobytescountry + ' ' + locationObject.geobytesregion;
                    }

                    var events = [{
                        text: 'Australian Open',
                        date: '15/01/2021'
                    }, {
                        text: 'BNP Paribas Open',
                        date: '12/03/2021'
                    }, {
                        text: 'Mutua Madrid Open',
                        date: '03/05/2021'
                    }, {
                        text: 'Roland Garros',
                        date: '29/05/2021'
                    }, {
                        text: 'The Championships: Wimbledon',
                        date: '28/06/2021'
                    }, {
                        text: 'Tokyo Olympics 2021',
                        date: '25/07/2021'
                    }, {
                        text: 'US Open',
                        date: '23/08/2021'
                    }, {
                        text: 'Nitto ATP Finals',
                        date: '07/11/2021'
                    }];
                    
                    let currentDate = new Date();
                    // events = events.sort(() => 0.5 - Math.random()).slice(0, 5);

                    res.render("pages/index", {
                        events: events,
                        location: location,
                        onlineUsers: result.rows,
                        user: req.session.user,
                        images: checkImages("static"),
                        categories: categories
                    });
                }
            );
        }, 
        function(err) {
            if (err) {
                console.log("error: ", err);
            }
        });
});

app.get("/shop", function(req, res) {
    let condition = (req.query.type && req.query.type != 'all') ? " and category = '" + req.query.type + "';" : ";";

    client.query("select * from items where 1 = 1" + condition, function(err, result) {
        let items = result.rows;

        for (let i = 0; i < items.length; ++i) {
            items[i].category = toCapital(items[i].category);
            items[i].gender = toCapital(items[i].gender);
        }

        res.render("pages/shop", {
            items: items,
            categories: categories,
            genders: genders,
            user: req.session.user
        });
    });
});

app.get("/item/:item_id", function(req, res) {
    console.log(req.params);

    const queryResult = client.query("select * from items where id = " + req.params.item_id, function(err, result) {
        let item = result.rows[0];
        let dateTime = item.release_date;

        item.release_date = formatDate(item.release_date);
        item.category = toCapital(item.category);
        item.gender = toCapital(item.gender);

        res.render("pages/item", {
            item: item,
            categories: categories,
            dateTime: dateTime,
            user: req.session.user
        })
    })
})

// ----------------------------------------- USERS ----------------------------------------------

let serverPassword = "tennisgarage";

function getUser(req) {
    var user;

    if (req.session) {
        user = req.session.user;
    } else {
        user = null;
    }

    return user;
}

setInterval(function() {
    let command = `delete from accessings where now() - accessing_date > interval '10 minutes';`;

    client.query(command, function(err, res) {
        if (err) {
            console.log(err);
        }
    });
}, 10 * 60 * 1000);

app.use(function(req, res, next) {
    let command = `insert into accessings(ip, user_id, page) values($1::text, $2, $3::text);`;

    if (req.ip) {
        var userId = req.session.user ? req.session.user.user_id : null;
        console.log(userId);

        client.query(command, [req.ip, userId, req.url], function(err, result) {
            if (err) {
                console.log(err);
            }
        });
    }

    next();
});

async function sendEmail(email, username, lastName, firstName) {
    var transp = nodemailer.createTransport({
        service: "gmail",
        secure: false,
        auth: {
            user: "tennis.garage0@gmail.com",
            pass: "#Tenn1sGarage"
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    await transp.sendMail({
        from: "tennis.garage0@gmail.com",
        to: email,
        subject: "Hi, " + firstName + " " + lastName + "!",
        text: "Your username on Tennis Garage is " + username + ".",
        html: "<h1>Hi!</h1><p>Your username on <span style='font-weight: bold; font-style: italic;" 
            + " text-decoration: underline;'>Tennis Garage</span> is " + username + ".</p>" 
    });

    console.log("mail sent");
}

app.post("/login", function(req, res) {
    let form = formidable.IncomingForm();

    form.parse(req, function(err, textFields) {
        let encryptedPassword = crypto.scryptSync(textFields.password, serverPassword, 32).toString('ascii');
        let command = `select user_id, username, last_name, first_name, email, registration_date, role, ` + 
            `phone, profile_picture from users where username = $1::text and password = $2::text;`;
        
        console.log(encryptedPassword, command);

        client.query(command, [textFields.username, encryptedPassword], function(err, result) {
            if (!err) {
                console.log(result.rows);

                if (result.rows.length == 1) {
                    req.session.user = {
                        user_id: result.rows[0].user_id,
                        username: result.rows[0].username,
                        last_name: result.rows[0].last_name,
                        first_name: result.rows[0].first_name,
                        email: result.rows[0].email,
                        registration_date: result.rows[0].registration_date,
                        role: result.rows[0].role,
                        phone: result.rows[0].phone,
                        profile_picture: result.rows[0].profile_picture
                    }

                    console.log(req.session.user);
                }
            } else {
                res.redirect("/login");
            }

            res.redirect("/index");
        });
    });
});

app.get("/logout", function(req, res) {
    req.session.destroy();
    res.redirect("/index");
})

app.post("/reg", function(req, res) {
    console.log("data received");

    var username;
    var imgPath;
    let form = formidable.IncomingForm();

    form.parse(req, function(err, textFields, fileFields) {
        console.log(textFields);
        let formError = '';

        client.query('select * from users where username = ' + textFields.username + ';', function(err, result) {
            if (result) {
                formError += 'Username already exists. ';
            }
        });

        if (textFields.phone != '' && !textFields.phone.match("^(\\+4)?0[0-9]{9,}$")) {
            formError += 'Phone number is invalid. ';
        }

        if (!formError) {
            let encryptedPassword = crypto.scryptSync(textFields.password, serverPassword, 32).toString('ascii');
            let command = `insert into users (username, last_name, first_name, email, password, phone, profile_picture) `;
            command += `values($1::text, $2::text, $3::text, $4::text, $5::text, $6::text, $7::text);`;

            console.log(command);

            client.query(command, [
                textFields.username, textFields.last_name, textFields.first_name, 
                textFields.email, encryptedPassword, textFields.phone, imgPath
            ], function(err, resp) {
                if (err) {
                    console.log(err);
                    res.render("pages/register", {
                        err: "Database error! Try again later.",
                        response: "Data hasn't been processed.",
                        categories: categories,
                        user: req.session.user
                    });
                } else {
                    res.render("pages/register", {
                        err: "",
                        response: "Registration successful!",
                        categories: categories,
                        user: req.session.user
                    });
                    sendEmail(textFields.email, textFields.username, textFields.last_name, textFields.first_name);
                    console.log(textFields.email);
                }
            })
        } else {
            res.render("pages/register", {
                err: "Form error! " + formError,
                response: "",
                categories: categories,
                user: req.session.user
            });
        }
    });

    form.on("fileBegin", function(name, fileField) {
        if (fileField && fileField.name != "") {
            var path = __dirname + "/resurse/uploaded_pictures/" + username;

            if (!fs.existsSync(path)) {
                fs.mkdirSync(path);
            }

            fileField.path = path + "/" + fileField.name;
            imgPath = "/resurse/uploaded_pictures/" + username + "/" + fileField.name;
        }
    });

    form.on("field", function(name, field) {
        if (name == 'username') {
            username = field;
        }
    });

    form.on("file", function(name, field) {
        console.log("end of upload: ", name);
    });
});

app.get("/users", function(req, res) {
    if (req.session && req.session.user && req.session.user.role == "admin") {
        client.query(
            "select * from users", function(err, result) {
                if (err) {
                    throw err;
                } else {
                    res.render("pages/users", {
                        users: result.rows,
                        user: req.session.user,
                        categories: categories
                    })
                }
            }
        )
    } else {
        res.status(403).render("pages/403", {
            categories: categories,
            user: req.session.user
        })
    }
});

app.post("/prom", function(req, res) {
    if (req.session && req.session.user && req.session.user.role == "admin") {
        var form = formidable.IncomingForm();

        form.parse(req, function(err, textFields) {
            var command;
            
            if (textFields.user_role == "admin") {
                command = `update users set role = 'common' where user_id = '${textFields.user_id}';`
            } else {
                command = `update users set role = 'admin' where user_id = '${textFields.user_id}';`
            }
            
            client.query(command, function(err, result) {
                // if (err) {
                //     throw err;
                // } else {
                //     if (textFields.role == "admin") {
                //         alert("User demoted.");
                //     } else {
                //         alert("User promoted.");
                //     }
                // }
            });
        });

        res.redirect("/users");
    }
});

app.get("/*", function(req, res) {
    res.render("pages" + req.url, {
        images: checkImages("static"),
        animImages: checkImages("animated"),
        categories: categories,
        user: req.session.user
    }, function(err, renderResult) {
        if (err) {
            if (err.message.includes("Failed to lookup view")) {
                res.status(404).render("pages/404", {
                    categories: categories,
                    user: req.session.user
                });
            } else {
                throw err;
            }
        } else { 
            res.send(renderResult);
        }
    });
});

// app.listen(8080);
// console.log("This app is listening on port 8080.");

app.listen(process.env.PORT || port, function() {
    console.log(`This app is listening at http://localhost:${port}.`);
});