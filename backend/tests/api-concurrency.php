<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';
use App\{Auth,Content,Database,Kernel,PuzzleEngine};
use Symfony\Component\HttpFoundation\Request;
$testUrl=getenv('TEST_DATABASE_URL');
if (!$testUrl) { fwrite(STDERR,"Set TEST_DATABASE_URL to a disposable migrated database.\n"); exit(2); }
$_ENV['DATABASE_URL']=$testUrl; $_ENV['APP_ORIGIN']='http://localhost:8187';
$_ENV['APP_SECRET']=str_repeat('concurrency-test-only-',3); $_ENV['TRUSTED_PROXIES']='';
if (($argv[1]??'')==='worker') {
    $input=json_decode(stream_get_contents(STDIN),true,512,JSON_THROW_ON_ERROR);
    $kernel=new Kernel('test',false);
    $request=Request::create($_ENV['APP_ORIGIN'].'/api/v1/actions','POST',[],$input['cookies'],[],['REMOTE_ADDR'=>'127.0.0.31','CONTENT_TYPE'=>'application/json','HTTP_ORIGIN'=>$_ENV['APP_ORIGIN'],'HTTP_X_CSRF_TOKEN'=>$input['csrf']],json_encode($input['command'],JSON_THROW_ON_ERROR));
    echo "ready\n"; flush();
    $response=$kernel->handle($request);
    echo json_encode(['status'=>$response->getStatusCode(),'body'=>json_decode($response->getContent(),true),'raw'=>$response->getContent()],JSON_THROW_ON_ERROR);
    $kernel->terminate($request,$response); $kernel->shutdown(); exit;
}
function ensureConcurrent(bool $value,string $label): void { if (!$value) throw new RuntimeException($label); }
function worker(array $command,array $cookies,string $csrf): array {
    $process=proc_open([PHP_BINARY,__FILE__,'worker'],[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
    if (!is_resource($process)) throw new RuntimeException('Could not start worker');
    fwrite($pipes[0],json_encode(compact('command','cookies','csrf'),JSON_THROW_ON_ERROR)); fclose($pipes[0]);
    ensureConcurrent(trim(fgets($pipes[1]))==='ready','Worker starts');
    return [$process,$pipes];
}
function result(array $worker): array {
    [$process,$pipes]=$worker;
    $output=stream_get_contents($pipes[1]); $errors=stream_get_contents($pipes[2]); fclose($pipes[1]); fclose($pipes[2]);
    ensureConcurrent(proc_close($process)===0,'Worker completed');
    return json_decode($output,true,512,JSON_THROW_ON_ERROR);
}
function concurrent(array $commands,string $player,array $cookies,string $csrf): array {
    global $db;
    // All workers start before the lock is released; each must serialize behind it.
    $db->beginTransaction(); $db->fetchOne('SELECT id FROM players WHERE id=? FOR UPDATE',[$player]);
    $workers=[];
    try { foreach($commands as $command) $workers[]=worker($command,$cookies,$csrf); }
    finally { $db->commit(); }
    return array_map('result',$workers);
}
$database=new Database(); $db=$database->get(); $content=new Content(); $auth=new Auth($database,$content);
$response=$auth->guest(Request::create($_ENV['APP_ORIGIN'])); $cookie=$response->headers->getCookies()[0];
$cookies=[$cookie->getName()=>$cookie->getValue()]; $csrf=json_decode($response->getContent(),true)['csrf'];
$player=$db->fetchOne('SELECT player_id FROM sessions WHERE token_hash=?',[$auth->hash($cookie->getValue())]);
try {
    // Warm route/container cache before child processes run concurrently.
    $kernel=new Kernel('test',false); $kernel->boot(); $kernel->shutdown();
    $p=$content->fresh(); $item=$content->data['shop'][0];
    $p['town']['buildings']['shop']=1; $p['town']['coins']=$item['price'];
    $p['town']['income']['at']=(int)floor(microtime(true)*1000);
    $p['shopStock']=[['id'=>$item['id'],'sold'=>false]];
    $db->update('players',['profile'=>json_encode($p,JSON_THROW_ON_ERROR)],['id'=>$player]);
    $buy=['actionId'=>bin2hex(random_bytes(16)),'revision'=>0,'type'=>'shop.buy','args'=>['id'=>$item['id'],'visit'=>0]];
    $results=concurrent([$buy,$buy],$player,$cookies,$csrf);
    ensureConcurrent($results[0]['status']===200 && $results[1]['status']===200,'Concurrent duplicate purchase returns receipt');
    ensureConcurrent($results[0]['raw']===$results[1]['raw'],'Concurrent replay returns identical JSON');
    $row=$db->fetchAssociative('SELECT * FROM players WHERE id=?',[$player]); $saved=json_decode($row['profile'],true);
    ensureConcurrent((int)$row['revision']===1 && $saved['town']['coins']===0,'Duplicate request charged exactly once');
    ensureConcurrent((int)$db->fetchOne('SELECT COUNT(*) FROM ledger WHERE player_id=?',[$player])===1,'One ledger entry');
    // A second stocked offer cannot be bought twice from a balance covering one purchase.
    $saved['shopStock']=[['id'=>$item['id'],'sold'=>false]]; $saved['town']['coins']=$item['price'];
    $db->update('players',['profile'=>json_encode($saved,JSON_THROW_ON_ERROR)],['id'=>$player]);
    $buy['revision']=1; $buy['actionId']=bin2hex(random_bytes(16)); $other=$buy; $other['actionId']=bin2hex(random_bytes(16));
    $results=concurrent([$buy,$other],$player,$cookies,$csrf); $statuses=array_column($results,'status'); sort($statuses);
    ensureConcurrent($statuses===[200,409],'Competing purchases serialize with revision conflict');
    $saved=json_decode($db->fetchOne('SELECT profile FROM players WHERE id=?',[$player]),true);
    ensureConcurrent($saved['town']['coins']===0,'Concurrent purchase cannot overspend');
    // Trusted fixture: one remaining objective in a server-owned run, settled concurrently.
    $engine=new PuzzleEngine(); $state=$engine->initial($content->level(1),'normal');
    $state['contentVersion']=$content->data['version']; $state['expiresAt']=time()+86400;
    $legal=null;
    foreach($state['board'] as $a=>$gem) {
        foreach([$a+1,$a+$state['cols']] as $b) if($b<count($state['board'])) {
            $evaluation=$engine->evaluate($state['board'],$state['tiles'],$state['cols'],$state['rows'],$a,$b);
            if($evaluation['matches']) { $legal=[$a,$b,$evaluation]; break 2; }
        }
    }
    ensureConcurrent($legal!==null,'Fixture has a legal move'); [$a,$b,$evaluation]=$legal;
    foreach($state['tiles'] as &$tile) { $tile['health']=0; unset($tile['chainHealth']); } unset($tile);
    $state['tiles'][$evaluation['matches'][0]['indices'][0]]['health']=1;
    $state['remainingLayers']=$state['totalLayers']=1;
    $runId=bin2hex(random_bytes(16)); $saved['issuedRun']=1;
    $db->update('players',['profile'=>json_encode($saved,JSON_THROW_ON_ERROR)],['id'=>$player]);
    $db->insert('runs',['id'=>$runId,'player_id'=>$player,'status'=>'active','state'=>json_encode($state,JSON_THROW_ON_ERROR),'created_at'=>time(),'expires_at'=>$state['expiresAt']]);
    $move=['actionId'=>bin2hex(random_bytes(16)),'revision'=>2,'type'=>'run.move','args'=>['runId'=>$runId,'a'=>$a,'b'=>$b]];
    $results=concurrent([$move,$move],$player,$cookies,$csrf);
    ensureConcurrent($results[0]['status']===200 && $results[1]['status']===200,'Concurrent victory retry accepted');
    ensureConcurrent($results[0]['raw']===$results[1]['raw'],'Settlement receipt replay is identical');
    ensureConcurrent($results[0]['body']['run']['status']==='completed','Server completed the mine');
    $settled=json_decode($db->fetchOne('SELECT profile FROM players WHERE id=?',[$player]),true);
    ensureConcurrent($settled['town']['completedRuns']===1 && $settled['settledRun']===1,'Victory settled once');
    ensureConcurrent((int)$db->fetchOne('SELECT COUNT(*) FROM ledger WHERE player_id=? AND reason=?',[$player,'run.move'])===1,'One settlement ledger entry');
    $extra=$move; $extra['actionId']=bin2hex(random_bytes(16)); $extra['revision']=3;
    ensureConcurrent(result(worker($extra,$cookies,$csrf))['status']===409,'New action ID cannot settle completed run again');
    ensureConcurrent(json_decode($db->fetchOne('SELECT profile FROM players WHERE id=?',[$player]),true)===$settled,'Rejected settlement cannot grant rewards');
    // Revocation while a worker waits on the player lock must be rechecked after waiting.
    $db->beginTransaction(); $db->fetchOne('SELECT id FROM players WHERE id=? FOR UPDATE',[$player]);
    $pending=worker(['actionId'=>bin2hex(random_bytes(16)),'revision'=>3,'type'=>'preferences','args'=>['locale'=>'fr']],$cookies,$csrf);
    $db->delete('sessions',['player_id'=>$player]); $db->commit();
    ensureConcurrent(result($pending)['status']===401,'Revocation invalidates a waiting mutation');
    ensureConcurrent((int)$db->fetchOne('SELECT revision FROM players WHERE id=?',[$player])===3,'Revoked mutation does not save');
    echo "Concurrent API purchase, replay, settlement and revocation checks passed.\n";
} finally {
    if ($db->isTransactionActive()) $db->rollBack();
    $db->delete('players',['id'=>$player]);
}
