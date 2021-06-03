const express = require('express');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ejs = require('ejs');
const {exec} = require('child_process');
const url = require('url');
const {Client} = require('pg');

var app = express();

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
        categories: categories
    });
});

app.get(["/index", "/", "/home"], function(req, res) {
    var ip = req.ip;
    // console.log(ip);
    
    res.render("pages/index", {
        ip: ip,
        images: checkImages("static"),
        animImages: checkImages("animated"),
        categories: categories
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
            genders: genders
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
            dateTime: dateTime
        })
    })
})

app.get("/*", function(req, res) {
    res.render("pages" + req.url, {
        images: checkImages("static"),
        animImages: checkImages("animated"),
        categories: categories
    }, function(err, renderResult) {
        if (err) {
            if (err.message.includes("Failed to lookup view")) {
                res.status(404).render("pages/404", {
                    categories: categories
                });
            } else {
                throw err;
            }
        } else { 
            res.send(renderResult);
        }
    });
});

app.listen(8080);
console.log("This app is listening on port 8080.");