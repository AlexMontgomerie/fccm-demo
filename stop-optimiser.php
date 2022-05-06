<?php

  // close optimiser
  $f = fopen("pid.txt", "r") or exit("unable to open file");
  $pid = fread($f, filesize("pid.txt"));
  error_log($pid);
  shell_exec("kill ${pid}");
  fclose($f);

?>

