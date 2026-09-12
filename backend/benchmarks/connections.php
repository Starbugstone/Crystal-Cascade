<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';
$url=getenv('DATABASE_URL');
if(!is_string($url)||!preg_match('~@(ph-bench-pg|ph-bench-my):[0-9]+/benchmark$~D',$url))throw new RuntimeException('Dedicated benchmark database required.');
// Diagnostic only: same driver and authentication, without HTTP/game rule work.
// This does not introduce pooling into the application or weaken authentication.
$iterations=200;$latencies=[];
for($i=0;$i<$iterations;$i++) {
 $start=hrtime(true);$database=new App\Database();$db=$database->get();
 if((int)$db->fetchOne('SELECT 1')!==1)throw new RuntimeException('Probe failed');
 $db->close();$latencies[]=(hrtime(true)-$start)/1e6;
}
sort($latencies);$database=new App\Database();$db=$database->get();$db->fetchOne('SELECT 1');$start=hrtime(true);
for($i=0;$i<1000;$i++)if((int)$db->fetchOne('SELECT 1')!==1)throw new RuntimeException('Probe failed');
echo json_encode(['newConnectionSamples'=>$iterations,'newConnectionP50Ms'=>$latencies[99],'newConnectionP95Ms'=>$latencies[189],'reusedConnectionQueryMeanMs'=>(hrtime(true)-$start)/1e6/1000],JSON_THROW_ON_ERROR)."\n";
