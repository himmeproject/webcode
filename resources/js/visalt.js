function make(graph,w,h) {
/* Set up */
    //var color = d3.scaleOrdinal(d3.schemeCategory20),
    var margin = {
        top: 20, right: 30, bottom: 30, left: 30
    },
    width = w - margin.left - margin.right,
    height = h - margin.top - margin.bottom,
    radius = 6,
    opacity = .8;
    
    /* Time format */
    var parseTime = d3.timeParse("%m-%d-%Y");
    
    /* zoom */
    var minZoom = 1 / (width / window.innerWidth) * 0.75;
    
    // Define the zoom behaviour
    var zoom = d3.zoom().scaleExtent([minZoom, 25]).on('zoom', zoomed);
    
    /* Simulation */
    var simulation = 
        d3.forceSimulation().force("link", d3.forceLink().id(function (d) {
            return d.id;
        }))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2));
    
    /* SVG */
    var svg = d3.select('#vis').append('svg').attr("width", width).attr("height", height + margin.top + margin.bottom);
    
    var listenerRect = svg.append('rect').attr('class', 'listener-rect').attr("width", width).attr("height", height + margin.top + margin.bottom).style('opacity', 0).call(zoom);
    
    var chart = svg.append('g').attr('class', 'chart').attr("width", width).attr("height", height + margin.top + margin.bottom);
    //.attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');
    
    /* Add link arrows */
    chart.append('defs').append('marker').attrs({
        'id': 'arrowhead',
        'viewBox': '-0 -5 10 10',
        'refX': 16,
        'refY': 0,
        'orient': 'auto',
        'markerWidth': 8,
        'markerHeight': 8,
        'xoverflow': 'visible'
    }).append('svg:path').attr('d', 'M 0,-5 L 10 ,0 L 0,5').attr('fill', '#999').style('stroke', 'none');
    
    /* Tooltip */
    var tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);
    
    // create a list of keys
    var keys =[ "event", "composition", "manuscript", "edition"]
    
    // Usually you have a color scale in your chart already
    var color = d3.scaleOrdinal().domain(keys).range(d3.schemeCategory20);
    
    /* Scales */
    /* ====== */
    /* xScale */
    var xDomain = d3.extent(graph.nodes, function (d) {
            return parseTime(d.date);
        });
    var xScale = d3.scaleTime()
        .domain(xDomain)
        .range([margin.right, (width - margin.left)]).nice();
        
    /* yScale */
    var yDomain = d3.extent(graph.nodes, function (d) {
            return parseInt(d.level);
        });
    var yScale = d3.scaleLinear()
        .domain([0, yDomain[1]])
        //.range([height, 0]).nice();
        .range([height, margin.top]).nice();

    /* Axes components */
    /* --------------- */
    var xAxis = d3.axisBottom(xScale).tickSize(10).tickFormat(d3.timeFormat("%Y")).ticks(20);
    
    var xAxisBackground = d3.axisBottom(xScale).tickSize(-(margin.top + height * + 3), 0, 0).tickFormat("").ticks(20);
    
    /* Axes draw */
    /* --------- */
    // Drawing the axis
    var xAxisDraw = chart.append('g')
        .attr('class', 'x axis')
        .call(xAxis);
    
    var xAxisBackgroundDraw = chart
        .append('g').attr('class', 'timeline-tick')
        .attr("opacity", ".15")
        .call(xAxisBackground);
    
    xAxisDraw.attr('transform', 'translate(0, ' + height + ')');
    xAxisBackgroundDraw.attr('transform', 'translate(0, ' + height + ')');
    

    /* draw timeline */

    //Create circles
    var gNodes = chart.insert('g', '.listener-rect')
        .attr('class', 'node-group');
    
    var labels =  chart.append('g')
        .attr('class', 'y axis');
    
    var nodeLabel = labels.append("g")
        .attr("class", "label")
        .selectAll("text")
        .data(graph.nodes)
        .enter().filter(function(d) { return d.eventType === 'event'; })
        .append("text").attr("class", "labelText")
        .text(function (d) {
                if (d.position === 'start') {
                    return d.name;
                }
        });
    
    //Add links
    var link = gNodes.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(graph.links)
        .enter()
        .append("line")
        .attr("class", function (d) {
            return d.linkType
        })
        .style("stroke-dasharray", function (d) {
            if (d.linkType === 'solid') {
              return ''
            } else if(d.linkType === 'fade-left') {
              return ("3,3, 3,3, 3,3, 3,6, 3,6, 3,9, 3,9, 3,12, 3,12, 3,12, 3,18, 3,18, 3,25, 3,25, 3,30, 3,30, 3,40, 3,50, 3,60, 3,70, 3,80, 3,90, 3,120")  
            } else if(d.linkType === 'fade-right') {
              return ("3,120, 3,90, 3,80, 3,70, 3,60, 3,50, 3,40, 3,30, 3,30, 3,25, 3,25, 3,18, 3,18, 3,12, 3,12,3,9,3,9,3,6,3,6,3,3,3,3,3,3") 
            }
            else ("3,3")
            })
        .attr("marker-end", function (d) {
            if (d.linkType === 'solid') {
                return 'url(#arrowhead)'
            } else {
                return ''
            }
        });
    
    var nodes = gNodes.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(graph.nodes)
        .enter()
        .append("g")
        .attr("class", function (d) {
            if (d.display === 'none') {
                return d.position;
            } else {
                return d.display;
            }
        })
        .on('mouseover', function (d) {
             return showTooltip(d);
        })
        .on('mouseout', function (d) {
            return hideTooltip(d);
        });
    
    var nodeStart = gNodes.selectAll(".start")
        .append("path")
        .attr("d", d3.arc().innerRadius(0).outerRadius(radius).startAngle(Math.PI).endAngle(2 * Math.PI))
        .attr("stroke", function (d) {
            if (d.display === 'none') {
                if(d.eventType === 'circa') {
                    return d3.rgb(color(d.eventType)).darker();        
                } else {return "white";}
            } else {
                return d3.rgb(color(d.eventType)).darker();
            }
        })
        .attr("fill", function (d) {
            if (d.display === 'none') {
                return "white";
            } else {
                return color(d.eventType);
            }
        })
        .attr("opacity", opacity);
    
    var nodeEnd = gNodes.selectAll(".end")
        .append("path")
        .attr("d", d3.arc().innerRadius(0).outerRadius(radius).startAngle(-2 * Math.PI).endAngle(- Math.PI))
        .attr("stroke", function (d) {
            if (d.display === 'none') {
                if(d.eventType === 'circa') {
                    return d3.rgb(color(d.eventType)).darker();        
                } else {return "white";}
            } else {
                return d3.rgb(color(d.eventType)).darker();
            }
        }).attr("fill", function (d) {
            if (d.display === 'none') {
                return "white";
            } else {
                return color(d.eventType);
            }
        })
        .attr("opacity", opacity);
        
    var nodePoint = gNodes.selectAll(".point")
        .append("circle")
        .attr("r", radius)
        .attr("stroke", function (d) {
            return d3.rgb(color(d.eventType)).darker();
        })
        .attr("fill", function (d) {
            if (d.display === 'none') {
                return "white";
            } else {
                return color(d.eventType);
            }
        })
        .attr("opacity", opacity);
   
    simulation.nodes(graph.nodes).on("tick", ticked);
    simulation.force("link").links(graph.links);
    
    /* tick function*/
    function ticked() {
        //Reposition nodes on the timeline and yAxis
        graph.nodes.forEach (function (nodePos, i) {
            return nodePos.x = xScale(parseTime(nodePos.date));
        })
        graph.nodes.forEach (function (nodePos, i) {
            return nodePos.y = yScale(nodePos.level);
        })
        
        //position links
        link.attr("x1", function (d) {
            return d.source.x;
        }).attr("y1", function (d) {
            return d.source.y;
        }).attr("x2", function (d) {
            return d.target.x;
        }).attr("y2", function (d) {
            return d.target.y;
        });
        
        //position nodes
        nodes.attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        })
        
        nodeLabel.attr("transform", function (d) { return "translate(0," + (yScale(d.level) - 10) + ")"; });
        //end tick
    }
    
    
    /* Zoom function */
    function zoomed() {
        // Get the transform
        var transform = d3.event.transform;
        
        // Re-scale the x scale
        var xScaleNew = transform.rescaleX(xScale);
        
        //Reposition nodes on the timeline and yAxis
        graph.nodes.forEach (function (nodePos, i) {
            return nodePos.x = xScaleNew(parseTime(nodePos.date));
        })
        graph.nodes.forEach (function (nodePos, i) {
            return nodePos.y = yScale(nodePos.level);
        })
        
        //position links
        link.attr("x1", function (d) {
            return d.source.x;
        }).attr("y1", function (d) {
            return d.source.y;
        }).attr("x2", function (d) {
            return d.target.x;
        }).attr("y2", function (d) {
            return d.target.y;
        });
        
        //position nodes
        nodes.attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        })
        
        // Semantically zoom and pan the axis
        xAxis.scale(xScaleNew);
        xAxisDraw.call(xAxis);
        
        //zoom the background ticks
        xAxisBackground.scale(xScaleNew);
        xAxisBackgroundDraw.call(xAxisBackground);
    }
    
    //Zoom buttons
    let zoomIn = d3.select("#zoom-in");
    let zoomOut = d3.select("#zoom-out");
    
    zoomIn.on("click", function () {
        //zoom.scaleBy(svg, 2)
        zoom.scaleBy(listenerRect.transition().duration(750), 1.5);
    })
    
    zoomOut.on("click", function () {
        //zoom.scaleBy(svg, 2)
        zoom.scaleBy(listenerRect.transition().duration(750), 0.5);
    })
    
    //Filter buttons 
    $(".filter-btn").on("click", function() {
   	var id = $(this).attr("id");
   	
   	console.log('id: ' + id);
    });

    //Show tooltip
    function showTooltip(d) {
        tooltip.html(
            '<span class="eventTitle">' + d.name.replace(/&lt;/g,"<").replace(/&gt;/g,">") + '</span><br/>' 
            + d.label.replace(/&lt;/g,"<").replace(/&gt;/g,">"))
        .style("opacity", .99)
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
    }
    
    //Hide tooltip
    function hideTooltip(d) {
        tooltip.html('').style("opacity", 0);
    }
}
// make()