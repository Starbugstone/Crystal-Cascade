<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';
use App\{Auth,Content,Database,PuzzleEngine};
// This harness refuses every database except the dedicated disposable benchmark database.
$url=getenv('DATABASE_URL');
if(!is_string($url)||!preg_match('~@(ph-bench-pg|ph-bench-my):[0-9]+/benchmark$~D',$url))throw new RuntimeException('Dedicated benchmark database required.');
$database=new Database();$database->migrate();$db=$database->get();$content=new Content();$auth=new Auth($database,$content);
$dir='/benchmark';$mode=$argv[1]??'seed';$active=1152;$total=10000;
if($mode==='generate') {
 $out=fopen($dir.'/fixture.jsonl','w');$clients=[];$now=time();$engine=new PuzzleEngine();$levels=[];
 foreach([1,2,3,4] as $level) {
  $state=$engine->initial($content->level($level),'normal');$state['expiresAt']=$now+86400;$state['contentVersion']=$content->data['version'];$move=null;
  foreach($state['board'] as $a=>$gem)foreach([$a+1,$a+$state['cols']] as $b)if($b<count($state['board'])&&$engine->evaluate($state['board'],$state['tiles'],$state['cols'],$state['rows'],$a,$b)['matches']){$move=['a'=>$a,'b'=>$b];break 2;}
  if(!$move)throw new RuntimeException('Missing fixture move');$levels[]=[$state,$move];
 }
 for($i=0;$i<$total;$i++) {
  $id=substr(hash('sha256','benchmark-player-'.$i),0,32);$publicId=substr(hash('sha256','benchmark-public-'.$i),0,32);$p=$content->fresh();$p['town']['coins']=5000;$p['town']['income']['at']=$now*1000;
  $known=['well','farm','home','saloon','stable','sheriff','museum','armory','bank','shop','square','fisherman','blacksmith','school','doctor'];
  foreach(array_slice($known,0,7+$i%9) as $building)$p['town']['buildings'][$building]=1;
  $listed=$i<5000;$p['community']=['listed'=>$listed,'villageName'=>'Benchmark Village '.$i];
  $player=['id'=>$id,'email'=>'player'.$i.'@benchmark.invalid','locale'=>'en','profile'=>json_encode($p,JSON_THROW_ON_ERROR),'revision'=>0,'created_at'=>$now,'saved_at'=>$now];
  $row=['player'=>$player];
  if($listed)$row['public']=['id'=>$publicId,'player_id'=>$id,'name'=>$p['community']['villageName'],'era_rank'=>0,'building_score'=>array_sum($p['town']['buildings']),'mines_cleared'=>0,'population'=>10,'appearance'=>json_encode(array_intersect_key($p['town'],array_flip(['era','buildings','buildingEras','buildingEraLevels']))+['projects'=>new stdClass()],JSON_THROW_ON_ERROR)];
  if($i<$active) {
   $token=hash('sha256','benchmark-session-'.$i);$csrf=$auth->hash('csrf:'.$token);[$state,$move]=$levels[$i%4];$runId=substr(hash('sha256','benchmark-run-'.$i),0,32);
   $row['session']=['token_hash'=>$auth->hash($token),'player_id'=>$id,'csrf_hash'=>$auth->hash($csrf),'created_at'=>$now,'expires_at'=>$now+86400];
   $row['run']=['id'=>$runId,'player_id'=>$id,'status'=>'active','state'=>json_encode($state,JSON_THROW_ON_ERROR),'created_at'=>$now,'expires_at'=>$now+86400];
   $clients[]=['playerId'=>$id,'cookie'=>'cascade_local='.$token,'csrf'=>$csrf,'villageId'=>$publicId,'move'=>$move+['runId'=>$runId],'level'=>$state['level'],'profileHash'=>hash('sha256',$player['profile'])];
  }
  fwrite($out,json_encode($row,JSON_THROW_ON_ERROR)."\n");
 }
 fclose($out);file_put_contents($dir.'/clients.json',json_encode($clients,JSON_THROW_ON_ERROR));echo "Generated identical fixture: $total players, 5000 public villages, $active active sessions/mines.\n";exit;
}
if(!in_array($mode,['seed','reset','verify'],true))throw new RuntimeException('Unknown mode');
if($mode==='seed'&&(int)$db->fetchOne('SELECT COUNT(*) FROM players'))throw new RuntimeException('Seed requires empty database');
if($mode==='reset') {
 foreach(['actions','ledger','limits'] as $table)$db->executeStatement('DELETE FROM '.$table);
}
if($mode==='seed'||$mode==='reset') {
 $in=fopen($dir.'/fixture.jsonl','r');$db->beginTransaction();$i=0;
 while(($line=fgets($in))!==false) {
  $row=json_decode($line,true,512,JSON_THROW_ON_ERROR);
  if($mode==='seed') {
   $db->insert('players',$row['player']);
   foreach(['public'=>'public_villages','session'=>'sessions','run'=>'runs'] as $key=>$table)if(isset($row[$key]))$db->insert($table,$row[$key]);
  } elseif(isset($row['session'])) {
   $db->update('players',$row['player'],['id'=>$row['player']['id']]);$db->update('runs',$row['run'],['id'=>$row['run']['id']]);$db->update('public_villages',$row['public'],['id'=>$row['public']['id']]);
  }
  if(++$i%500===0){$db->commit();$db->beginTransaction();}
  if($mode==='reset'&&$i===$active)break;
 }
 $db->commit();fclose($in);
 if($mode==='seed') {
  $mysql=$db->getDatabasePlatform() instanceof \Doctrine\DBAL\Platforms\AbstractMySQLPlatform;
  foreach(['players','runs','sessions','public_villages'] as $table) {
   if($mysql)$db->executeQuery('ANALYZE TABLE '.$table)->fetchAllAssociative();
   else $db->executeStatement('ANALYZE '.$table);
  }
 }
}
$counts=[];foreach(['players','public_villages','sessions','runs','actions','ledger'] as $t)$counts[$t]=(int)$db->fetchOne('SELECT COUNT(*) FROM '.$t);
echo json_encode($counts,JSON_THROW_ON_ERROR)."\n";
