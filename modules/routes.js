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
			req.session.user = 2;
			req.session.authenticated = true;
		}
		next();
	}

	function handleError(error, res){
		console.log(error);
		res.status(500).send({"message" : error});
	}

	app.get("/", checkAuth, function (req, res, next) {
		var query = {
			text: 'select pictures.*, (select count(*) from favorites where favorites.pictureid = pictures.id) as likes from pictures',
		}
		dbClient.query(query, (err, result) => {
			if (err){
				handleError("Error to get pictures: " + err, res);
			} else {
				res.render("index", {"pictures" : result.rows, "mode" : "all"});
			}
		});
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
		var query = {
			text: 'select pictures.*, (select count(*) from favorites where favorites.pictureid = pictures.id) as likes from pictures where pictures.userid = $1',
			values: [req.session.user]
		}
		dbClient.query(query, (err, result) => {
			if (err){
				handleError("Error to get pictures: " + err, res);
			} else {
				res.render("index", {"pictures" : result.rows, "mode" : "personal"});
			}
		});
	});

	app.get("/favorites", checkAuth, function (req, res, next) {
		var query = {
			text: 'select pictures.*, (select count(*) from favorites where favorites.pictureid = pictures.id) as likes from favorites where favorites.userid = $1',
			values: [req.session.user]
		}
		dbClient.query(query, (err, result) => {
			if (err){
				handleError("Error to get favorites: " + err, res);
			} else {
				res.render("index", {"pictures" : result.rows, "mode" : "favorites"});
			}
		});
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

	app.post("/delete", checkAuth, function (req, res, next) {
		// TODO: check if it is in favorites
		var query = {
			text: 'delete from pictures where id = $1)',
			values: [req.body.pictureid.trim()]
		}
		dbClient.query(query, (err, result) => {
			if (errInsert){
				handleError("Error to delete picture: " + err, res);
			} else {
				res.status(200).send({"message" : "delete-ok"});
			}
		});
	});

	app.post("/like", checkAuth, function (req, res, next) {
		var query = {
			text: 'insert into favorites (userid, pictureid) values ($1, $2)',
			values: [req.session.user, req.body.pictureid.trim()]
		}
		dbClient.query(query, (err, result) => {
			if (err){
				handleError("Error: " + err, res);
			} else {
				res.status(200).send({"message" : "like-ok"});
			}
		});
	});

	app.post("/unlike", checkAuth, function (req, res, next) {
		var query = {
			text: 'delete from favorites where (userid = $1 and pictureid = $2)',
			values: [req.session.user, req.body.pictureid.trim()]
		}
		dbClient.query(query, (err, result) => {
			if (err){
				handleError("Error: " + err, res);
			} else {
				res.status(200).send({"message" : "unlike-ok"});
			}
		});
	});

	app.get("*", function(req, res){
		res.status(404).send("Can not find the page");
	});
}
