jQuery(document).ready( function(){

    var width = 900;
    var height = 500;
        
    var path = d3.geo.path();
    
    var svg = d3.select(".visualization").append("svg")
        .attr("width", width)
        .attr("height", height);

    var dropdownData = [
        { NAME: "Spending (avg current balance)", DATA: "AVG_CURRENT_AR" },
        { NAME: "Change in average spending (% vs. prev. mo.)", DATA: "AVG_CURRENT_AR_DELTA_MO" },
        { NAME: "Payment speed – days beyond terms (DBT)", DATA: "AVG_DBT" },
        { NAME: "Payment speed – Cortera Payment Rating (CPR)", DATA: "AVG_CPR" },
        { NAME: "Late balances (%30+)", DATA: "AVG_PCT_LATE" },
        { NAME: "Unemployment claims – initial filings", DATA: "INITIAL_CLAIMS" },
        { NAME: "Insured unemployment rate", DATA: "INSURED_UNEMPLOYMENT_RATE" }];
    
    d3.tsv("https://s3-us-west-2.amazonaws.com/vida-public/geo/us-state-names.tsv", function(error, names) {
    
        codesToNames = {};
        namesToCodes = {};
        idsToCodes = {};
        
        for (var i = 0; i < names.length; i++) {
            codesToNames[names[i].code] = names[i].name;
            namesToCodes[names[i].name] = names[i].code;
            idsToCodes[names[i].id] = names[i].code; // id is an int; code is a two-letter abbreviation
        }
        
        d3.json("/wp-content/plugins/visualization/js/us.json", function(error, us) {
            if (error) throw error;
          
            // this part makes the full map
            svg.append("path")
                .datum(topojson.feature(us, us.objects.land).features)
                .attr("class", "land")
                .attr("d", path);
        
            var dropDown = d3.select(".visualization")
                .append("select")
                .attr("class", "parameters")
                .on("change", function() {
                    var selectedIndexInt = eval(d3.select(this).property("selectedIndex"));
                    var selectedIndexObj = dropDown.property("options")[selectedIndexInt];
                    var dropDownValue = selectedIndexObj.value;
                    getData(dropDownValue, svg, us, path);
                });

            var options = dropDown.selectAll("option")
            .data(dropdownData)
            .enter()
            .append("option");
            
            options.text(function(d) {
                return d.NAME;
            })
            options.attr("value", function(d) {
                return d.DATA;
            })
            
			//Moves selction to front
			d3.selection.prototype.moveToFront = function() {
				return this.each(function() {
					this.parentNode.appendChild(this);
				});
			};

			//Moves selction to back
			d3.selection.prototype.moveToBack = function() {
				return this.each(function() {
					var firstChild = this.parentNode.firstChild;
					if (firstChild) {
						this.parentNode.insertBefore(this, firstChild);
					}
				});
            };

            getData("AVG_CURRENT_AR", svg, us, path);
        });
    });
});

function getData(dropDownValue, svg, us, path) {
    jQuery.ajax({
        url : getstates_ajax.ajax_url,
        type : "post",
        data : {
            action : "get_state_data",
            selected : dropDownValue
        },
        success : function( response ) {
            var cleanedUpResponse = response.replace("Array","").replace("\"}]0","\"}]");
            setVisualizationData(JSON.parse(cleanedUpResponse), svg, us, path)
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) { 
            // do something 
        }
    });
}

function setVisualizationData(responseData, svg, us, path) {
    var stateNamesToData = [];
    responseData.forEach(state => stateNamesToData[state["STATE"]] = state);  
    
    var largest_value = 0;
    var all_states = topojson.feature(us, us.objects.states).features;
    all_states.forEach(function(d){
        var stateCode = idsToCodes[d.id];
        d.info = stateNamesToData[stateCode]
        d.name = codesToNames[stateCode]
        if (d.info.STATE_AVG > largest_value) {
            largest_value = d.info.STATE_AVG;
        }
    });
    
    //make the states
    var color_domain = [
        -1*largest_value,
        -.9*largest_value,
        -.8*largest_value,
        -.7*largest_value,
        -.6*largest_value,
        -.5*largest_value,
        -.4*largest_value,
        -.3*largest_value,
        -.2*largest_value, 
        -.1*largest_value, 
        .0*largest_value, 
        .1*largest_value, 
        .2*largest_value, 
        .3*largest_value, 
        .4*largest_value, 
        .5*largest_value, 
        .6*largest_value, 
        .7*largest_value, 
        .8*largest_value, 
        .9*largest_value, 
        largest_value
    ]
    var color = d3.scale.threshold()
    .domain(color_domain)
    .range(["", "#ff1919", "#ff3232", "#ff4c4c", "#ff6666", "#ff7f7f", "#ff9999", "#ffb2b2", "#ffcccc", "#ffe5e5", "#d0d6cd", "#bdc9be", "#aabdaf", "#97b0a0", "#84a491", "#719782", "#5e8b73", "#4b7e64", "#387255", "#256546", "#125937", "#004d28"]);
    
    var states = svg.selectAll(".state")
        .data(all_states)

    states.exit().remove()

    states.enter().append("path")
        .attr("class", "state")
        .attr("d", path)
        .style("fill", function(d) {
            return color(d.info.STATE_AVG);
        })
        .on("mouseover", function(d) {
            var sel = d3.select(this);
            sel.moveToFront();
            sel.transition().duration(300).style({
                "opacity": 1,
                "stroke": "black",
                "stroke-width": 1.5
            });
        })
        .on("mouseout", function() {
            var sel = d3.select(this);
            sel.moveToBack();
            sel.transition().duration(300)
            .style({
                "stroke": "white",
                "stroke-width": 1
            });
        });

    states.transition()
        .duration(500)
        .style("fill", function(d) {
            return color(d.info.STATE_AVG);
        })
}