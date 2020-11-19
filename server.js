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

function generateYearTable(data) {
    //Generate the table data

    let tableY = "";
    let key;
    for(key in data) {
        let item = data[key];
        tableY = tableY + " <tr> ";
        let total = 0;
        for(let element in item) {
            if(element != "year") {
                tableY = tableY + " <td>" + item[element] + "</td> ";
                if(element != "state_abbreviation") {
                    total = total + parseInt(item[element]);
                }
            }
        }
        tableY = tableY + " <td>" + total + "</td> ";
        tableY = tableY + " </tr>";
    }
    return tableY;
}

function generateStateTable(data) {
    // Generate State Table
    let tableS = "";
    let key;
    for(key in data) {
        let item = data[key];
        tableS = tableS + " <tr> ";
        let total = 0;
        for(let element in item) {
            if(element != "state_abbreviation" && element != "state_name") {
                tableS = tableS + " <td>" + item[element] + "</td>";
                if(element != "year") {
                    total = item[element] + total;
                }
            }
        }
        tableS = tableS + " <td>" + total + "</td>";
        tableS = tableS + " </tr>";
    }
    return tableS;
}

function generateYears(data) {
    // Generate State Table
    let tableS = "";
    let key;
    var pos = 0;
    for(key in data) {
        let item = data[key];
        
        for(let element in item) {
             if(element == "year" ) {
                 if(pos==0){
                    tableS = tableS + item[element];
                    pos++; 
                 }else{ 
                    tableS = tableS + ", " + item[element];
                 }
               
            }
           
        }
    }
    return tableS;
}

function generateChartData(data){//need to take in energy total, and energy for each souce, for each year
    // Generate State Table
    let tableS = "";
    let key;
    for(key in data) {
        let item = data[key];
        tableS = tableS + " <tr> ";
        let total = 0;
        for(let element in item) {
            if(element != "state_abbreviation" && element != "state_name" && element !="year") {
                tableS = tableS + " <td>" + item[element] + "</td>";
                if(element != "year") {
                    total = item[element] + total;
                }
            }
        }
        tableS = tableS + " <td>" + total + "</td>";
        tableS = tableS + " </tr>";
    }
    return tableS;
  }




}
function generateSourceTable(data, energy_source) {
    // Generate the table for energy source
    let tableE = "";
    let key;
    tableE = tableE + " <tr>";
    for(key in data) {
        let item = data[key];
        for(let element in item) {
            if(element == energy_source) {
                tableE = tableE + " <td>" + item[element] + "</td> ";
            } else if(element == "year" && !tableE.includes(" " + item[element] + " ")) {
                tableE = tableE + " </tr>";
                tableE = tableE + " <tr>";
                tableE = tableE + " <td> " +  item[element] + " </td> ";
            }
        }
    }
    return tableE;
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
                tb = tb + generateYearTable(data);
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

            var state_name = "Alabama";
            state_name = req.params.selected_state;
            if(state_name.includes(":")) {
                state_name = state_name.slice(1);
            }
            if(state_name.includes("_")) {
                var state_name = state_name.replace("_", " ");
                if(state_name.includes("_")) {
                    state_name = state_name.replace("_", " ")
                }
            }
            let state_rows;
            var states;

            var queryStatePromise = new Promise(function(resolve, reject) {
                // This is the query we will use
                // SELECT * FROM Conspumtion JOIN States WHERE state_name = selected_state
                let query = 'SELECT * FROM Consumption NATURAL JOIN States WHERE state_name = ? GROUP BY year';

                db.all(query, [state_name], (err, rows) => {
                    if(err) {
                        console.log("Error in query for State");
                        reject();
                    } else {
                        state_rows = rows;
                        resolve(state_rows);
                    }
                });

            }).then(data => {

                state_rows = data;
                //console.log(state_rows);
                // Generates and replaces the table in the html
                template = template.replace("{{TABLE}}", generateStateTable(state_rows));
                console.log(generateYears(state_rows));
                template = template.replace("'{{labels}}'", generateYears(state_rows));


                
                // Generates a table of states with their abbreviations and Names
                states = generateStateList();
                // Index of State is a pointer into state to indicate what spot the current state is at
                // That spot contains the state's full name and the abbreviation of the state
                let indexOfState = -1;
                let i = 0;
                while(indexOfState == -1) {
                    
                    if(states[i][1] == state_name) {
                        indexOfState = i;
                        
                    }
                    i++;
                }
                
                
                // Previous and Next States \\
                // Prev Link
                let prev_link = "<a href=";
                let prev_state;
                let prev_state_pretty;
                if(indexOfState == 0) {
                    prev_state = states[states.length - 1][1];
                    prev_state_pretty = states[states.length - 1][0];
                    // This is to handle states with multpile words
                    if(prev_state.includes(" ")) {
                        prev_state = prev_state.replace(' ', '_');
                        if(prev_state.includes(" ")){
                            prev_state = prev_state.replace(' ', '_');
                        }
                    }
                    
                } else {
                    prev_state = states[indexOfState - 1][1];
                    prev_state_pretty = states[indexOfState - 1][0];
                    // This is to handle states with multpile words
                    if(prev_state.includes(" ")) {
                        prev_state = prev_state.replace(' ', '_');
                        if(prev_state.includes(" ")){
                            prev_state = prev_state.replace(' ', '_');
                        }
                    }
                }
                prev_link = prev_link + '/state/:' + prev_state + ">Previous State: " + prev_state_pretty + "</a>";
                
                //Next Link
                let next_link = "<a href=";
                let next_state;
                let next_state_pretty;
                if(indexOfState == (states.length - 1)) {
                    next_state = states[0][1];

                    next_state_pretty = states[0][0];
                    // This is to handle states with multpile words
                    if(next_state.includes(" ")) {
                        next_state = next_state.replace(' ', '_');
                        if(next_state.includes(" ")){
                            next_state = next_state.replace(' ', '_');
                        }
                    }
                } else {
                    next_state = states[indexOfState + 1][1];

                    next_state_pretty = states[indexOfState + 1][0];
                    // This is to handle states with multpile words
                    if(next_state.includes(" ")) {
                        next_state = next_state.replace(' ', '_');
                        if(next_state.includes(" ")){
                            next_state = next_state.replace(' ', '_');
                        }
                    }
                }
                next_link = next_link + '/state/:' + next_state + ">Next State: " + next_state_pretty + "</a>";
                
                template = template.replace("{{PREV_STATE}}", prev_link);
                template = template.replace("{{NEXT_STATE}}", next_link);
                // End of Previous and Next Years \\

                // Get the picture \\
                let image_url = /*image_dir +*/ "../images/" + "states" + "/" + state_name + ".png";
                
                let state_img = "<img src=" + "\"" + image_url + "\"" + " alt=" + "\"" + state_name + "\"/>";
                console.log(state_img);

                template = template.replace("{{STATE_IMAGE}}", state_img);
                // End of gettign the picture \\

                // Replace the State Title \\
                template = template.replace('{{STATE}}', state_name);
                // End of replace state title \\
                
                res.status(200).type('html').send(template); // <-- you may need to change this
            });
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
            // This is a list of energy source names as well as an index for what energy source we're on
            var energy_source_names = ["coal", "Natural Gas", "nuclear", "petroleum", "renewable"];
            // Index will be used for the Next and Prev
            var energy_source_index = 0;
            // Capitalizes the first letter
            
            
            //Loop thru rows, make dict of dicts if the year already exists, check if the state exists, then add it or not depending on if it exists or not
            let energy_rows;
            var energy_source = ":coal";
            energy_source = req.params.selected_energy_source;
            

            if(req.params.selected_energy_source.includes(":")) {
                energy_source = req.params.selected_energy_source.slice(1);
            } else {
                energy_source = req.params.selected_energy_source;
            } 
            var energy_source_pretty = energy_source.charAt(0).toUpperCase() + energy_source.slice(1);

            // This will set all but natural gas correctly
            var i;
            for (i = 0; i < energy_source_names.length; i++) {
                if(energy_source == energy_source_names[i]) {
                    energy_source_index = i;
                }
            }
                        
            // Nautral gas is different as it has an underscore
            if(energy_source == "Natural" || energy_source == "Natural_gas" || energy_source == "natural_gas") {
                energy_source_pretty = "Natural Gas";
                energy_source = "natural_gas";
                energy_source_index = 1;
            }


            
            var querySourcePromise = new Promise(function(resolve, reject) {
                // database data
                // This is the query we will use
                // SELECT * FROM Conspumtion
                var query = 'SELECT * FROM Consumption ORDER BY year';
                db.all(query, [], (err, rows) => {
                    if(err) {
                        console.log("Error in query for Source");
                        reject("Error");
                    } else {

                        resolve(rows);
                    }
                });
            }).then(data => {
                // Replace Table
                template = template.replace("{{SOURCE_TABLE}}", generateSourceTable(data, energy_source));
                res.status(200).type('html').send(template); // <-- you may need to change this  
            });


            
            


            
            template = template.replace('{{SOURCE}}', energy_source_pretty);
            // End of header for Energy Source \\

            // Previous and Next Energy Sources \\
            // Prev Link
            let prev_link = "<a href=";
            let prev_source;
            if(energy_source_index == 0) {
                prev_source = energy_source_names[4];
                prev_source_pretty = prev_source.charAt(0).toUpperCase() + prev_source.slice(1);
            } else {
                prev_source = energy_source_names[energy_source_index - 1];
                prev_source_pretty = prev_source.charAt(0).toUpperCase() + prev_source.slice(1);
            }
            // This is a special handler for natural gas so the url entered is natural_gas
            let prev_source_special = prev_source;
            if(prev_source == "Natural Gas") {
                prev_source_special = "natural_gas";
                prev_source_pretty = "Natural Gas";
            }
            prev_link = prev_link + '/energy/:' + prev_source_special + ">Previous Source: " + prev_source_pretty + "</a>";

            //Next Link
            let next_link = "<a href=";
            let next_source;
            if(energy_source_index == 4) {
                next_source = energy_source_names[0];
                next_source_pretty = next_source.charAt(0).toUpperCase() + next_source.slice(1);
            } else {
                next_source = energy_source_names[energy_source_index + 1];
                next_source_pretty = next_source.charAt(0).toUpperCase() + next_source.slice(1);
            }

            // This is a special handler for natural gas so the url entered is natural_gas
            let next_source_special = next_source;
            if(next_source == "Natural Gas") {
                next_source_special = "natural_gas";
                next_source_pretty = "Natural Gas";
            }
            next_link = next_link + '/energy/:' + next_source_special + ">Next Source: " + next_source_pretty + "</a>";

            template = template.replace("{{PREV_SOURCE}}", prev_link);
            template = template.replace("{{NEXT_SOURCE}}", next_link);
            // End of Previous and Next Years \\            
        }
    });
});

function generateStateList() {
    let t = [["AK", "Alaska"], ["AL", "Alabama"], ["AR", "Arkansas"], ["AZ", "Arizona"],
        ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DC", "District of Columbia"],
        ["DE", "Delaware"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["IA", "Iowa"],
        ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["KS", "Kansas"], ["KY", "Kentucky"],
        ["LA", "Louisiana"], ["MA", "Massachusetts"], ["MD", "Maryland"], ["ME", "Maine"], ["MI", "Michigan"],
        ["MN", "Minnesota"], ["MO", "Missouri"], ["MS", "Mississippi"], ["MT", "Montana"], ["NC", "North Carolina"],
        ["ND", "North Dakota"], ["NE", "Nebraska"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], 
        ["NV", "Nevada"], ["NY", "New York"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"],
        ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"],
        ["UT", "Utah"], ["VA", "Virginia"], ["VT", "Vermont"], ["WA", "Washington"], ["WI", "Wisconsin"], ["WV", "West Virginia"], ["WY", "Wyoming"]];
    return t;
}

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
