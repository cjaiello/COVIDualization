jQuery(document).ready( function(){

    var width = 900;
    var height = 500;
        
    var path = d3.geo.path();
    
    var svg = d3.select(".visualization").append("svg")
        .attr("width", width)
        .attr("height", height);

    var dropdownData = [
        { NAME: "Insured unemployment rate", DATA: "INSURED_UNEMPLOYMENT_RATE" },
        { NAME: "Change in average spending (% vs. prev. mo.)", DATA: "AVG_CURRENT_AR_DELTA_MO" },
        { NAME: "Spending (avg current balance)", DATA: "AVG_CURRENT_AR" },
        { NAME: "Payment speed – days beyond terms (DBT)", DATA: "AVG_DBT" },
        { NAME: "Payment speed – Cortera Payment Rating (CPR)", DATA: "AVG_CPR" },
        { NAME: "Late balances (%30+)", DATA: "AVG_PCT_LATE" },
        { NAME: "Unemployment claims – initial filings", DATA: "INITIAL_CLAIMS" }
    ];
    
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
        
            var dropDown = d3.select(".dropdown")
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

            getData("INSURED_UNEMPLOYMENT_RATE", svg, us, path);
        });
    });
});

/*
* Puts together an AJAX request to get the data, calls the API, 
* and if successful calls the function to set the visualization's data.
*/
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
            setVisualizationData(JSON.parse(cleanedUpResponse), svg, us, path, dropDownValue)
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) { 
            // TODO
        }
    });
}

/*
* Based on the dropdown value, gets a particular color scheme for the map data
*/
function getColorScheme(dropDownValue, largestValueInDataSet) {
    var colorMap = {
        "AVG_CURRENT_AR_DELTA_MO": getGreenAndRedColors(largestValueInDataSet),
        "AVG_CURRENT_AR": getGreenColors(largestValueInDataSet),
        "AVG_DBT": getRedColors(largestValueInDataSet),
        "AVG_CPR": getRedColors(largestValueInDataSet),
        "AVG_PCT_LATE": getRedColors(largestValueInDataSet),
        "INITIAL_CLAIMS": getBlueColors(largestValueInDataSet),
        "INSURED_UNEMPLOYMENT_RATE": getBlueColors(largestValueInDataSet)
    };
    var colors = colorMap[dropDownValue];
    return colors;
}

/*
* Sets the visualization's data and color scale.
*/
function setVisualizationData(responseData, svg, us, path, dropDownValue) {
    var stateCodesToData = [];
    responseData.forEach(state => stateCodesToData[state["STATE"]] = state);  
    
    var largestValueInDataSet = 0;
    var all_states = topojson.feature(us, us.objects.states).features;
    all_states.forEach(function(d){
        var stateCode = idsToCodes[d.id];
        d.info = stateCodesToData[stateCode]
        d.name = codesToNames[stateCode]
        if (d.info.STATE_AVG > largestValueInDataSet) {
            largestValueInDataSet = d.info.STATE_AVG;
        }
    });
    
    var colorDomainAndRange = getColorScheme(dropDownValue, largestValueInDataSet);
    var color = d3.scale.threshold()
    .domain(colorDomainAndRange[0])
    .range(colorDomainAndRange[1]);


    var states = svg.selectAll(".state")
        .data(all_states)

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

            var html = "";
  
            html += "<div class=\"tooltip_kv\">";
            html += "<span class=\"tooltip_key\">";
            html += d.info.STATE;
            html += "</span>";
            html += " <span class=\"tooltip_value\"> ";
            html += d.info.STATE_AVG;
            html += "";
            html += "</span>";
            html += "</div>";
            
            jQuery("#tooltip-container").html(html);
            jQuery("#tooltip-container").show();
                        
            var map_width = jQuery('.visualization')[0].getBoundingClientRect().width;
            
            if (d3.event.layerX < map_width / 2) {
              d3.select("#tooltip-container")
                .style("top", (d3.event.layerY + 15) + "px")
                .style("left", (d3.event.layerX + 15) + "px");
            } else {
              var tooltip_width = jQuery("#tooltip-container").width();
              d3.select("#tooltip-container")
                .style("top", (d3.event.layerY + 15) + "px")
                .style("left", (d3.event.layerX - tooltip_width - 30) + "px");
            }
        })
        .on("mouseout", function() {
            var sel = d3.select(this);
            sel.moveToBack();
            sel.transition().duration(300)
            .style({
                "stroke": "white",
                "stroke-width": 1
            });
            jQuery("#tooltip-container").hide();
        });

    states.transition()
        .duration(500)
        .style("fill", function(d) {
            return color(d.info.STATE_AVG);
        })
}

/*
* Helper to get color values based on largest value in data set
*/
function getGreenColors(largestValueInDataSet) {
    var colorDomain = [
        .0*largestValueInDataSet, 
        .1*largestValueInDataSet, 
        .2*largestValueInDataSet, 
        .3*largestValueInDataSet, 
        .4*largestValueInDataSet, 
        .5*largestValueInDataSet, 
        .6*largestValueInDataSet, 
        .7*largestValueInDataSet, 
        .8*largestValueInDataSet, 
        .9*largestValueInDataSet, 
        1*largestValueInDataSet
    ]
    var colorRange = ["#fcfcfc", "#d0d6cd", "#bdc9be", "#aabdaf", "#97b0a0", "#84a491", "#719782", "#5e8b73", "#4b7e64", "#387255", "#256546", "#125937", "#004d28", "#004524", "#003e20"];
    return [colorDomain, colorRange];
}

/*
* Helper to get color values based on largest value in data set
*/
function getRedColors(largestValueInDataSet) {
    var colorDomain = [
        .0*largestValueInDataSet, 
        .1*largestValueInDataSet, 
        .2*largestValueInDataSet, 
        .3*largestValueInDataSet, 
        .4*largestValueInDataSet, 
        .5*largestValueInDataSet, 
        .6*largestValueInDataSet, 
        .7*largestValueInDataSet, 
        .8*largestValueInDataSet, 
        .9*largestValueInDataSet, 
        1*largestValueInDataSet
    ]
    var colorRange = ["#fcfcfc", "#ffe5e5", "#ffcccc", "#ffb2b2", "#ff9999", "#ff7f7f", "#ff6666", "#ff4c4c", "#ff3232", "#ff1919", "#e51616", "#ce1313"];
    return [colorDomain, colorRange];
}

/*
* Helper to get color values based on largest value in data set
*/
function getBlueColors(largestValueInDataSet) {
    var colorDomain = [
        .0*largestValueInDataSet, 
        .1*largestValueInDataSet, 
        .2*largestValueInDataSet, 
        .3*largestValueInDataSet, 
        .4*largestValueInDataSet, 
        .5*largestValueInDataSet, 
        .6*largestValueInDataSet, 
        .7*largestValueInDataSet, 
        .8*largestValueInDataSet, 
        .9*largestValueInDataSet, 
        1*largestValueInDataSet
    ]
    var colorRange = ["#fcfcfc", "#ebecf3", "#d8d9e7", "#c4c6dc", "#b1b4d0", "#9ea1c5", "#8a8eb9", "#777cad", "#6369a2", "#505696", "#484d87", "#404579"];
    return [colorDomain, colorRange];
}

/*
* Helper to get color values based on largest value in data set
*/
function getGreenAndRedColors(largestValueInDataSet) {
    var colorDomain = [
        -1*largestValueInDataSet,
        -.9*largestValueInDataSet,
        -.8*largestValueInDataSet,
        -.7*largestValueInDataSet,
        -.6*largestValueInDataSet,
        -.5*largestValueInDataSet,
        -.4*largestValueInDataSet,
        -.3*largestValueInDataSet,
        -.2*largestValueInDataSet, 
        -.1*largestValueInDataSet, 
        .0*largestValueInDataSet, 
        .1*largestValueInDataSet, 
        .2*largestValueInDataSet, 
        .3*largestValueInDataSet, 
        .4*largestValueInDataSet, 
        .5*largestValueInDataSet, 
        .6*largestValueInDataSet, 
        .7*largestValueInDataSet, 
        .8*largestValueInDataSet, 
        .9*largestValueInDataSet, 
        1*largestValueInDataSet
    ]
    var colorRange = ["#fcfcfc", "#ff1919", "#ff3232", "#ff4c4c", "#ff6666", "#ff7f7f", "#ff9999", "#ffb2b2", "#ffcccc", "#ffe5e5", "#d0d6cd", "#bdc9be", "#aabdaf", "#97b0a0", "#84a491", "#719782", "#5e8b73", "#4b7e64", "#387255", "#256546", "#125937", "#004d28", "#004524"];
    return [colorDomain, colorRange];
}