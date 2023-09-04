var express = require('express');
var bodyParser = require('body-parser');
var mysql = require('mysql2');
var path = require('path');
// var Chart = require('chart.js')
var connection = mysql.createConnection({
	host: '34.134.3.218',
	user: 'root',
	password: 'cs411',
	database: 'Youtube-Trending-Database'
});

connection.connect;

//express
var app = express();

// set up ejs view engine 
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '../public'));

var user_ = "";
var name_ = ""


// GET home page, respond by rendering index.ejs
app.get('/', function (req, res) {
	res.render('index', { title: 'Home Page', name: name_, data: [] });
});


// CREATE new user account or READS database to checks if user exists
app.post('/login_signup', function (req, res) {
	console.log("Clicked on submit");
	var username = req.body.uname;
	var password = req.body.pass;
	var name = "";
	user_ = username;
	name_ = username;

	// check if user exists and login is correct
	var sql = `SELECT * FROM User WHERE username = '${username}' and password ='${password}'`;
	console.log(sql)
	connection.query(sql, function (err, result) {
		if (err) {
			res.send(err)
			return;
		} else {
			if (result && result.length != 0) {
				console.log("User logged in successfully");
				console.log(result)
				if (result[0]['name'] != "") {
					name_ = result[name];
				} else {
					name_ = username;
				}
				res.render('index', { name: name_, data: [] });
			} else {
				console.log("Unable to find user. Creating a new account");
				var sql = `INSERT INTO User (username, password, name) VALUES ('${username}','${password}','${name}'); `;
				var sql2 = `INSERT INTO UserPoints (username, points, grade) VALUES ('${username}','0','None')`;
				console.log(sql);
				console.log(sql2);
				connection.query(sql, function (err, result) {
					if (err) {
						res.send(err)
						return;
					}
					connection.query(sql2, function (err, result) {
						if (err) {
							res.send(err)
							return;
						}
					});
					res.render('index', { name: name_, data: [] });
				});

			}
		}

	});

});

// SEARCH videos based on title, tags, updloadDate, and AlgorithmBias with sortBy feature
app.post('/SearchCell', function (req, res) {
	var title = req.body.title;
	var tags = req.body.tags;
	var uploadDate = req.body.uploaddate;
	var sortBy = req.body.sortby;
	var searchAlgorithmBias = req.body.searchalgo;

	switch (uploadDate) {
		case "today":
			uploadDate = "placeholder";
		case "this-week":
			uploadDate = "placeholder";
		case "this-month":
			uploadDate = "placeholder";
		case "this-year":
			uploadDate = "2023";
			break;
	}
	switch (sortBy) {
		case "Likes":
			sort_by = "likes";
		case "Views":
			sort_by = "view_count";
		case "Date":
			sort_by = "publishedAt";
	}
	console.log("Searching for videos with title matching: ", title, "with tags: ", tags, " uploadDate: ", uploadDate, "sorted by: ", sortBy, " using search algorithm: ", searchAlgorithmBias);

	var sql;
	if (searchAlgorithmBias == "channel-popularity") {
		sql = `SELECT video_id, title FROM Video NATURAL JOIN VideoDetails WHERE title LIKE '%${title}%' AND tags LIKE '%${tags}%' AND trending_date LIKE '%${uploadDate}%' AND channelId IN (SELECT channelId FROM Video NATURAL JOIN VideoDetails GROUP BY channelId HAVING COUNT(video_id)  > 2) LIMIT 15`;
	} else if (searchAlgorithmBias == "like-ratio") {
		sql = `SELECT video_id, title FROM Video NATURAL JOIN VideoDetails WHERE title LIKE '%${title}%' AND video_id NOT IN (SELECT * FROM (SELECT video_id FROM VideoDetails ORDER BY Dislikes DESC LIMIT 50) as t1) AND tags LIKE '%${tags}%' AND trending_date LIKE '%${uploadDate}%' ORDER BY comment_count DESC, likes DESC LIMIT 15`;
	}

	//var sql2 = `INSERT INTO SearchHistory (username, length, search_string) VALUES ('test1',0,'test title')`;
	var sql2 = `INSERT INTO SearchHistory (username, length, search_string) VALUES ('${user_}',${title.length},'${title}')`;
	console.log(sql2)
	console.log(sql);
	connection.query(sql, function (err, result) {
		if (err) {
			res.send(err)
			return;
		}
		// Insert into searchhistory
		connection.query(sql2, function (err, result) {
			if (err) {
				res.send(err)
				return;
			}
			console.log("Output: ", result);
			const sqlgrade = `CALL CalculateGrade()`;
			console.log(sqlgrade);
			connection.query(sqlgrade, function (err, result) {
				if (err) {
					res.send(err)
					return;
				}
			});
		});

		res.render('index', { name: name_, data: result });
		console.log("Output: ", result);
	});
});

//goes to account info page
app.post('/account_info', function (req, res) {
	// const grade_ ='';
	const sqlgrade = `SELECT grade FROM UserPoints WHERE username = '${user_}'`;
	console.log(sqlgrade);
	connection.query(sqlgrade, function (err, grade) {
		if (err) {
			res.send(err)
			return;
		}
		// console.log(result[0]['grade']);
		const sqlcreator = `Select title, tags, uservideoId from CreatorSuggestions where username = '${user_}'`;
		console.log(sqlcreator);
		connection.query(sqlcreator, function (err, result) {
			if (err) {
				res.send(err)
				return;
			}
			console.log(result);
			connection.query('SELECT grade, COUNT(*) AS count FROM UserPoints GROUP BY grade ORDER BY grade', (error, results, fields) => {
				if (error) throw error;

				// Extract the data from the MySQL results
				const labels = results.map(row => row.grade);
				const data = results.map(row => row.count);

				// Create a new chart with Chart.js
				const chartData = {
					labels: labels,
					datasets: [{
						label: 'Leaderboard Score Distribution',
						data: data,
						backgroundColor: 'rgba(54, 162, 235, 0.5)',
						borderColor: 'rgba(54, 162, 235, 1)',
						borderWidth: 1,
					}]
				};
				res.render('account', { username: user_, name: name_, grade: grade[0]['grade'], data: result, chartData: chartData });
			});

		});
	});

});


// UPDATE user info
app.post('/updateLogin', function (req, res) {
	console.log("Updating login");
	var username = req.body.uname;
	var password = req.body.pass;
	var name = req.body.name;
	var sql = `update User set password ='${password}', name = '${name}', username = '${username}' where username ='${user_}'`;
	if (password == "") {
		sql = `update User set name = '${name}', username = '${username}' where username ='${user_}'`;
	}
	console.log(sql);
	connection.query(sql, function (err, result) {
		if (err) {
			res.send(err)
			return;
		}
		user_ = username;
		name_ = name;
		res.render('index', { name: name_, data: [] });
	});
});

// DELETE user from database and logs out
app.post('/deleteAccount', function (req, res) {
	console.log("Deleting account for ", user_);
	var sql = `DELETE FROM User WHERE username = '${user_}'`;
	console.log(sql);
	connection.query(sql, function (err, result) {
		if (err) {
			res.send(err)
			return;
		}
		user_ = "";
		name_ = "";
		res.render('index', { name: name_, data: [] });
	});
});

app.post('/creator_suggestions', function (req, res) {
	res.render('suggestions');
});
app.post('/SearchForSuggestions', function (req, res) {
	var tags = req.body.tags;
	var sql = `Insert into CreatorSuggestions (userVideoId, username, tags, description, title, length) select video_id, '${user_}', tags, description, title, ${tags.length} from VideoDetails natural join Video where MATCH(VideoDetails.tags) against ('${tags}' in boolean mode) order by MATCH(VideoDetails.tags) against ('${tags}' in boolean mode) DESC limit 1;`;
	console.log(sql);
	connection.query(sql, function (err, result) {
		if (err) {
			res.send(err)
			return;
		}
		const sqlgrade = `CALL CalculateGrade()`;
		console.log(sqlgrade);
		connection.query(sqlgrade, function (err, result) {
			if (err) {
				res.send(err)
				return;
			}
		});
		res.render('index', { name: name_, data: [] });
	});
});
app.listen(80, function () {
	console.log('Node app is running on port 80');
});


