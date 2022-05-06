// get button values
const model = document.getElementById("model");
const platform = document.getElementById("platform");
const objective = document.getElementById("objective");
const optimiser = document.getElementById("optimiser");
const run_opt = document.getElementById("run-opt");
const stop_opt = document.getElementById("stop-opt");
const rsc_ctx = document.getElementById('rscChart').getContext('2d');
const perf_ctx = document.getElementById('perfChart').getContext('2d');
const update_graph = document.getElementById("update-graph");

var graphUpdate = false;
var isRunning = false;

var throughput = new Map();
var latency = new Map();

throughput.set("0", 0.0);
latency.set("0", 0.0);

var latest_vis_file = "outputs/base.dot";
var latest_log_file = "outputs/base.log";
var latest_index = "0";

function removeExtension(filename) {
  return filename.substring(0, filename.lastIndexOf('.')) || filename;
}

// toggle graphUpdate flag
update_graph.addEventListener('click', function() {
  graphUpdate = !graphUpdate;
});

// attributer
function attributer(datum, index, nodes) {
    margin = 20; // to avoid scrollbars
    var selection = d3.select(this);
    if (datum.tag == "svg") {
        var width = window.innerWidth;
        var height = window.innerHeight;
        datum.attributes.width = width - margin;
        datum.attributes.height = height - margin;
    }
}

// transition between graphs
function transitionFactory() {
    return d3.transition("main")
        .ease(d3.easeLinear)
        .delay(500)
        .duration(500);
}

function resetZoom() {
  graphviz
    .resetZoom(d3.transition().duration(10));
}

function resizeSVG() {
    var width = window.innerWidth;
    var height = window.innerHeight;
    var svg = d3.select("#graph").selectWithoutDataPropagation("svg");
    svg
        .transition()
        .duration(700)
        .attr("width", width - 40)
        .attr("height", height - 40);
    var d = svg.datum();
    d.attributes['width'] = width - margin;
    d.attributes['height'] = height - margin;
}

// graph creator
var graphviz = d3.select("#graph").graphviz()
    .logEvents(true)
	// .attributer(attributer)
    .transition(transitionFactory)
    .tweenShapes(false)
    .tweenPaths(true);
    // .fit(true);
    // .width("100%");
    // .on("initEnd", render);

// function to load local file
function loadFile(filePath) {
  // console.log(filePath);
  if(filePath == "outputs/vis/..") {
    filePath = "outputs/base.dot";
  }
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", filePath, false);
  xmlhttp.send();
  if (xmlhttp.status==200) {
    return xmlhttp.responseText;
  }
}

// get the latest file
async function latestFile(fileDir) {
  return fetch("get-latest-file.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `path=${fileDir}`,
  })
  .then((response) => response.text());
}

// get the latest file
async function latestFile() {
  return fetch("get-latest-file.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `path=outputs/vis`,
  })
  .then((response) => response.text())
  .then((file) => {
    latest_log_file = "outputs/base.json";
    latest_vis_file = "outputs/base.dot";
	if(file != "..") {
	  latest_index = removeExtension(file);
	  latest_log_file = "outputs/log/"+latest_index+".json";
	  latest_vis_file = "outputs/vis/"+latest_index+".dot";
	}
  });
}

// create a horizontal bar chart
const rscChart = new Chart(rsc_ctx, {
    type: 'bar',
    data: {
        labels: ['LUT', 'FF', 'DSP', 'BRAM'],
        datasets: [{
            data: [0.0, 0.0, 0.0, 0.0],
            borderColor:  [
              "rgb(255, 99, 132, 1.0)", // red
              "rgb(54, 162, 235, 1.0)", // blue
              "rgb(153, 102, 255, 1.0)", // purple
              "rgb(255, 159, 64, 1.0)", // orange
            ],
            backgroundColor: [
              "rgb(255, 99, 132, 0.6)", // red
              "rgb(54, 162, 235, 0.6)", // blue
              "rgb(153, 102, 255, 0.6)", // purple
              "rgb(255, 159, 64, 0.6)", // orange
            ],
            borderWidth: 1
        }]
    },
    options: {
        responsive: true,
        indexAxis: 'y',
        scales: {
            x: {
              display: true,
              beginAtZero: true,
              max: 100,
              title: {
                display: true,
                title: "Resource Usage (%)"
              }
            }
        },
        plugins: {
          legend: {
            display: false
          }
        }
    }
});

// create a horizontal line chart for performance
const perfChart = new Chart(perf_ctx, {
    type: 'line',
    data: {
      labels: ["0"],
      datasets: [
        {
          label: "throughput",
          data: [0.0],
          borderColor: "rgb(255, 99, 132, 1.0)", // red
          backgroundColor: "rgb(255, 99, 132, 0.6)", // red
          yAxisID: 'y'
        },
        {
          label: "latency",
          data: [0.0],
          borderColor: "rgb(54, 162, 235, 1.0)", // blue
          backgroundColor: "rgb(54, 162, 235, 0.6)", // red
          yAxisID: 'y1'
        }
      ]
    },
    options: {
        stacked: false,
        responsive: true,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: true,
            title: {
              display: true,
              text: 'Throughput (img/s)'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
            title: {
              display: true,
              text: 'Latency (/batch)',
            },
            // grid line settings
            grid: {
              drawOnChartArea: false, // only want the grid lines for one axis to show up
            },
          }
        },
        plugins: {
        }
    }
});


// function to render graph
function rsc_chart_render() {
  // update chart
  if( isRunning ) {
	console.log("rendering resource chart: "+latest_log_file);
	let data = loadFile(latest_log_file);
	let log = JSON.parse(data);
	rscChart.data.datasets[0].data = [
		log['resource']['LUT'],
		log['resource']['FF'],
		log['resource']['DSP'],
		log['resource']['BRAM']
	];
	rscChart.update();
  }
}

// function to render graph
function perf_chart_render() {
  // update chart
  if( isRunning ) {
	console.log("rendering performance chart: "+latest_log_file);
	let data = loadFile(latest_log_file);
	let log = JSON.parse(data);
	// update throughput and latency map
	throughput.set(removeExtension(latest_index), log["throughput"]);
	latency.set(removeExtension(latest_index), log["latency"]);
	perfChart.data.datasets[0].data = Array.from(throughput.values());
	perfChart.data.datasets[1].data = Array.from(latency.values());
	perfChart.data.labels = Array.from(throughput.keys());
	perfChart.update();
  }
}

// function to render graph
function graph_render() {
  // update graph visualisation
  if( isRunning && graphUpdate ) {
	console.log("rendering graph: "+latest_vis_file);
	let data = loadFile(latest_vis_file);
	graphviz
	  .renderDot(data)
	  // .resetZoom(d3.transition().duration(10))
	  .on("end", function() {
		graph_render();
	  });
  }
}

// run optimiser button
function startOptimiser() {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", `run-optimiser.php?model=${model.files[0].name}&platform=${platform.value}&objective=${objective.value}&optimiser=${optimiser.value}`);
  xmlhttp.send(null);
  latest_vis_file = "outputs/base.dot";
  latest_log_file = "outputs/base.log";
  isRunning = true;
  console.log("isRunning: "+isRunning+", graphUpdate: "+graphUpdate);
  graph_render();
}

// stop optimiser button
function stopOptimiser() {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", "stop-optimiser.php");
  xmlhttp.send(null);
  isRunning = false;
  throughput.clear();
  latency.clear();
}

// get the latest log and vis file
setInterval(latestFile, 50);

// // set intervals for updating charts and graphs
// setInterval(rsc_chart_render, 500);

// // set intervals for updating charts and graphs
// setInterval(perf_chart_render, 500);

// // set intervals for updating charts and graphs
// setInterval(graph_render, 3000);

// on-click events
run_opt.addEventListener('click', startOptimiser);
stop_opt.addEventListener('click', stopOptimiser);

// d3.select(window).on("resize", resizeSVG);

