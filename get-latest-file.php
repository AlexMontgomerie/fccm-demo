<?php

  // folder path to sort
  $path = $_POST['path'];

  error_log($path);

  // get sorted files
  $files = scandir($path);
  natsort($files);

  error_log(end($files));

  // return latest file
  echo end($files);

?>
