(function() {
	let frequency;
	let districts;
	//let chart;
	
	let multiples = {
		lean: 5,
		raceDiff: 20000,
		margin_rep: 10,
		margin_pres: 10,
		wealth: 5000,
		complexity: 1
	};
	
	let chartTitle = {
		lean: 'Cook PVI',
		raceDiff: 'Deviation from State Mean',
		margin_rep: 'Margin of Victory (%)',
		margin_pres: 'Margin of Victory (%)',
		wealth: 'Deviation from State Mean',
		complexity: 'Complexity'
	};
	
    function round(n, multiple) {
        return multiple * Math.round(n / multiple);
    }
	
	function intToMargin(n) {
		if (n < 0) return 'D+' + Math.abs(n);
		else if (n === 0) return 'EVEN';
		else if (n > 0) return 'R+' + n;
	}
	
	function stylizeFigure(f, mode) {
		 if (['lean', 'margin_rep', 'margin_pres'].includes(mode)) {
			return intToMargin(f);
		} else if (mode === 'wealth') {
			return (f >= 0 ? '+$' : '-$') + Math.abs(f).toLocaleString();
		} else {
			return f.toLocaleString();
		}
	}
    
	function newChart() {
		let mode = $('#mode-select').val();
		$('#x-min').html(stylizeFigure(frequency[mode].min, mode));
		$('#x-max').html(stylizeFigure(frequency[mode].max, mode));
		$('#y-max').html(frequency[mode].maxCount);
		$('#x-title').html(chartTitle[mode]);
		$('#chart > svg').remove();
		let chart = d3.select('#chart')
			.append('svg')
			.attr('preserveAspectRatio', 'xMidYMid meet')
			.attr('viewBox', '0 0 400 400')
			.attr('class', 'chart');
		
		let scale = d3.scaleLinear()
			.range([0, 400])
			.domain([0, frequency[mode].maxCount]);
		
		let bars = chart.selectAll('.bars')
			.data(frequency[mode].values)
			.enter()
			.append('rect')
			.sort((a, b) => a.value - b.value)
			.attr('class', d => 'bar ' + d.value)
			.attr('width', 400 / frequency[mode].values.length - 3)
			.attr('x', (d, i) => i * (400 / frequency[mode].values.length))
			.attr('height', d => scale(d.count))
			.attr('y', d => 400 - scale(d.count));
	}
	
	function updatePanel(p, e, mode) {
		let rounded = round(p[mode], multiples[mode]);
		if (e === 'mousemove') {
			$('#panel-title').html(p.name);
			$(`.bar.${rounded}`).css('fill', '#2b6a88');
		} else if (e === 'mouseout') {
			$('#panel-title').html(null);
			$(`.bar.${rounded}`).css('fill', '#a2cde2');
		} else if (e === 'click') {
			$('.bar').css('fill', '#a2cde2');
			$(`.bar.${rounded}`).css('fill', '#2b6a88');
		}
	}
	
	function showTooltip(feature) {
		let p = feature.properties;
		let e = d3.event;
		let mode = $('#mode-select').val();
		if (e.type === 'mousemove') {
			$('#tooltip')
				.css('visibility', 'visible')
				.css('top', e.pageY + 'px')
				.css('left', e.pageX + 'px');
			$('#tooltip-title').html(p.name);
			$('#tooltip-content').html(stylizeFigure(p[mode], mode));
		} else if (e.type === 'mouseout') {
			$('#tooltip').css('visibility', 'hidden');
		}
		updatePanel(p, e.type, mode);
    }
    
    function makeMap(error, attributes, geometry) {
        districts = topojson.feature(geometry, geometry.objects.districts_noattr).features;
        
        let map = d3.select('#map-div')
            .append('svg')
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .attr('viewBox', '90 5 780 500')
            .attr('class', 'map');
        
        let proj = d3.geoAlbersUsa();
        let path = d3.geoPath()
            .projection(proj);
        
        let races = ['2', '2o', '3', 'a', 'b', 'h', 'n', 'o', 'w'];
        for (i = 0; i < attributes.length; i++) {
            let p = districts[i].properties;
            Object.keys(attributes[i]).forEach(key => {
                let a = attributes[i][key];
                p[key] = parseFloat(a) ? Number(parseFloat(a).toFixed(1)) : a;
            });
            let raceDiff = 0;
            races.forEach(r => {
                raceDiff += Math.abs((p['h' + r + '_1'] / p.districts).toFixed(0) - p['h' + r]);
                raceDiff += Math.abs((p['n' + r + '_1'] / p.districts).toFixed(0) - p['n' + r]);
            });
            p.raceDiff = Number((raceDiff / 2).toFixed(0));
            p.wealth = p.income_state - p.income;
        }
        
        let scales = {};
        frequency = {};
        ['lean', 'raceDiff', 'margin_rep', 'margin_pres', 'wealth', 'complexity'].forEach(i => {
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
            dist.data(districts)
                .transition()
                .duration(1000)
                .style('fill', d => scales[this.value](d.properties[this.value]));
        });
		newChart();
		$('body').show();
    }
    d3.queue()
        .defer(d3.csv, 'data/attributes.csv')
        .defer(d3.json, 'data/geometry.topojson')
        .await(makeMap);
})();