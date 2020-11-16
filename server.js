// Built-in Node.js modules :
let fs = require('fs');
let path = require('path');

// NPM modules
let express = require('express');
let sqlite3 = require('sqlite3');
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants');


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

function generateTable(table, data) {
    //Generate the table
    //Generate the table head
    let thead = table.createTHead();
    let hrow = thead.insertRow();

    for (let key of data[0]) {
        let th = document.createElement("th");
        let text = document.createTextNode(key);
        th.appendChild(text);
        hrow.appendChild(th);
    }

    //Generate the table data
    for(let element of data) {
        let row = table.insertRow();
        for(i in element) {
            let cell = row.insertCell();
            let text = document.createTextNode(element[i]);
            cell.appendChild(text);
        }
    }
}

app.use(express.static(public_dir)); // serve static files from 'public' directory


// GET request handler for home page '/' (redirect to /year/2018)
app.get('/', (req, res) => {
    res.redirect('/year/2018');
});

// GET request handler for '/year/*'
app.get('/year/:selected_year', (req, res) => {
    console.log(req.params.selected_year);
    fs.readFile(path.join(template_dir, 'year.html'), (err, template) => {
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
            var query = 'SELECT * FROM Consumption WHERE year = ?';
            var year = selected_year;
            db.all(query, [year], (err, rows) => {
                if(err) {
                    console.log("Error in query for Year");
                } else {
                    year_rows = rows;
                }
            });

            // Table
            let table = document.createElement("table");
            generateTable(table, year_rows);

            // Previous and Next Years \\
            // Prev Link
            var prev = document.createElement("a");
            var prev_link_text = document.createTextNode("Previous Year");
            if(selected_year == 1960) {
                var prev_year = 2018;
            } else {
                var prev_year = selected_year - 1;
            }
            prev.appendChild(prev_link_text);
            prev.title = "Previous Year: " + prev_year;
            prev.href = '/year/:prev_year';
            document.body.appendChild(prev);

            //Next Link
            var next = document.createElement("a");
            var next_link_text = document.createTextNode("Next Year");
            if(selected_year == 2018) {
                var next_year = 1960;
            } else {
                var next_year = selected_year + 1;
            }
            next.appendChild(next_link_text);
            next.title = "Next Year: " + next_year;
            next.href = '/year/:next_year';
            document.body.appendChild(next);
            // Previous and Next Years \\

            res.status(200).type('html').send(template); // <-- you may need to change this
            res.write(template.replace('{{YEAR}}', req.params.selected_year));
            res.write(template.replace('{{TABLE}}', req.params.table));
            res.end();
        }


        
    });
});

// GET request handler for '/state/*'
app.get('/state/:selected_state', (req, res) => {
    console.log(req.params.selected_state);
    fs.readFile(path.join(template_dir, 'state.html'), (err, template) => {
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
            var query = 'SELECT * FROM Consumption JOIN States WHERE state_name = ?';
            var state_name = selected_state;
            db.all(query, [state_name], (err, rows) => {
                if(err) {
                    console.log("Error in query for State");
                } else {
                    state_rows = rows;
                }
            });

            // This is to get a list of states to use for next and prev states
            db.all("SELECT * FROM States", [], (err, rows) => {
                if(err) {
                    console.log("Error in query in States for States for next and prev");
                } else {
                    states = rows;
                }
            })

            var indexOfState = -1;
            var i = 0;
            while(indexOfState == -1) {
                if(state[i][state_name] == selected_state) {
                    indexOfState = i;
                }
            }

            // Previous and Next States \\
            // Prev Link
            var prev = document.createElement("a");
            var prev_link_text = document.createTextNode("Previous State");
            var prev_state = state[indexOfState - 1][state_name];
            prev.appendChild(prev_link_text);
            prev.title = "Previous State: " + prev_state;
            prev.href = '/state/:prev_state';
            document.body.appendChild(prev);

            //Next Link
            var next = document.createElement("a");
            var next_link_text = document.createTextNode("Next State");
            var next_state = state[indexOfState + 1][state_name];
            next.appendChild(next_link_text);
            next.title = "Previous State: " + next_state;
            next.href = '/year/:next_state';
            document.body.appendChild(next);
            // End of previous and next states \\

            res.status(200).type('html').send(template); // <-- you may need to change this
            res.write(template.replace('{{STATE}}', req.params.selected_state))
            res.end();
        }
    });
});

// GET request handler for '/energy/*'
app.get('/energy/:selected_energy_source', (req, res) => {
    console.log(req.params.selected_energy_source);
    fs.readFile(path.join(template_dir, 'energy.html'), (err, template) => {
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
