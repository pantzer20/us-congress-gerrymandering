/* All statements are enclosed in this function to prevent declaration of global variables */
(function() {
    /* Define variables to be used in multiple functions */
	let frequency = {};
    let scales = {};
	let districts;
    let currentFeature;
    /* Multiples used for class aggregation in the chart */
	let multiples = {
		lean: 5,
		raceDiff: 20000,
		margin_rep: 10,
		margin_pres: 10,
		wealth: 5000,
		complexity: 1
	};
    /* Names of all themes available for rendering and their chart X-axis text */
	let themes = {
		lean: 'Cook PVI',
		raceDiff: 'Racial Anomaly (Persons)',
		margin_rep: 'Margin of Victory (%)',
		margin_pres: 'Margin of Victory (%)',
		wealth: 'Income Anomaly ($)',
		complexity: 'Complexity'
	};
	
    /* Function rounding a number to the nearest multiple of a provided number; used for aggregating data into classes in chart */
    /* e.g. round(280, 100) returns 300 */
    function round(n, multiple) {
        return multiple * Math.round(n / multiple);
    }
	
    /* Function converting a "politicized" integer - negative/"left" of 0 for Democratic and positive/"right" of 0 for Republican - to a Cook-PVI-like value */
	function intToMargin(n) {
        /* If the number is negative, return a "D" and the absolute value of the number */
		if (n < 0) return 'D+' + Math.abs(n);
        /* If the number is zero (no bias), return "EVEN" */
		else if (n === 0) return 'EVEN';
        /* If the number is positive, return an "R" and the number */
		else if (n > 0) return 'R+' + n;
	}
	
    /* Function stylizing a provided figure (f) to be appropriate for the theme being displayed (mode) */
    /* e.g. stylizeFigure(10000, 'wealth') returns "+$10,000" */
	function stylizeFigure(f, mode) {
        /* If the display mode is Cook PVI, representative victory margin, or presidential victory margin: */
		 if (['lean', 'margin_rep', 'margin_pres'].includes(mode)) {
             /* Return the result of the intToMargin function */
			return intToMargin(f);
        /* If the display mode is median income: */
		} else if (mode === 'wealth') {
            /* Depending on if the figure is positive or negative, return the appropriate sign, along with the absolute value of the figure with commas for digit grouping added as needed */
			return (f >= 0 ? '+$' : '-$') + Math.abs(f).toLocaleString();
        /* If the display mode is anything else: */
		} else {
            /* Simply return the figure with commas for digit grouping added as needed */
			return f.toLocaleString();
		}
	}
    
    /* Function (re)initalizing the chart */
	function newChart() {
        /* Get the current display mode */
		let mode = $('#mode-select').val();
        /* Set the chart's X-axis minimum value */
		$('#x-min').html(stylizeFigure(frequency[mode].min, mode));
        /* Set the chart's X-axis maximum value */
		$('#x-max').html(stylizeFigure(frequency[mode].max, mode));
        /* Set the chart's Y-axis maximum value */
		$('#y-max').html(frequency[mode].maxCount);
        /* Set the chart's X-axis text */
		$('#x-title').html(themes[mode]);
        /* Delete all bars from the chart if any exist */
		$('#chart > svg').remove();
        /* Select the chart element, then: */
		let chart = d3.select('#chart')
            /* Append an SVG element to hold bars */
			.append('svg')
            /* Set attributes to make the SVG responsive to changes in parent div size */
			.attr('preserveAspectRatio', 'xMidYMid meet')
			.attr('viewBox', '0 0 400 400')
            /* Make the SVG element part of the "chart" class */
			.attr('class', 'chart');
		
		/* Create a scale to return the appropriate height for each bar */
        let scale = d3.scaleLinear()
            /* Range refers to pixels of height; the SVG element is 400px tall by default (line 81) */
			.range([0, 400])
            /* Domain refers to the data values; the minimum will always be zero, while the maximum needs to be set based on the aggregation group with the highest frequency */
			.domain([0, frequency[mode].maxCount]);
		
        /* Make a selection to begin inserting bars */
		let bars = chart.selectAll('.bars')
            /* Set the data source as the frequency object */
			.data(frequency[mode].values)
            /* Recurse through the object */
			.enter()
            /* Append an SVG rectangle object for each bar */
			.append('rect')
            /* Sort the bars by value */
			.sort((a, b) => a.value - b.value)
            /* Set class names for the bars; all are in "bar", and each bar is also added to a class based on its value */
			.attr('class', d => 'bar ' + d.value)
            /* Set the fill color using the same scales as the map */
            .style('fill', d => scales[mode](d.value))
            /* Set the width of each bar by dividing the total available width by the number of bars */
			.attr('width', 400 / frequency[mode].values.length - 3)
            /* Reposition the bars horizontally so they do not overlap */
			.attr('x', (d, i) => i * (400 / frequency[mode].values.length))
            /* Set the height of each bar using the "count" (frequency) attribute */
			.attr('height', d => scale(d.count))
            /* Reposition the bars vertically so they are aligned to the base of the chart rather than the top */
			.attr('y', d => 400 - scale(d.count));
	}
	
    /* Function updating the panel when a feature is hovered or clicked */
	function updatePanel(p, e, mode) {
        /* Get the rounded figure of the selected feature's value; this will be used to select the appropriate chart bar, which was based on the same rounding */
		let rounded = round(p[mode], multiples[mode]);
        /* Reset the stroke width of all features to 0.14px */
        $('.feature').css('stroke-width', '0.14px');
        /* If the type of event is mousemove: */
		if (e === 'mousemove') {
            /* Set the title of the panel to the feature's name (district name) */
			$('#panel-title').html(p.name);
            /* Reset the stroke color of all chart bars to none */
            $('.bar').css('stroke', 'none');
            /* Set the stroke color of the bar related to this feature to black */
			$(`.bar.${rounded}`).css('stroke', 'black');
        /* If the type of event is mouseout, i.e. the cursor is no longer over any feature: */
		} else if (e === 'mouseout') {
            /* If a feature was previously clicked on, and so currentFeature is not undefined: */
            if (!!currentFeature) {
                /* Call this function again, using it to make the previously-clicked-on feature the selected feature once again; this will remain the selected feature as long as the cursor is away from the map, creating a permanence in display */
                updatePanel(currentFeature, 'mousemove', mode);
            /* If no feature has ever been clicked on: */
            } else {
                /* Set the panel's title to be empty */
                $('#panel-title').html(null);
                /* Reset the stroke color of all chart bars to none */
                $('.bar').css('stroke', 'none');
                /* Hide the feature-specific statistics */
                $('#stats').hide();
            }
        /* If the type of event is click: */
		} else if (e === 'click') {
            /* Copy this feature to the currentFeature object for permanence (lines 132-135) */
            currentFeature = p;
            /* Reset the stroke color of all chart bars to none */
            $('.bar').css('stroke', 'none');
            /* Set the stroke color of the bar related to this feature to black */
			$(`.bar.${rounded}`).css('stroke', 'black');
		}
        /* If the event type was mousemove or click: */
        if (e === 'mousemove' || e === 'click') {
            /* For each theme of data: */
            Object.keys(themes).forEach(i => {
                /* Update the feature-specific statistic in the side panel for this theme, passing the value through stylizeFigure first */
                $(`#${i}-stat`).html(stylizeFigure(p[i], i));
            });
            /* Show the div containing the statistics in the side panel */
            $('#stats').show();
            /* Set a thick stroke around the selected feature in the map */
            $(`.feature.${p.OBJECTID}`).css('stroke-width', '1.5px');
        }
	}
	
    /* Function showing/updating the tooltip when a feature is hovered over in the map */
	function showTooltip(feature) {
        /* Get the feature's properties */
		let p = feature.properties;
        /* Get the event that called this function */
		let e = d3.event;
        /* Get the display mode */
		let mode = $('#mode-select').val();
        /* If the type of event is mousemove: */
		if (e.type === 'mousemove') {
            /* Make the tooltip visible and set its position to be where the cursor is */
			$('#tooltip')
				.css('visibility', 'visible')
				.css('top', e.pageY + 'px')
				.css('left', e.pageX + 'px');
            /* Set the tooltip's title to the feature (district) name */
			$('#tooltip-title').html(p.name);
            /* Set the tooltip's displayed figure based on the current display mode */
			$('#tooltip-content').html(stylizeFigure(p[mode], mode));
        /* If the type of event is mouseout: */
		} else if (e.type === 'mouseout') {
            /* Hide the tooltip */
			$('#tooltip').css('visibility', 'hidden');
		}
        /* Call the updatePanel function with the data collected by this function */
		updatePanel(p, e.type, mode);
    }
    
    /* Initial function that processes the input data and creates a map */
    function makeMap(error, attributes, geometry) {
        /* Process the input TopoJSON into GeoJSON */
        districts = topojson.feature(geometry, geometry.objects.districts_noattr).features;
        
        /* Select the map's div, then: */
        let map = d3.select('#map-div')
            /* Append an SVG element that will hold the district paths (feature polygons) */
            .append('svg')
            /* Set attributes to make the SVG responsive to changes in parent div size */
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .attr('viewBox', '90 5 780 500')
            /* Make the SVG element part of the "map" class */
            .attr('class', 'map');
        
        /* Get the US-customized Albers projection */
        let proj = d3.geoAlbersUsa();
        /* Initialize a method that will draw SVG paths from the GeoJSON geometry, referencing the relevant projection */
        let path = d3.geoPath()
            .projection(proj);
        
        /* Define all Census-derived races */
        let races = ['2', '2o', '3', 'a', 'b', 'h', 'n', 'o', 'w'];
        /* For each attribute derived from the input CSV: */
        for (i = 0; i < attributes.length; i++) {
            /* Create a reference to the "properties" object in the GeoJSON-derived feature */
            let p = districts[i].properties;
            /* For each key-value pair in the CSV-derived attributes, copy the value to the feature, converting Strings to Integers if possible */
            Object.keys(attributes[i]).forEach(key => {
                let a = attributes[i][key];
                p[key] = parseFloat(a) ? Number(parseFloat(a).toFixed(1)) : a;
            });
            /* Reset the racial/ethnic anomaly for this feature to zero */
            let raceDiff = 0;
            /* For each race at line 218: */
            races.forEach(r => {
                /* Increment the anomaly by the difference between the average  population per district of this particular race and the actual value in this district (Hispanic ethnicities) */
                raceDiff += Math.abs((p['h' + r + '_1'] / p.districts).toFixed(0) - p['h' + r]);
                /* Increment the anomaly by the difference between the average  population per district of this particular race and the actual value in this district (non-Hispanic ethnicities) */
                raceDiff += Math.abs((p['n' + r + '_1'] / p.districts).toFixed(0) - p['n' + r]);
            });
            /* Divide the derived anomaly by two, as this provides the number of people that would need to be different to balance the district with the statewide average; ensure the value is an integer */
            p.raceDiff = Number((raceDiff / 2).toFixed(0));
            /* Calculate the difference in median income between the statewide figure and this district's figure */
            p.wealth = p.income - p.income_state;
        }
        
        /* For each theme of data: */
        Object.keys(themes).forEach(i => {
            
            let values = [];
            districts.forEach(d => values.push(d.properties[i]));
            let min = Math.min.apply(null, values);
            let max = Math.max.apply(null, values);
            let abs = Math.abs(Math.max(min, max));
            if (['lean', 'margin_rep', 'margin_pres'].includes(i)) {
                scales[i] = d3.scaleLinear()
                    .domain([-(abs), 0, abs])
                    .range(['#2c7bb6', '#fff', '#d7191c']);
            } else if (['raceDiff', 'complexity'].includes(i)) {
                scales[i] = d3.scaleQuantile()
                    .domain(values)
                    .range(['#fef0d9','#fdcc8a','#fc8d59','#e34a33','#b30000']);
            } else if (i === 'wealth') {
                scales[i] = d3.scaleLinear()
                    .domain([min, 0, max])
                    .range(['#5e3c99', '#fef0d9', '#e66101']);
            }
			frequency[i] = {};
            frequency[i].values = [];
            let counts = {};
			let valueRange = [];
            let countRange = [];
            values.forEach(v => {
                let r = round(v, multiples[i]);
                if (r in counts) ++counts[r];
                else counts[r] = 1;
            });
            $.each(counts, (value, count) => {
                frequency[i].values.push({
                    value: Number(value),
                    count: count
                });
                valueRange.push(Number(value));
                countRange.push(count);
            });
            frequency[i].maxCount = Math.max.apply(null, countRange);
            frequency[i].min = Math.min.apply(null, valueRange);
            frequency[i].max = Math.max.apply(null, valueRange);
			for (v = frequency[i].min; v < frequency[i].max; v += multiples[i]) {
				if (!valueRange.includes(v)) {
					frequency[i].values.push({
						value: Number(v),
						count: 0
					});
				}
			}
        });
        
        let dist = map.selectAll('.districts')
            .data(districts)
            .enter()
            .append('path')
            .attr('class', d => 'feature ' + d.properties.OBJECTID)
            .attr('d', path)
            .style('fill', d => scales.lean(d.properties.lean))
            .on('mousemove', showTooltip)
            .on('mouseout', showTooltip)
            .on('click', showTooltip);
        
        $('#mode-select').on('change', function() {
			newChart();
            if (!!currentFeature) updatePanel(currentFeature, 'mouseout', $(this).val());
            dist.data(districts)
                .transition()
                .duration(1000)
                .style('fill', d => scales[this.value](d.properties[this.value]));
        });
		newChart();
		$('body').show();
    }
    
    /* Method downloading input data and providing it to the makeMap function */
    d3.queue()
        .defer(d3.csv, 'data/attributes.csv')
        .defer(d3.json, 'data/geometry.topojson')
        .await(makeMap);
})();