(function() {
    function round(n, precision) {
        return precision * Math.round(n / precision);
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
            if (['lean', 'margin_rep', 'margin_pres'].includes(mode)) {
                if (p[mode] < 0) $('#tooltip-content').html('D+' + Math.abs(p[mode]));
                else if (p[mode] === 0) $('#tooltip-content').html('EVEN');
                else if (p[mode] > 0) $('#tooltip-content').html('R+' + p[mode]);
            } else if (mode === 'wealth') {
                $('#tooltip-content').html((p.wealth >= 0 ? '+$' : '-$') + Math.abs(p.wealth).toLocaleString());
            } else {
                $('#tooltip-content').html(p[mode].toLocaleString());
            }
        } else if (e.type === 'mouseout') {
            $('#tooltip').css('visibility', 'hidden');
        }
    }
    
    function showPanel(feature) {
        let p = feature.properties;
        let mode = $('#mode-select').val();
        $('#panel-title').html(p.name);
        $('#panel').show();
        
        /*
        let chart = d3.select('#chart')
            .append('svg')
            .attr('class', 'chart');
        
        let line = chart.selectAll('.line')
            .data(districts);
        */
    }
    
    function makeMap(error, attributes, geometry) {
        let districts = topojson.feature(geometry, geometry.objects.districts_noattr).features;
        
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
        
        let multiples = {
            lean: 5,
            raceDiff: 20000,
            margin_rep: 10,
            margin_pres: 10,
            wealth: 5000,
            complexity: 1
        };
        let scales = {};
        let frequency = {};
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
            frequency[i] = [];
            let counts = {};
            let range = [];
            values.forEach(v => {
                let r = round(v, multiples[i]);
                if (r in counts) ++counts[r];
                else counts[r] = 1;
            });
            $.each(counts, (value, count) => {
                frequency[i].push({
                    value: Number(value),
                    count: count
                });
                range.push(count);
            });
            frequency[i].min = Math.min.apply(null, range);
            frequency[i].max = Math.max.apply(null, range);
        });
        console.log(frequency);
        
        let dist = map.selectAll('.districts')
            .data(districts)
            .enter()
            .append('path')
            .attr('class', d => 'feature ' + d.properties.OBJECTID)
            .attr('d', path)
            .style('fill', d => scales.lean(d.properties.lean))
            .on('mousemove', showTooltip)
            .on('mouseout', showTooltip)
            .on('click', showPanel);
        
        let chart = d3.select('#chart')
            .append('svg')
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .attr('class', 'chart');
        
        let scale = d3.scaleLinear()
            .range([10, 400])
            .domain([frequency.complexity.min, frequency.complexity.max]);
        
        let bars = chart.selectAll('.bars')
            .data(frequency.complexity)
            .enter()
            .append('rect')
            .sort((a, b) => a.value - b.value)
            .attr('class', d => 'bar ' + d.value)
            .attr('width', 400 / frequency.complexity.length - 1)
            .attr('x', (d, i) => i * (400 / frequency.complexity.length))
            .attr('height', d => scale(d.count))
            .attr('y', d => 400 - scale(d.count));
        
        $('#mode-select').on('change', function() {
            dist.data(districts)
                .transition()
                .duration(1000)
                .style('fill', d => scales[this.value](d.properties[this.value]));
        });
    }
    d3.queue()
        .defer(d3.csv, 'data/attributes.csv')
        .defer(d3.json, 'data/geometry.topojson')
        .await(makeMap);
})();