// Load the data and preprocess it
d3.csv("LTBI_estimates_cleaned.csv").then(data => {
    data.forEach(d => {
      d.Year = +d.Year;
      d.Estimated_Household_Contacts = +d.Estimated_Household_Contacts;
      d.Prev_Treatment_Contacts_Pct = +d.Prev_Treatment_Contacts_Pct;
      d.Prev_Treatment_Kids_Pct = +d.Prev_Treatment_Kids_Pct;
    });
  
    // Call visualization functions
    createForceDirectedGraph(data);
    createMapChart(data);
    createTimeline(data);
    createHierarchicalTreeMap(data);
    createSunburstChart(data);
  });
  
  // Force-Directed Graph
  function createForceDirectedGraph(data) {
    const width = 800, height = 600;
  
    d3.select("#force-directed-graph")
      .append("h2")
      .text("Force-Directed Graph: Relationships Between Countries");
  
    const svg = d3.select("#force-directed-graph")
      .append("svg")
      .attr("width", width)
      .attr("height", height);
  
    const links = data.map((d, i) => ({
      source: d.Country,
      target: data[(i + 1) % data.length].Country,
      value: d.Estimated_Household_Contacts
    }));
  
    const nodes = [...new Set(links.flatMap(link => [link.source, link.target]))].map(name => ({
      id: name
    }));
  
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).distance(100).id(d => d.id))
      .force("charge", d3.forceManyBody().strength(-50))
      .force("center", d3.forceCenter(width / 2, height / 2));
  
    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .style("stroke", "#aaa");
  
    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 5)
      .style("fill", "steelblue")
      .call(drag(simulation));
  
    node.append("title").text(d => d.id);
  
    simulation.on("tick", () => {
      link.attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
  
      node.attr("cx", d => d.x).attr("cy", d => d.y);
    });
  
    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
  
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
  
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
  
      return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
    }
  }
  
  function createMapChart(data) {
    const width = 960, height = 500;
  
    d3.select("#map-chart")
      .append("h2")
      .text("World Map: Estimated Household Contacts by Country");
  
    const svg = d3.select("#map-chart")
      .append("svg")
      .attr("width", width)
      .attr("height", height);
  
    // Define a color scale based on the data
    const colorScale = d3.scaleSequential(d3.interpolateBlues)
      .domain([0, d3.max(data, d => d.Estimated_Household_Contacts)]);
  
    // Load GeoJSON data for the world map
    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson").then(geoData => {
      // Merge data with GeoJSON
      const countryData = {};
      data.forEach(d => {
        countryData[d.ISO3] = d.Estimated_Household_Contacts;
      });
  
      geoData.features.forEach(feature => {
        feature.properties.contacts = countryData[feature.id] || 0;
      });
  
      // Define a projection and path generator
      const projection = d3.geoMercator()
        .scale(130)
        .translate([width / 2, height / 1.4]);
  
      const path = d3.geoPath().projection(projection);
  
      // Create a group for the map
      const g = svg.append("g");
  
      // Draw the map
      const countries = g.selectAll("path")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", d => colorScale(d.properties.contacts))
        .attr("stroke", "white")
        .attr("stroke-width", 0.5)
        .on("click", clicked) // Add click event
        .append("title")
        .text(d => `${d.properties.name}: ${d.properties.contacts}`);
  
      // Add a zoomable behavior
      const zoom = d3.zoom()
        .scaleExtent([1, 8]) // Minimum and maximum zoom levels
        .on("zoom", event => {
          g.attr("transform", event.transform);
        });
  
      svg.call(zoom);
  
      // Function to handle clicks on a country
      function clicked(event, d) {
        // Get the bounds of the clicked country
        const [[x0, y0], [x1, y1]] = path.bounds(d);
  
        // Calculate the scale and translation for zooming
        const scale = Math.max(1, Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)));
        const translate = [
          width / 2 - scale * (x0 + x1) / 2,
          height / 2 - scale * (y0 + y1) / 2
        ];
  
        // Transition to the zoomed view
        svg.transition()
          .duration(750)
          .call(
            zoom.transform,
            d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
          );
      }
  
      // Add a legend
      const legend = svg.append("g").attr("transform", `translate(${width - 200}, 20)`);
  
      const legendScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Estimated_Household_Contacts)])
        .range([0, 200]);
  
      const legendAxis = d3.axisRight(legendScale)
        .ticks(5)
        .tickFormat(d3.format(".0s"));
  
      legend.selectAll("rect")
        .data(d3.range(0, 1, 0.1))
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 20)
        .attr("width", 20)
        .attr("height", 20)
        .attr("fill", d => colorScale(d * d3.max(data, d => d.Estimated_Household_Contacts)));
  
      legend.append("g")
        .attr("transform", `translate(25, 0)`)
        .call(legendAxis);
  
      legend.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .text("Contacts");
    });
  }
  
  
  
  // Timeline Visualization
  function createTimeline(data) {
    const width = 800, height = 300, margin = { top: 20, right: 30, bottom: 30, left: 50 };
  
    d3.select("#timeline")
      .append("h2")
      .text("Timeline: Estimated Household Contacts Over Time");
  
    const svg = d3.select("#timeline")
      .append("svg")
      .attr("width", width)
      .attr("height", height);
  
    const xScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.Year))
      .range([margin.left, width - margin.right]);
  
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.Estimated_Household_Contacts)])
      .range([height - margin.bottom, margin.top]);
  
    const line = d3.line()
      .x(d => xScale(d.Year))
      .y(d => yScale(d.Estimated_Household_Contacts));
  
    const groupedData = d3.group(data, d => d.Country);
  
    svg.append("g").attr("transform", `translate(0, ${height - margin.bottom})`).call(d3.axisBottom(xScale));
    svg.append("g").attr("transform", `translate(${margin.left}, 0)`).call(d3.axisLeft(yScale));
  
    for (const [country, values] of groupedData) {
      svg.append("path")
        .datum(values)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", line)
        .append("title")
        .text(country);
    }
  }
  
  // Hierarchical Tree Map
  function createHierarchicalTreeMap(data) {
    const width = 800, height = 600;
  
    d3.select("#hierarchical-tree-map")
      .append("h2")
      .text("Hierarchical Tree Map: Household Contacts by WHO Region");
  
    const svg = d3.select("#hierarchical-tree-map")
      .append("svg")
      .attr("width", width)
      .attr("height", height);
  
    const root = d3.hierarchy({ values: d3.group(data, d => d.WHO_Region) }, d => d[1]).sum(d => d.Estimated_Household_Contacts);
  
    d3.treemap().size([width, height]).padding(1)(root);
  
    const nodes = svg.selectAll("g")
      .data(root.leaves())
      .enter()
      .append("g")
      .attr("transform", d => `translate(${d.x0}, ${d.y0})`);
  
    nodes.append("rect")
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .attr("fill", "steelblue");
  
    nodes.append("text")
      .attr("x", 3)
      .attr("y", 10)
      .text(d => d.data.Country);
  }
  
  // Sunburst Chart
  function createSunburstChart(data) {
    const width = 800, height = 600, radius = Math.min(width, height) / 2;
  
    d3.select("#sunburst-chart")
      .append("h2")
      .text("Sunburst Chart: Household Contacts by Region and Country");
  
    const svg = d3.select("#sunburst-chart")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);
  
    const root = d3.hierarchy({ values: d3.group(data, d => d.WHO_Region, d => d.Country) }, d => d[1]).sum(d => d.Estimated_Household_Contacts);
  
    const partition = d3.partition().size([2 * Math.PI, radius]);
    partition(root);
  
    const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1);
  
      svg.selectAll("path")
      .data(root.descendants())
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", d => (d.depth === 0 ? "none" : d3.schemeCategory10[d.depth % 10]))
      .attr("stroke", "#fff")
      .append("title")
      .text(d => {
        if (d.depth === 0) return "Root";
        const region = d.data[0] || d.data.key; // Adjust for hierarchy grouping
        return `Region/Country: ${region}, Estimated Contacts: ${d.value}`;
      });
  
    // Add labels for the inner segments
    svg.selectAll("text")
      .data(root.descendants().filter(d => d.depth === 1)) // Show labels only for WHO regions
      .enter()
      .append("text")
      .attr("transform", d => {
        const angle = (d.x0 + d.x1) / 2;
        const rotation = (angle * 180) / Math.PI - 90;
        return `translate(${arc.centroid(d)}) rotate(${rotation})`;
      })
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .text(d => d.data.key || d.data[0]);
  }
  