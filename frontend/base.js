"use strict";

async function main() {
const map = L.map('map').setView([49.0111, 8.3977], 14);

L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
    maxZoom: 17,
    attribution: 'Data: © OpenStreetMap | Tiles: openstreetmap.de'
}).addTo(map);

const showStationary = false;

const iconScale = 1 / 8;
const myIcon = L.icon({
  iconUrl: 'icon.png',
  iconSize: [256 * iconScale, 144 * iconScale],
  iconAnchor: [128 * iconScale, 144 * iconScale],
  popupAnchor: [0, 0],
});

const response = await fetch("./data.json");
const data = await response.json();
//window.data = data;

const animationDuration = (data.bikes[0].d[data.bikes[0].d.length - 1][0] - data.bikes[0].d[0][0]) / 1000;
const animationInterval = 15 * 60; // update every fifteen minutes
const animationSteps = Math.floor(animationDuration / animationInterval);
console.log(`Animation steps: ${animationSteps}, data points: ${data.bikes[0].d.length}`);
const displayInterval = 2;
let aMarker = null;
const allMarkers = [];

for (const bike of data.bikes) {
  const points = bike.d.map((e) => L.latLng(e[1], e[2]));
  const start = points[0];
  const end = points[points.length - 1];
  const distance = start.distanceTo(end);
  if (distance < 100) {
    if (showStationary) {
      L.marker(start, {
        opacity: 0.3,
        zIndexOffset: -1000,
        icon: myIcon,
      }).addTo(map);
    }
  } else {
    const line = L.polyline(points);
    const marker = L.animatedMarker(line.getLatLngs(), {
      distance: distance,
      chunks: animationSteps,
      rawChunks: true,
      interval: displayInterval * 1000,
      icon: myIcon
    });
    marker.bindPopup("");
    marker.addTo(map);
    aMarker = marker;
    allMarkers.push(marker);
  }
}
map.on('popupopen', function(e) {
  map.closePopup();
  var marker = e.popup._source;
  //console.log(marker);
  L.polyline(marker._latlngs).addTo(map)
});

let updateInput = () => {
  if (!window.timeInput) {
    return;
  }
  const idx = aMarker._i - 1;
  window.timeInput.value = idx;
  window.timeDisplay.innerText = new Date(data.bikes[0].d[idx][0]).toLocaleString("DE");
};
setInterval(updateInput, 100);

L.Control.Command = L.Control.extend({
  options: {
      position: 'bottomleft',
  },

  onAdd: (map) => {
      var controlDiv = L.DomUtil.create('div', 'leaflet-control leaflet-control-command');
      L.DomEvent.disableClickPropagation(controlDiv);

      var controlUI = L.DomUtil.create('div', 'leaflet-control-command-interior', controlDiv);
      controlUI.title = 'Map Commands';

      window.timeDisplay = L.DomUtil.create("p", "", controlUI);
      
      window.timeInput = L.DomUtil.create('input', '', controlUI);
    timeInput.type = "range";
    timeInput.min = "0";
    timeInput.max = animationSteps;
    timeInput.addEventListener("change", (e) => {
      const newIdx = timeInput.value;
      for (const marker of allMarkers) {
        marker._i = newIdx;
        marker.setLatLng(marker._latlngs[marker._i]);
      }
    });

      return controlDiv;
  }
});

L.control.command = function (options) {
  return new L.Control.Command(options);
};

L.control.command({}).addTo(map);
}
main();