module.exports = function (express, app, path, bcrypt, dbClient) {

	app.use(express.static(path.join(__dirname, "../public")));

	function checkAuth(req, res, next){
		/*var permitRequiredUrls = ["/pins", "/add", "/delete", "/like", "/favorites"];
		if (permitRequiredUrls.indexOf(req.url) > -1  && (!req.session || !req.session.authenticated)) {
			if(req.xhr){ // ajax request
				res.status(400).send({"message" : "You must be logged in for this action", "redirect" : "login"});
			} else {
				res.redirect("/login");
			}
		} else {
			next();
		}*/
		if(req.session.user === undefined){
			req.session.user = 1;
			req.session.authenticated = true;
		}
		next();
	}

	function handleError(error, res){
		console.log(error);
		res.status(500).send({"message" : error});
	}

	app.get("/", checkAuth, function (req, res, next) {
    		res.render("index");
    });

	app.get("/login", function (req, res, next) {
    	res.render("login", {"errorMessage" : ""});
   	});

   	app.post("/login", function (req, res, next) {

    });

    app.get("/logout", function (req, res, next) {
		if (req.session) {
			req.session.destroy(function(err) {
				if(err) {
					return next(err);
				} else {
					return res.redirect("/");
				}
			});
		}
    });

    app.get("/pins", checkAuth, function (req, res, next) {
        	res.render("pins", {});
    });

    app.post("/add", checkAuth, function (req, res, next) {

		var query = {
			text: 'insert into pictures (userid, link, description) values ($1, $2, $3)',
			values: [req.session.user, req.body.link.trim(), req.body.description.trim()]
		}
		dbClient.query(query, (errInsert, resultInsert) => {
			if (errInsert){
				handleError("Error to insert new picture: " + errInsert, res);
			} else {
				res.status(200).send({"message" : "You succesfully added picture.", "redirect" : "pins"});
			}
		});

    });

   	app.get("*", function(req, res){
   		res.status(404).send("Can not find the page");
    });
}
