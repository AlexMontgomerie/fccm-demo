<?php

  $pid = $_POST['pid'];
  shell_exec("kill ${pid}");

?>

