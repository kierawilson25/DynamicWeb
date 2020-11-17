// Built-in Node.js modules :
let fs = require('fs');
let path = require('path');

// NPM modules
let express = require('express');
let sqlite3 = require('sqlite3');
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants');
const { table } = require('console');
const { resolve } = require('path');


let public_dir = path.join(__dirname, 'public');
let template_dir = path.join(__dirname, 'templates');
let db_filename = path.join(__dirname, 'db', 'usenergy.sqlite3');

let app = express();
let port = 8000;

// open usenergy.sqlite3 database
let db = new sqlite3.Database(db_filename, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.log('Error opening ' + db_filename);
    }
    else {
        console.log('Now connected to ' + db_filename);
    }
});

function generateStateTable(data) {
    //Generate the table data

    let table = "";
    let key;
    for(key in data) {
        let item = data[key];
        table = table + " <tr> ";
        let total = 0;
        for(let element in item) {
            if(element != "year") {
                table = table + " <td>" + item[element] + "</td> ";
                if(element != "state_abbreviation") {
                    total = total + parseInt(item[element]);
                }
            }
        }
        table = table + " <td>" + total + "</td> "
        table = table + " </tr>";
    }
    return table;
}

app.use(express.static(public_dir)); // serve static files from 'public' directory


// GET request handler for home page '/' (redirect to /year/2018)
app.get('/', (req, res) => {
    res.redirect('/year/:2018');
});

// GET request handler for '/year/*'
app.get('/year/:selected_year', (req, res) => {
    console.log(req.params.selected_year);
    fs.readFile(path.join(template_dir, 'year.html'), 'utf8', (err, template) => {
        // modify `template` and send response
        // this will require a query to the SQL database
        if(err)
        {
            res.status(404).send('Error: No data found');
        }
        else {
            // NOTE: .all gets ALL results from the query, .get only gets the first query
            // database data 
            // This is the query we need to use "SELECT * FROM Consumption WHERE year = selected_year"
            // This should work but I haven't tested it yet
            let query = 'SELECT * FROM Consumption WHERE year = ?';
            let year = 2018;
            if(req.params.selected_year.includes(":")) {
                year = parseInt(req.params.selected_year.slice(1, 5));
            } else {
                year = req.selected_year;
            }    
            var year_rows;
            //const getReplacement = str => Promise.resolve('[${str}]');
            //const promises = [];
            //template = template.replace("{{YEAR_TABLE}}", data => {
               // promises.push(getReplacement(data));
            //});

            var tb = "";

            var queryDonePromise = new Promise(function(resolve, reject) {
                db.all(query, [year], (err, rows) => {
                    if(err) {
                        console.log("Error in query for Year");
                        reject();
                    } else {
                        year_rows = rows;
                    }
                    resolve(year_rows);
                });

            }).then(data => {
                // Table
                // Write everything as strings not creating elements
                // Note: Table and table headers can be put in the html (things that are going to be the same on every page)
                tb = tb + generateStateTable(data);
                template = template.replace("{{YEAR_TABLE}", tb);
                
            });
            console.log(tb);


            // Replaces the header year \\
            template = template.replace("{{YEAR}}", year);
            // End Replace header year \\

            
            // End replace table \\

            // Previous and Next Years \\
            // Prev Link
            let prev_link = "<a href=";
            let prev_year = year;
            if(year == 1960) {
                prev_year = 2018;
            } else {
                prev_year = prev_year - 1;
            }
            prev_link = prev_link + '/year/:' + prev_year + ">Previous Year: " + prev_year + "</a>";


            //Next Link
            let next_link = "<a href=";
            let next_year = year;
            if(year == 2018) {
                next_year = 1960;
            } else {
                next_year = next_year + 1;
            }
            next_link = next_link + '/year/:' + next_year + ">Next Year: " + next_year + "</a>";
            
            template = template.replace("{{PREV_YEAR}}", prev_link);
            template = template.replace("{{NEXT_YEAR}}", next_link);
            // End of Previous and Next Years \\

            res.status(200).type('html').send(template); // <-- you may need to change this
            res.end();
        }


        
    });
});

// GET request handler for '/state/*'
app.get('/state/:selected_state', (req, res) => {
    console.log(req.params.selected_state);
    fs.readFile(path.join(template_dir, 'state.html'), 'utf8', (err, template) => {
        // modify `template` and send response
        // this will require a query to the SQL database
        if(err)
        {
            res.status(404).send('Error: No data found');
        }
        else {
            // database data
            // This is the query we will use
            // SELECT * FROM Conspumtion JOIN States WHERE state_name = selected_state
            let query = 'SELECT * FROM Consumption JOIN States WHERE state_name = ?';
            let state_name = req.params.selected_state;
            let state_rows;
            var queryDonePromise = new Promise(function(resolve, reject) {
                db.all(query, [state_name], (err, rows) => {
                    if(err) {
                        console.log("Error in query for State");
                    } else {
                        state_rows = rows;
                    }
                });

                // This is to get a list of states to use for next and prev states
                var states = 0;
                db.all("SELECT * FROM States", [], (err, rows) => {
                    if(err) {
                        console.log("Error in query in States for States for next and prev");
                    } else {
                        states = rows;
                    }
                });
                //if(state_rows.length == 0)
            }).then(data => {
                console.log("Hello");
            });

            // Index of State is a pointer into state to indicate what spot the current state is at
            // That spot contains the state's full name and the abbreviation of the state
            let indexOfState = -1;
            let i = 0;
            while(indexOfState == -1) {
                if(state[i][state_name] == selected_state) {
                    indexOfState = i;
                }
            }

            // Previous and Next States \\
            // Prev Link
            let prev_link = "<a href=";
            let prev_state;
            if(indexOfState == 0) {
                prev_state = state[state.length][state_name];
            } else {
                prev_state = state[indexOfState + 1][state_name];
            }
            prev_link = prev_link + '/state/:' + prev_state + ">Previous State: " + prev_state + "</a>";

            //Next Link
            let next_link = "<a href=";
            let next_state;
            if(indexOfState == state.length - 1) {
                next_state = state[0][state_name];
            } else {
                next_state = state[indexOfState - 1][state_name];
            }
            next_link = next_link + '/state/:' + next_state + ">Next State: " + next_state + "</a>";
            
            template = template.replace("{{PREV_STATE}}", prev_link);
            template = template.replace("{{NEXT_STATE}}", next_link);
            // Previous and Next Years \\

            // Get the picture \\
            state_img = "<img src=" + "\"" + state[indexOfState][state_name] + ".jpg" + "\"" + " alt=" + "\"" + state[indexOfState][state_name] + "\"";
            
            template = template.replace("{{STATE_IMAGE}}", state_img);

            res.status(200).type('html').send(template); // <-- you may need to change this
            res.write(template.replace('{{STATE}}', req.params.selected_state))
            res.end();
        }
    });
});

// GET request handler for '/energy/*'
app.get('/energy/:selected_energy_source', (req, res) => {
    console.log(req.params.selected_energy_source);
    fs.readFile(path.join(template_dir, 'energy.html'), 'utf8', (err, template) => {
        // modify `template` and send response
        // this will require a query to the SQL database
        if(err)
        {
            res.status(404).send('Error: No data found');
        }
        else {
            // database data
            // This is the query we will use
            // SELECT * FROM Conspumtion
            var query = 'SELECT * FROM Consumption ORDER BY year, state';
            //Loop thru rows, make dict of dicts if the year already exists, check if the state exists, then add it or not depending on if it exists or not
            //var state_name = selected_state;
            let energy_rows;
            db.all(query, [], (err, rows) => {
                if(err) {
                    console.log("Error in query for Source");
                } else {
                    energy_rows = rows;
                }
            });


            res.status(200).type('html').send(template); // <-- you may need to change this
            res.write(template.replace('{{ENERGY}}', req.params.selected_energy_source))
            res.end();
        }
    });
});


app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
