(() => {
    function makeMap(error, attributes, geometry) {
        let districts = topojson.feature(geometry, geometry.objects.districts_noattr).features;
        
        let map = d3.select('#map-div')
            .append('svg')
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .attr('viewBox', '90 5 780 500')
            .attr('class', 'map')
            .call(d3.zoom().on('zoom', () => {
                map.attr('transform', d3.event.transform)
            }));
        
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
            p.raceDiff = raceDiff;
        }
        
        let scales = {};
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
                    .range(['#5e3c99', '#fff', '#e66101']);
            }
        });
        
        console.log(districts);
        
        let dist = map.selectAll('.districts')
            .data(districts)
            .enter()
            .append('path')
            .attr('class', d => 'feature ' + d.properties.name.replace(/ /g, ''))
            .attr('d', path)
            .style('fill', d => scales.lean(d.properties.lean));
        
        document.getElementById('mode-select').addEventListener('change', function() {
            dist.data(districts)
                .style('fill', d => scales[this.value](d.properties[this.value]));
        });
    }
    d3.queue()
        .defer(d3.csv, 'data/attributes.csv')
        .defer(d3.json, 'data/geometry.topojson')
        .await(makeMap);
})();