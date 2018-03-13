module.exports = function (express, app, path, bcrypt, dbClient, http) {

	app.use(express.static(path.join(__dirname, "../public")));

	function checkAuth(req, res, next){
		var permitRequiredUrls = ["/pins", "/add", "/delete", "/like", "/favorites"];
		if (permitRequiredUrls.indexOf(req.url) > -1  && (!req.session || !req.session.authenticated)) {
			if(req.xhr){ // ajax request
				res.status(400).send({"message" : "You must be logged in for this action"});
			} else {
				res.redirect("/");
			}
		} else {
			next();
		}
	}

	function handleError(error, res){
		console.log(error);
		res.status(500).send({"message" : error});
	}

	app.use(function(req, res, next) {
		res.locals.userid = req.session.userid;
		res.locals.username = req.session.username;
		next();
	});

	app.get("/", checkAuth, function (req, res, next) {
		var query = {
			text: 'select *, ' +
			'(select count(*) from favorites where favorites.pictureid = pictures.id) as likes, ' +
			'(select count(*) from favorites where (favorites.pictureid = pictures.id and favorites.userid = $1)) as userlikes' +
			' from users join pictures on (pictures.userid = users.id) order by likes desc',
			values: [req.session.userid]
		}

		dbClient.query(query, (err, result) => {
			if (err){
				handleError("Error to get pictures: " + err, res);
			} else {
				res.render("index", {"pictures" : result.rows, "mode" : "all"});
			}
		});
	});

	app.get("/:user([0-9]+)", checkAuth, function (req, res, next) {
		var id = req.params.user;
		var query = {
			text: 'select pictures.*, ' +
			'(select count(*) from favorites where favorites.pictureid = pictures.id) as likes, ' +
			'(select count(*) from favorites where (favorites.pictureid = pictures.id and favorites.userid = $1)) as userlikes' +
			' from pictures where pictures.userid = $2',
			values: [req.session.userid, id]
		}
		dbClient.query(query, (err, result) => {
			if (err){
				handleError("Error to get pictures: " + err, res);
			} else {
				res.render("index", {"pictures" : result.rows, "mode" : "all"});
			}
		});
	});

	app.post("/login", function (req, res, next) {
		res.status(200).send({"link" : getAuthLink()});
	});

	function getAuthLink(){
		var {google} = require('googleapis');
		var OAuth2 = google.auth.OAuth2;

		var oauth2Client = new OAuth2(
			"620972017521-t60ui72f2ut4eqli2tekdn1qk2a2kses.apps.googleusercontent.com",
			"KqQV_skAYxsdlpb0QSTXUb3p",
			"https://boiling-shore-61218.herokuapp.com/google-auth"
		);
		var url = oauth2Client.generateAuthUrl({
	   		access_type: 'offline',
			scope: ["https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"],
			approval_prompt : 'auto'
		});
		return url;
	}

	app.get("/google-auth", function (req, res, next) {

		var {google} = require('googleapis');
		var OAuth2 = google.auth.OAuth2;

		var oauth2Client = new OAuth2(
			"620972017521-t60ui72f2ut4eqli2tekdn1qk2a2kses.apps.googleusercontent.com",
			"KqQV_skAYxsdlpb0QSTXUb3p",
			"https://boiling-shore-61218.herokuapp.com/google-auth"
		);
		oauth2Client.getToken(req.query.code, function (errTokens,  tokens) {
			if (!errTokens) {
				oauth2Client.setCredentials(tokens);

				var oauth2 = google.oauth2({
				  auth: oauth2Client,
				  version: 'v2'
				});

				oauth2.userinfo.get(function(errUser, resUser) {
					if (errUser) {
						handleError("Error to get user data: " + errUser, res);
					} else {
						authorizeUser(resUser.data, req, res, next);
					}
				});
			} else {
				console.log(errTokens, res);
			}
		});
	});

	function authorizeUser(data, req, res, next){
		var querySelect = {
			text: 'select * from users where google_id = $1',
			values: [data.id]
		}
		dbClient.query(querySelect, (errSelect, resultSelect) => {
			if (errSelect){
				handleError("Error to get user: " + errSelect, res);
			} else {
				if(resultSelect.rows == 0){
					var queryInsert = {
						text: 'insert into users (google_id, email, username) values ($1, $2, $3) returning *',
						values: [data.id, data.email, data.name]
					}
					dbClient.query(queryInsert, (errInsert, resultInsert) => {
						if (errInsert){
							handleError("Error to register user: " + errInsert, res);
						} else {
							req.session.userid = resultInsert.rows[0].id;
							req.session.username = resultInsert.rows[0].username;
							req.session.authenticated = true;
							res.redirect("/");
						}
					});
				} else {
					req.session.userid = resultSelect.rows[0].id;
					req.session.username = resultSelect.rows[0].username;
					req.session.authenticated = true;
					res.redirect("/");
				}
			}
		});
	}

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
			text: 'select pictures.*, ' +
			'(select count(*) from favorites where favorites.pictureid = pictures.id) as likes, ' +
			'(select count(*) from favorites where (favorites.pictureid = pictures.id and favorites.userid = $1)) as userlikes' +
			' from pictures where pictures.userid = $1',
			values: [req.session.userid]
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
			text: 'select *, pictures.id as id, (select count(*) from favorites where (favorites.pictureid = pictures.id)) as likes from favorites join pictures on (pictures.id = favorites.pictureid) join users on (pictures.userid = users.id) where favorites.userid = $1',
			values: [req.session.userid]
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
			values: [req.session.userid, req.body.link.trim(), req.body.description.trim()]
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
		var id = req.body.pictureid.trim();
		var queryFavorites = {
			text: 'select count(*) from favorites where pictureid = $1',
			values: [id]
		}
		dbClient.query(queryFavorites, (errFavorites, resultFavorites) => {
			if (errFavorites){
				handleError("Error to count favorites: " + errFavorites, res);
			} else {
				if(resultFavorites.rows.count == 0){
					var queryDelete = {
						text: 'delete from pictures where id = $1',
						values: [id]
					}
					dbClient.query(queryDelete, (errDelete, resultDelete) => {
						if (errDelete){
							handleError("Error to delete picture: " + errDelete, res);
						} else {
							res.status(200).send({"message" : "delete-ok"});
						}
					});
				} else {
					res.status(400).send({"message" : "can not delete picture with 'likes'"});
				}
			}
		});
	});

	app.post("/like", checkAuth, function (req, res, next) {
		var query = {
			text: 'insert into favorites (userid, pictureid) values ($1, $2)',
			values: [req.session.userid, req.body.pictureid.trim()]
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
			values: [req.session.userid, req.body.pictureid.trim()]
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
