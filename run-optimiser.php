<?php

  // get optimiser run parameters
  /* $model = $_POST['model']; */
  /* $platform = $_POST['platform']; */
  /* $optimiser = $_POST['optimiser']; */
  /* $objective = $_POST['objective']; */
  /* $pid = $_POST['pid']; */
  $model = $_REQUEST['model'];
  $platform = $_REQUEST['platform'];
  $optimiser = $_REQUEST['optimiser'];
  $objective = $_REQUEST['objective'];
  $batch_size = $_REQUEST['batch_size'];


  // log parameters
  error_log($model);
  error_log($platform);
  error_log($optimiser);
  error_log($objective);
  error_log($batch_size);

  // clear logs and visualisations
  shell_exec("rm outputs/log/*");
  shell_exec("rm outputs/vis/*");

  $output = null;
  $retval = null;

  // execute python optimiser
  exec("nohup python -m samo --model models/${model} --platform ${platform} --optimiser ${optimiser} --batch-size ${batch_size} --objective ${objective} --output-path outputs/fccm --backend fpgaconvnet  > /dev/null 2>&1 & echo $! > pid.txt", $op);

?>
