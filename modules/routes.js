module.exports = function (express, app, path, bcrypt, dbClient, http) {

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
			req.session.user = 3;
			req.session.authenticated = true;
		}
		next();
	}

	function handleError(error, res){
		console.log(error);
		res.status(500).send({"message" : error});
	}

	function getAuthLink(){
		var {google} = require('googleapis');
		var OAuth2 = google.auth.OAuth2;

		var oauth2Client = new OAuth2(
			"620972017521-t60ui72f2ut4eqli2tekdn1qk2a2kses.apps.googleusercontent.com",
			"KqQV_skAYxsdlpb0QSTXUb3p",
			"http://localhost:5000/google-auth"
		);
		var url = oauth2Client.generateAuthUrl({
	   		access_type: 'offline',
			scope: ["https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"],
			approval_prompt : 'auto'
		});
		return url;
	}

	app.get("/", checkAuth, function (req, res, next) {
		var query = {
			text: 'select pictures.*, ' +
			'(select count(*) from favorites where favorites.pictureid = pictures.id) as likes, ' +
			'(select count(*) from favorites where (favorites.pictureid = pictures.id and favorites.userid = $1)) as userlikes' +
			' from pictures order by likes desc',
			values: [req.session.user]
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

	app.get("/google-auth", function (req, res, next) {

		var {google} = require('googleapis');
		var OAuth2 = google.auth.OAuth2;

		var oauth2Client = new OAuth2(
			"620972017521-t60ui72f2ut4eqli2tekdn1qk2a2kses.apps.googleusercontent.com",
			"KqQV_skAYxsdlpb0QSTXUb3p",
			"http://localhost:5000/google-auth"
		);
		oauth2Client.getToken(req.query.code, function (errTokens, tokens) {
			if (!errTokens) {
				oauth2Client.setCredentials(tokens);

				var oauth2 = google.oauth2({
				  auth: oauth2Client,
				  version: 'v2'
				});

				oauth2.userinfo.get(function(errUser, resUser) {
					if (errUser) {
						console.log(errUser);
					} else {
						console.log(resUser.data);
					}
				});
			} else {
				console.log("error to get tokens: " + errTokens);
			}
		});
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
			text: 'select pictures.*, ' +
			'(select count(*) from favorites where favorites.pictureid = pictures.id) as likes, ' +
			'(select count(*) from favorites where (favorites.pictureid = pictures.id and favorites.userid = $1)) as userlikes' +
			' from pictures where pictures.userid = $1',
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
			text: 'select *, (select count(*) from favorites where (favorites.pictureid = pictures.id)) as likes from favorites join pictures on (pictures.id = favorites.pictureid) where favorites.userid = $1',
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
