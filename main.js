// get button values
const model = document.getElementById("model");
const platform = document.getElementById("platform");
const objective = document.getElementById("objective");
const optimiser = document.getElementById("optimiser");
const run_opt = document.getElementById("run-opt");
const stop_opt = document.getElementById("stop-opt");
const ctx = document.getElementById('myChart').getContext('2d');
const perf_ctx = document.getElementById('perfChart').getContext('2d');
const update_graph = document.getElementById("update-graph");

var graphUpdate = false;
var isRunning = false;
var opt_pid = -1;

var throughput = new Map();
var latency = new Map();

throughput.set("0", 0.0);
latency.set("0", 0.0);

function removeExtension(filename) {
  return filename.substring(0, filename.lastIndexOf('.')) || filename;
}

// toggle graphUpdate flag
update_graph.addEventListener('click', function() {
  graphUpdate = !graphUpdate;
});

// run optimiser button
run_opt.addEventListener('click', function() {
  fetch("run-optimiser.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: `model=${model.files[0].name}&platform=${platform.value}&objective=${objective.value}&optimiser=${optimiser.value}&pid=${opt_pid}`,
      })
      .then((response) => response.text())
      .then((res) => opt_pid = res);
  isRunning = true;
  // render();
});

// stop optimiser button
stop_opt.addEventListener('click', function() {
  console.log(`optimiser PID: ${opt_pid}`);
  fetch("stop-optimiser.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: `pid=${opt_pid}`,
      });
  isRunning = false;
  // clear throughput and latency data
  throughput.clear();
  latency.clear();
});

// transition between graphs
function transitionFactory() {
    return d3.transition("main")
        .ease(d3.easeLinear)
        .delay(500)
        .duration(1000);
}

// graph creator
var graphviz = d3.select("#graph").graphviz()
    .logEvents(true)
    .transition(transitionFactory)
    .tweenShapes(false)
    .width("100%");
    // .on("initEnd", render);

// function to load local file
function loadFile(filePath) {
  console.log(filePath);
  if(filePath == "outputs/vis/..") {
    filePath = "outputs/base.dot";
  }
  var result = null;
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", filePath, false);
  xmlhttp.send();
  if (xmlhttp.status==200) {
    return xmlhttp.responseText;
  }
}

// get the latest file
function latestFile(fileDir) {
  return fetch("get-latest-file.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: `path=${fileDir}`,
      })
      .then((response) => response.text());
}

// create a horizontal bar chart
const myChart = new Chart(ctx, {
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
                beginAtZero: true,
                max: 100
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
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
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
function chart_render() {
  // update chart
  if( isRunning ) {
    latestFile("outputs/log").then(
      (file) => {
        var filepath = "outputs/base.json";
        if(file != "..") {
          filepath = "outputs/log/"+file;
        }
        let data = loadFile(filepath);
        let log = JSON.parse(data);
        myChart.data.datasets[0].data = [
            log['resource']['LUT'],
            log['resource']['FF'],
            log['resource']['DSP'],
            log['resource']['BRAM']
        ];
        myChart.update();
        // update throughput and latency
        throughput.innerHTML = "Throughput (fps): "+log["throughput"];
        latency.innerHTML = "Latency (ms): "+log["latency"];
    });
  }
}

// function to render graph
function perf_chart_render() {
  // update chart
  if( isRunning ) {
    latestFile("outputs/log").then(
      (file) => {
        var filepath = "outputs/base.json";
        if(file != "..") {
          filepath = "outputs/log/"+file;
        } else {
          return;
        }
        let data = loadFile(filepath);
        let log = JSON.parse(data);
        // update throughput and latency map
        throughput.set(removeExtension(file), log["throughput"]);
        latency.set(removeExtension(file), log["latency"]);
        console.log(throughput.values());
        perfChart.data.datasets[0].data = Array.from(throughput.values());
        perfChart.data.datasets[1].data = Array.from(latency.values());
        perfChart.data.labels = Array.from(throughput.keys());
        perfChart.update();
    });
  }
}

// function to render graph
function graph_render() {
    // update graph visualisation
    latestFile("outputs/vis").then(
      (file) => {
        var filepath = "outputs/base.dot";
        if(file != "..") {
          filepath = "outputs/vis/"+file;
        }
        let data = loadFile(filepath);
        graphviz
          .renderDot(data)
    });
}

// set intervals for updating charts and graphs
setInterval(chart_render, 200);

// set intervals for updating charts and graphs
setInterval(perf_chart_render, 200);


