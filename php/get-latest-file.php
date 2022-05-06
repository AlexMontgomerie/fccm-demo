<?php

  // folder path to sort
  $path = $_POST['path'];

  // get sorted files
  $files = scandir($path);
  natsort($files);

  // return latest file
  echo end($files);

?>
