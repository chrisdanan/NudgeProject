#!/usr/bin/env node

"use strict";

var http = require("http"),
    querystring = require("querystring"),
    child_process = require("child_process");

function writeCSS(res) {
    res.writeHead(200, {
        "Content-Type": "text/css"
    });

    res.write("body{margin:auto; background-color: #98fffc;}\n");
    res.end();
}

function beginPage(res, title) {
    res.write("<!DOCTYPE html>\n");
    res.write("<html lang='en'>\n");
    res.write("<head>\n");
    res.write("<meta charset='utf-8'>\n");
    res.write("<title>"+ title + "</title>\n");
    res.write("<link rel='stylesheet' href='style.css' type='text/css'>\n");
    /*I tried to add bootstrap by linking the bootstrap files I have on my local machine, but that didn't seem to work:
    res.write("<link rel='stylesheet' href='css/bootstrap.min.css' />\n");
    In the end, I added bootstrap by using the bootstrap cdn, and it worked!*/
    //Bootstrap CDN for CSS:
    res.write("<link rel='stylesheet' href='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.2/css/bootstrap.min.css'>\n");
    res.write("</head>\n");
    res.write("<body>\n");
    //Create jumbotron div.
    res.write("<nav class='navbar navbar-inverse navbar-fixed-top'>\n");
    res.write("<div class='navbar-header'>\n");
    //res.write("<h3 class='text-info'>nudge.js</h3>\n");
    res.write("<p class='navbar-brand'>nudge.js</p>\n");
    res.write("</div>\n");
    res.write("</nav>\n");
    res.write("<div class='jumbotron'>\n");
    //res.write("<p class='text-info'>Hello Vane</p>\n");
}

function endPage(res) {
    //Close jumbotron div.
    res.write("</div>\n");
    /*I tried to add bootstrap by linking to the files I have on my local machine, but that didn't seem to work:
    res.write("<script src='http://code.jquery.com/jquery-1.11.2.min.js'></script>\n");
    res.write("<script src='js/bootstrap.min.js'></script>\n");
    So I used the bootstrap cdn instead, and it worked!*/
    //Bootstrap CDN for Javascript:
    res.write("<script src='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.2/js/bootstrap.min.js'></script>\n");
    res.write("</body>\n");
    res.write("</html>\n");
    res.end();
}

function writeHeading(res, tag, title) {
    res.write("<" + tag + ">" + title + "</" + tag + ">\n");
}

function writePre(res, divClass, data) {
    var escaped = data.replace(/</, "&lt;").
                       replace(/>/, "&gt;");

    res.write("<div class='" + divClass + "_div'>\n");
    res.write("<pre>");
    res.write(escaped);
    res.write("</pre>\n");
    res.write("</div>\n");
    res.write("</div>\n");
}

function beginForm(res) {
    res.write("<form method='POST' action='/push'>\n");
}

function endForm(res) {
    //End the div container for the branch and remote divs first.
    res.write("</div>\n");
    res.write("</div>\n");

    //Center button (or at least try to)
    res.write("<div class='container'>\n");
    res.write("<input type='submit' value='Push' class='btn btn-primary btn-lg'>\n");
    res.write("</div>\n");
    res.write("</form>\n");
}

function capitalize(str) {
    return str[0].toUpperCase() + str.slice(1);
}

//This does branch or remote divs and selects.
function beginSelect(res, what) {
    //Create cols:
    res.write("<div class='col-md-6'>\n");
    res.write("<div class='" + what + "_div'>\n");
    res.write("<label for='" + what + "_select'>" + capitalize(what) + "</label>\n");
    res.write("<select id='" + what + "_select' name='" + what + "'>\n");
}

function writeOption(res, option) {
    res.write("<option value='" + option + "'>" + option + "</option>\n");
}

function endSelect(res) {
    res.write("</select>\n");
    res.write("</div>\n");
    res.write("</div>\n");
}

function gitRemote(res) {
    child_process.exec("git remote", function(err, stdout, stderr) {
        if (err) {
            writeHeading(res, "h2", "Error listing remotes");
            writePre(res, "error", stderr);
            endPage(res);
        } else {
            var output = stdout.toString(),
                remotes = output.split(/\n/);

            beginSelect(res, "remote");

            remotes.forEach(function(remoteName) {
                if (remoteName) {
                    writeOption(res, remoteName);
                }
            });

            endSelect(res);
            endForm(res);
            endPage(res);
        }
    });
}

function gitBranch(res) {
    child_process.exec("git branch", function(err, stdout, stderr) {
        if (err) {
            writeHeading(res, "h2", "Error listing branches");
            writePre(res, "error", stderr);
            endPage(res);
        } else {
            var output = stdout.toString(),
                branches = output.split(/\n/);

            //Begin div container for the branch and remote divs.
            res.write("<div class='container'>\n");
            res.write("<div class='row'>\n");

            beginForm(res);
            beginSelect(res, "branch");

            branches.forEach(function(branch) {
                var branchName = branch.replace(/^\s*\*?\s*/, "").
                                        replace(/\s*$/, "");

                if (branchName) {
                    writeOption(res, branchName);
                }
            });

            endSelect(res);
            gitRemote(res);
        }
    });
}

function gitStatus(res) {
    child_process.exec("git status", function(err, stdout, stderr) {
        if (err) {
            writeHeading(res, "h2", "Error retrieving status");
            writePre(res, "error", stderr);
            endPage(res);
        } else {
            writeHeading(res, "h2", "Git Status");
            writePre(res, "status", stdout);
            gitBranch(res);
        }
    });
}

function gitPush(req, res) {
    var body = "";

    req.on("data", function(chunk) {
        body += chunk;
    });

    req.on("end", function () {
        var form = querystring.parse(body);

        child_process.exec("git push " + form.remote + " " + form.branch, function(err, stdout, stderr) {
            if (err) {
                writeHeading(res, "h2", "Error pushing repository");
                writePre(res, "error", stderr);
            } else {
                writeHeading(res, "h2", "Git Push");
                writePre(res, "push", stdout);
            }
            gitStatus(res);
        });
    });
}

function frontPage(req, res) {
    res.writeHead(200, {
        "Content-Type": "text/html"
    });

    if (req.url === "/style.css") {
        writeCSS(res);
    } else {
        var title = "Nudge - Web Interface for Git Push";

        beginPage(res, title);

        //Center content.
        res.write("<div class='container'>\n");

        writeHeading(res, "h1", title);

        if (req.method === "POST" && req.url === "/push") {
            gitPush(req, res);
        } else {
            gitStatus(res);
        }
    }
}

var server = http.createServer(frontPage);
server.listen();
var address = server.address();
console.log("nudge is listening at http://localhost:" + address.port + "/");
