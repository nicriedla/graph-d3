const WIDTH = 1200;
const HEIGHT = 760;
const MS_GEOJSON_URL = "https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-50-mun.json";

const COLORS = {
  high: "#d93025",
  medium: "#fbbc04",
  low: "#4285f4"
};

// UPs distribuidas no MS com ocorrencias dentro das faixas: 1-10, 11-25 e 26-60.
const UP_POINTS = [
  { up: "UP-CampoGrande", occurrences: 9, lat: -20.4697, lon: -54.6201 },
  { up: "UP-Corumba", occurrences: 7, lat: -19.0094, lon: -57.6533 },
  { up: "UP-Paranaiba", occurrences: 10, lat: -19.6774, lon: -51.1909 },
  { up: "UP-Dourados", occurrences: 14, lat: -22.2231, lon: -54.8120 },
  { up: "UP-TresLagoas", occurrences: 17, lat: -20.7874, lon: -51.7037 },
  { up: "UP-Coxim", occurrences: 25, lat: -18.5031, lon: -54.7503 },
  { up: "UP-PontaPora", occurrences: 27, lat: -22.5361, lon: -55.7256 },
  { up: "UP-Aquidauana", occurrences: 33, lat: -20.4715, lon: -55.7877 },
  { up: "UP-Jardim", occurrences: 41, lat: -21.4803, lon: -56.1381 },
  { up: "UP-Bonito", occurrences: 49, lat: -21.1261, lon: -56.4836 },
  { up: "UP-Navirai", occurrences: 32, lat: -23.0660, lon: -54.1993 },
  { up: "UP-Amambai", occurrences: 58, lat: -23.1063, lon: -55.2253 }
];

const svg = d3.select("#chart");
const tooltip = d3.select("#tooltip");
const zoomInButton = d3.select("#zoom-in");
const zoomOutButton = d3.select("#zoom-out");
const zoomResetButton = d3.select("#zoom-reset");
const brushToggleButton = d3.select("#brush-toggle");
const selectionSummary = d3.select("#selection-summary");
const viewport = svg.append("g").attr("class", "viewport");
const mapLayer = viewport.append("g").attr("class", "map-layer");
const pointLayer = viewport.append("g").attr("class", "point-layer");
const brushLayer = svg.append("g").attr("class", "brush-layer");

const interactionState = {
  selectedIds: new Set(),
  currentTransform: d3.zoomIdentity,
  brushEnabled: false
};

mapLayer.append("rect")
  .attr("class", "map-google-water")
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", WIDTH)
  .attr("height", HEIGHT);

d3.json(MS_GEOJSON_URL).then((geojson) => {
  if (!geojson || !Array.isArray(geojson.features) || geojson.features.length === 0) {
    throw new Error("GeoJSON de MS invalido.");
  }

  const projection = d3.geoMercator().fitExtent(
    [[58, 36], [WIDTH - 58, HEIGHT - 36]],
    geojson
  );
  const geoPath = d3.geoPath(projection);

  const graticule = d3.geoGraticule()
    .extent(d3.geoBounds(geojson))
    .step([1, 1]);

  mapLayer.append("path")
    .datum(graticule())
    .attr("class", "map-google-graticule")
    .attr("d", geoPath);

  const municipalitySelection = mapLayer.selectAll("path.ma-municipality")
    .data(geojson.features)
    .join("path")
    .attr("class", "ma-municipality")
    .attr("fill", (d) => {
      const centroid = d3.geoCentroid(d);
      const norm = Math.max(0, Math.min(1, (centroid[1] + 10) / 9));
      return d3.interpolateRgb("#f9fafb", "#edf2f7")(norm);
    })
    .on("mousemove", (event, d) => {
      municipalitySelection.classed("is-active", false);
      d3.select(event.currentTarget).classed("is-active", true);
      const municipalityName = d.properties?.name ?? "Municipio";
      tooltip
        .html(`<strong>${municipalityName}</strong><br/>Estado: Mato Grosso do Sul`)
        .style("left", `${event.offsetX + 14}px`)
        .style("top", `${event.offsetY + 14}px`)
        .attr("hidden", null);
    })
    .on("mouseleave", (event) => {
      d3.select(event.currentTarget).classed("is-active", false);
      tooltip.attr("hidden", true);
    })
    .attr("d", geoPath);

  mapLayer.append("path")
    .datum({ type: "FeatureCollection", features: geojson.features })
    .attr("class", "ma-border")
    .attr("d", geoPath);

  const stateCentroid = projection(d3.geoCentroid({ type: "FeatureCollection", features: geojson.features }));
  if (stateCentroid) {
    mapLayer.append("text")
      .attr("class", "ma-state-label")
      .attr("x", stateCentroid[0])
      .attr("y", stateCentroid[1])
      .text("MATO GROSSO DO SUL");
  }

  const radiusScale = d3.scaleSqrt()
    .domain(d3.extent(UP_POINTS, (d) => d.occurrences))
    .range([10, 26]);

  const getBucket = (value) => {
    if (value >= 26) return "high";
    if (value >= 11) return "medium";
    return "low";
  };

  UP_POINTS.forEach((d) => {
    const xy = projection([d.lon, d.lat]);
    d.bucket = getBucket(d.occurrences);
    d.radius = radiusScale(d.occurrences);
    d.x = xy ? xy[0] : WIDTH / 2;
    d.y = xy ? xy[1] : HEIGHT / 2;
  });

  const pointQuadtree = d3.quadtree()
    .x((d) => d.x)
    .y((d) => d.y);

  function rebuildQuadtree() {
    pointQuadtree.removeAll(UP_POINTS);
    pointQuadtree.addAll(UP_POINTS);
  }

  rebuildQuadtree();

  function updateSelectionSummary() {
    selectionSummary.text(`Selecionados: ${interactionState.selectedIds.size} de ${UP_POINTS.length} UPs`);
  }

  function renderSelection(points) {
    const hasSelection = interactionState.selectedIds.size > 0;
    points
      .classed("is-selected", (d) => interactionState.selectedIds.has(d.up))
      .classed("is-muted", (d) => hasSelection && !interactionState.selectedIds.has(d.up));

    updateSelectionSummary();
  }

  function setSingleSelection(pointData, points) {
    interactionState.selectedIds.clear();
    if (pointData) interactionState.selectedIds.add(pointData.up);
    renderSelection(points);
  }

  const points = pointLayer.selectAll("g.up-point")
    .data(UP_POINTS)
    .join("g")
    .attr("class", "up-point")
    .attr("transform", (d) => `translate(${d.x},${d.y})`)
    .on("mousemove", (event, d) => {
      tooltip
        .html(`<strong>${d.up}</strong><br/>Ocorrencias: ${d.occurrences}<br/>Faixa: ${translateBucket(d.bucket)}`)
        .style("left", `${event.offsetX + 14}px`)
        .style("top", `${event.offsetY + 14}px`)
        .attr("hidden", null);
    })
    .on("mouseleave", () => {
      tooltip.attr("hidden", true);
    });

  points.on("click", (event, d) => {
    event.stopPropagation();

    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      if (interactionState.selectedIds.has(d.up)) {
        interactionState.selectedIds.delete(d.up);
      } else {
        interactionState.selectedIds.add(d.up);
      }
      renderSelection(points);
      return;
    }

    setSingleSelection(d, points);
  });

  points.append("circle")
    .attr("class", "up-point-outer")
    .attr("r", 0)
    .attr("fill", (d) => COLORS[d.bucket]);

  points.select(".up-point-outer")
    .transition()
    .duration(700)
    .delay((d, i) => i * 35)
    .ease(d3.easeBackOut.overshoot(1.1))
    .attr("r", (d) => d.radius);

  points.append("circle")
    .attr("class", "up-point-core")
    .attr("r", (d) => Math.max(3, d.radius * 0.34))
    .attr("fill", "#ffffff");

  points.append("text")
    .attr("class", "up-point-label")
    .attr("y", (d) => -(d.radius + 6))
    .style("opacity", 0)
    .text((d) => d.up);

  points.select(".up-point-label")
    .transition()
    .duration(450)
    .delay((d, i) => 240 + i * 18)
    .style("opacity", 1);

  const dragBehavior = d3.drag()
    .on("start", (event, d) => {
      event.sourceEvent.stopPropagation();
      d3.select(event.currentTarget)
        .raise()
        .classed("is-dragging", true);

      setSingleSelection(d, points);
    })
    .on("drag", (event, d) => {
      d.x = event.x;
      d.y = event.y;

      d3.select(event.currentTarget)
        .attr("transform", `translate(${d.x},${d.y})`);

      rebuildQuadtree();
    })
    .on("end", (event) => {
      d3.select(event.currentTarget).classed("is-dragging", false);
      rebuildQuadtree();
    });

  points.call(dragBehavior);

  const brushBehavior = d3.brush()
    .extent([[0, 0], [WIDTH, HEIGHT]])
    .on("brush end", (event) => {
      if (!interactionState.brushEnabled) return;

      const selection = event.selection;
      if (!selection) {
        interactionState.selectedIds.clear();
        renderSelection(points);
        return;
      }

      const [[x0, y0], [x1, y1]] = selection;
      interactionState.selectedIds.clear();

      UP_POINTS.forEach((d) => {
        const sx = interactionState.currentTransform.applyX(d.x);
        const sy = interactionState.currentTransform.applyY(d.y);
        if (sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1) {
          interactionState.selectedIds.add(d.up);
        }
      });

      renderSelection(points);

      if (event.type === "end") {
        brushLayer.call(brushBehavior.move, null);
      }
    });

  brushLayer.call(brushBehavior);

  function setBrushMode(enabled) {
    interactionState.brushEnabled = enabled;
    brushToggleButton
      .classed("is-active", enabled)
      .attr("aria-pressed", enabled ? "true" : "false");

    brushLayer.style("pointer-events", enabled ? "all" : "none");
    svg.style("cursor", enabled ? "crosshair" : "grab");

    if (!enabled) {
      brushLayer.call(brushBehavior.move, null);
    }
  }

  setBrushMode(false);

  brushToggleButton.on("click", () => {
    setBrushMode(!interactionState.brushEnabled);
  });

  svg.on("click", (event) => {
    if (interactionState.brushEnabled || event.defaultPrevented) return;

    const [sx, sy] = d3.pointer(event, svg.node());
    const [x, y] = interactionState.currentTransform.invert([sx, sy]);
    const nearest = pointQuadtree.find(x, y, 24);

    if (!nearest) {
      interactionState.selectedIds.clear();
      renderSelection(points);
      tooltip.attr("hidden", true);
      return;
    }

    setSingleSelection(nearest, points);
  });

  const zoomBehavior = d3.zoom()
    .scaleExtent([1, 6])
    .translateExtent([[-300, -220], [WIDTH + 300, HEIGHT + 220]])
    .extent([[0, 0], [WIDTH, HEIGHT]])
    .on("zoom", (event) => {
      interactionState.currentTransform = event.transform;
      viewport.attr("transform", event.transform);
    });

  svg.call(zoomBehavior)
    .on("dblclick.zoom", null);

  zoomInButton.on("click", () => {
    svg.transition().duration(220).call(zoomBehavior.scaleBy, 1.22);
  });

  zoomOutButton.on("click", () => {
    svg.transition().duration(220).call(zoomBehavior.scaleBy, 0.82);
  });

  zoomResetButton.on("click", () => {
    svg.transition().duration(260).call(zoomBehavior.transform, d3.zoomIdentity);
  });

  updateSelectionSummary();
}).catch((err) => {
  console.error("Erro ao carregar mapa de MS:", err);
  svg.append("text")
    .attr("x", WIDTH / 2)
    .attr("y", HEIGHT / 2)
    .attr("text-anchor", "middle")
    .attr("class", "map-error")
    .text("Nao foi possivel carregar o mapa de MS");
});

function translateBucket(bucket) {
  if (bucket === "high") return "Muito requisitada";
  if (bucket === "medium") return "Requisicao media";
  return "Menor requisicao";
}
