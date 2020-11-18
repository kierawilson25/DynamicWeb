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
let image_dir = path.join(__dirname,'images');

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
    res.redirect('/year/2018');
});

// GET request handler for '/year/*'
app.get('/year/:selected_year', (req, res) => {
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
                year = req.params.selected_year;
            }    
            var year_rows;
            //const getReplacement = str => Promise.resolve('{str}]');
            //const promises = [];
            //template = template.replace("{{YEAR_TABLE}}", data => {
               // promises.push(getReplacement(data));
            //});

            var tb = "";

            var queryYearPromise = new Promise(function(resolve, reject) {
                db.all(query, [year], (err, rows) => {
                    if(err) {
                        console.log("Error in query for Year");
                        reject();
                    } else {
                        year_rows = rows;
                        resolve(year_rows);
                    }
                });

            }).then(data => {
                // Table
                // Write everything as strings not creating elements
                // Note: Table and table headers can be put in the html (things that are going to be the same on every page)
                tb = tb + generateStateTable(data);
                template = template.replace("{{YEAR_TABLE}}", tb);
                res.status(200).type('html').send(template); // <-- you may need to change this
            });
            
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
            let state_name = "Alabama";
            state_name = req.params.selected_state;
            if(state_name.includes(":")) {
                state_name = state_name.slice(1);
            }
            let state_rows;
            var states;

            var queryStatePromise = new Promise(function(resolve, reject) {
                db.all(query, [state_name], (err, rows) => {
                    if(err) {
                        console.log("Error in query for State");
                        reject();
                    } else {
                        state_rows = rows;
                        resolve(state_rows);
                    }
                });

                // This is to get a list of states to use for next and prev states

                db.all("SELECT * FROM States", [], (err, rows) => {
                    if(err) {
                        console.log("Error in query in States for States for next and prev");
                        reject("Error in query");
                    } else {
                        states = rows; 
                        resolve(states);
                    }
                }); 
            }).then(data => {
                console.log("Hello");
                states = data[1];
                state_rows = data[0];
            });
            // I created this to test our links as the query isn't working
            states = [["AK", "Alaska"], ["AL", "Alabama"], ["AR", "Arizona"]];
            // Index of State is a pointer into state to indicate what spot the current state is at
            // That spot contains the state's full name and the abbreviation of the state
            let indexOfState = -1;
            let i = 0;
            while(indexOfState == -1) {
                
                if(states[i][1/*"state_name"*/] == state_name) {
                    indexOfState = i;
                    
                }
                i++;
            }
            
            // Previous and Next States \\
            // Prev Link
            let prev_link = "<a href=";
            let prev_state;
            if(indexOfState == 0) {
                prev_state = states[states.length - 1][1/*"state_name"*/];
            } else {
                prev_state = states[indexOfState - 1][1/*"state_name"*/];
            }
            prev_link = prev_link + '/state/:' + prev_state + ">Previous State: " + prev_state + "</a>";
            
            //Next Link
            let next_link = "<a href=";
            let next_state;
            if(indexOfState == (states.length - 1)) {
                next_state = states[0][1/*"state_name"*/];
            } else {
                next_state = states[indexOfState + 1][1/*"state_name"*/];
            }
            next_link = next_link + '/state/:' + next_state + ">Next State: " + next_state + "</a>";
            
            template = template.replace("{{PREV_STATE}}", prev_link);
            template = template.replace("{{NEXT_STATE}}", next_link);
            // End of Previous and Next Years \\

            // Get the picture \\
            let image_url = image_dir + "\\" + "states" + "\\" + state_name + ".png";
            
            let state_img = "<img src=" + "\"" + image_url + "\"" + " alt=" + "\"" + state_name + "\"/>";
            console.log(state_img);

            template = template.replace("{{STATE_IMAGE}}", state_img);
            // End of gettign the picture \\

            // Replace the State Title \\
            template = template.replace('{{STATE}}', state_name);
            // End of replace state title \\
            
            res.status(200).type('html').send(template); // <-- you may need to change this
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
            let energy_rows;
            let energy_source = "coal";
            energy_source = req.params.selected_energy_source;

            if(req.params.selected_energy_source.includes(":")) {
                energy_source = req.params.selected_energy_source.slice(1);
            } else {
                energy_source = req.params.selected_year;
            } 

            var queryDonePromise = new Promise(function(resolve, reject) {
                db.all(query, [energy_source], (err, rows) => {
                    if(err) {
                        console.log("Error in query for Source");
                        reject("Error");
                    } else {
                        energy_rows = rows;
                        resolve(energy_rows);
                    }
                });
            })

            // This is a list of energy source names as well as an index for what energy source we're on
            var energy_source_names = ["Coal", "Natural Gas", "Nuclear", "Petroleum", "Renewable"];
            // Index will be used for the Next and Prev
            var energy_source_index = 0;
            
            // Capitalizes the first letter
            energy_source = energy_source.charAt(0).toUpperCase() + energy_source.slice(1);

            // This will set all but natural gas correctly
            var i;
            for (i = 0; i < energy_source_names.length; i++) {
                if(energy_source == energy_source_names[i]) {
                    energy_source_index = i;
                }
            }
            
            // Nautral gas is different as it has an underscore
            if(energy_source == "Natural" || energy_source == "Natural_gas" || energy_source == "natural_gas") {
                energy_source = "Natural Gas";
                energy_source_index = 1;
            }
            
            template = template.replace('{{SOURCE}}', energy_source);
            // End of header for Energy Source \\

            // Previous and Next Energy Sources \\
            // Prev Link
            let prev_link = "<a href=";
            let prev_source;
            if(energy_source_index == 0) {
                prev_source = energy_source_names[4];
            } else {
                prev_source = energy_source_names[energy_source_index - 1];
            
            }
            // This is a special handler for natural gas so the url entered is natural_gas
            let prev_source_special = prev_source;
            if(prev_source == "Natural Gas") {
                prev_source_special = "natural_gas";
            }
            prev_link = prev_link + '/energy/:' + prev_source_special + ">Previous Source: " + prev_source + "</a>";

            //Next Link
            let next_link = "<a href=";
            let next_source;
            if(energy_source_index == 4) {
                next_source = energy_source_names[0];
            } else {
                next_source = energy_source_names[energy_source_index + 1];
            }

            // This is a special handler for natural gas so the url entered is natural_gas
            let next_source_special = next_source;
            if(next_source == "Natural Gas") {
                next_source_special = "natural_gas";
            }
            next_link = next_link + '/energy/:' + next_source_special + ">Next Source: " + next_source + "</a>";

            template = template.replace("{{PREV_SOURCE}}", prev_link);
            template = template.replace("{{NEXT_SOURCE}}", next_link);
            // End of Previous and Next Years \\            

            // Replace the body of the table \\
            template = template.replace('{{SOURCE_TABLE}}', "<tr><td>Table</tr?</td>");
            // End of body of the table \\

            res.status(200).type('html').send(template); // <-- you may need to change this           
            res.end();
        }
    });
});


app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
