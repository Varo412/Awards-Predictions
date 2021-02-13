var express = require('express'),
    app = express(),
    port = process.env.PORT || 3000,
    mongoose = require('mongoose'),

    //created models loading here
    User = require('./api/models/user'),
    Category = require('./api/models/category'),
    Nominee = require('./api/models/nominee'),
    AwardEvent = require('./api/models/awardEvent'),

    bodyParser = require('body-parser');

// mongoose instance connection url connection
mongoose.Promise = global.Promise;
// mongoose.connect(`mongodb://${DBUri}:${DBPort}/${DBSchema}`);
mongoose.connect('mongodb://localhost:27017/AwardsPredictions');


app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());


var routes = require('./api/routes/userRoutes'); //importing route
routes(app); //register the route


app.listen(port);


console.log('AwardsPredictions API server started on: ' + port);