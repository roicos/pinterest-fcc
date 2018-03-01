module.exports = function (express, app, path, bcrypt, dbClient) {

	app.use(express.static(path.join(__dirname, "../public")));

	function checkAuth(req, res, next){
		var permitRequiredUrls = ["/pins", "/add", "/delete", "/like", "/favorites"];
		if (permitRequiredUrls.indexOf(req.url) > -1  && (!req.session || !req.session.authenticated)) {
			if(req.xhr){ // ajax request
				res.status(400).send({"message" : "You must be logged in for this action", "redirect" : "login"});
			} else {
				res.redirect("/login");
			}
		} else {
			next();
		}
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

    app.get("/pins", /*checkAuth,*/ function (req, res, next) {
        	res.render("pins", {});
    });

    app.post("/add", /*checkAuth,*/ function (req, res, next) {
            console.log(111);
            res.status(200).send({"message" : "You succesfully added picture.", "redirect" : "pins"});
    });

   	app.get("*", function(req, res){
   		res.status(404).send("Can not find the page");
    });
}
