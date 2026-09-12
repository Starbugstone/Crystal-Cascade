<?php
declare(strict_types=1);
// Disposable DB integration checks. Only this script's random player rows are deleted.
require dirname(__DIR__).'/vendor/autoload.php';
use App\{ApiError,Content,Database,PuzzleEngine,PuzzleService,TownService};
$testUrl=getenv('TEST_DATABASE_URL');
if(!$testUrl){fwrite(STDERR,"Set TEST_DATABASE_URL to a disposable migrated database.\n");exit(2);}
$_ENV['DATABASE_URL']=$testUrl;$database=new Database();$db=$database->get();$content=new Content();
$service=new PuzzleService($database,$content,new TownService($content));$engine=new PuzzleEngine();
$players=['puzzle-'.bin2hex(random_bytes(12)),'puzzle-'.bin2hex(random_bytes(12))];$assertions=0;
function check(bool $ok,string $message): void {global $assertions;$assertions++;if(!$ok)throw new RuntimeException($message);}
function command(string $player,string $type,array $args): array {
    global $db,$service;
    return $db->transactional(function()use($db,$service,$player,$type,$args){
        $row=$db->fetchAssociative('SELECT * FROM players WHERE id=? FOR UPDATE',[$player]);
        $profile=json_decode($row['profile'],true,512,JSON_THROW_ON_ERROR);
        $result=$service->action($player,$profile,$type,$args);
        $db->update('players',['profile'=>json_encode($profile,JSON_THROW_ON_ERROR),'revision'=>$row['revision']+1],['id'=>$player]);
        return $result;
    });
}
function reject(string $player,string $type,array $args,int $status): void {
    global $db;
    $before=$db->fetchOne('SELECT profile FROM players WHERE id=?',[$player]);
    try {command($player,$type,$args);throw new RuntimeException('Unexpectedly accepted '.$type);}catch(ApiError $e){check($e->status===$status,'Rejection status for '.$type.': '.$e->getMessage());}
    check($db->fetchOne('SELECT profile FROM players WHERE id=?',[$player])===$before,'Rejected command changed profile');
}
function snapshot(string $id): array {global $db;return json_decode($db->fetchOne('SELECT state FROM runs WHERE id=?',[$id]),true,512,JSON_THROW_ON_ERROR);}
function profile(string $player): array {global $db;return json_decode($db->fetchOne('SELECT profile FROM players WHERE id=?',[$player]),true,512,JSON_THROW_ON_ERROR);}
function saveFixture(string $id,array $state): void {global $db;$db->update('runs',['state'=>json_encode($state,JSON_THROW_ON_ERROR)],['id'=>$id]);}
function legal(array $state): array {
    global $engine;
    foreach($state['board'] as $a=>$g)foreach([$a+1,$a+$state['cols']] as $b)if($b<count($state['board'])){
        $result=$engine->evaluate($state['board'],$state['tiles'],$state['cols'],$state['rows'],$a,$b);
        if($result['matches'])return [$a,$b,$result];
    }
    throw new RuntimeException('No legal fixture move');
}
try {
    foreach($players as $id)$db->insert('players',['id'=>$id,'profile'=>json_encode($content->fresh(),JSON_THROW_ON_ERROR),'revision'=>0,'created_at'=>time(),'saved_at'=>time()]);
    [$player,$other]=$players;
    $lastLevel=count($content->data['levels']);
    reject($player,'run.start',['level'=>$lastLevel+1,'mode'=>'normal'],422);
    reject($player,'run.start',['level'=>2,'mode'=>'normal'],422);
    reject($player,'run.start',['level'=>'1','mode'=>'normal'],422);
    reject($player,'run.start',['level'=>1,'mode'=>'continuous'],422);
    reject($player,'run.start',['level'=>1,'mode'=>'normal','score'=>999999],422);
    $run=command($player,'run.start',['level'=>1,'mode'=>'normal']);$id=$run['runId'];
    check(command($player,'run.start',['level'=>1,'mode'=>'normal'])['runId']===$id,'Start retry resumes same run');
    check((int)$db->fetchOne("SELECT COUNT(*) FROM runs WHERE player_id=? AND status='active'",[$player])===1,'Single active run');
    reject($other,'run.resume',['runId'=>$id],404);
    reject($other,'run.move',['runId'=>$id,'a'=>0,'b'=>1],404);
    reject($player,'run.move',['runId'=>$id,'a'=>0,'b'=>8],422);
    reject($player,'run.move',['runId'=>$id,'a'=>0,'b'=>1,'score'=>999999],422);
    reject($player,'run.move',['runId'=>$id,'a'=>0.5,'b'=>1],422);
    reject($player,'run.move',['runId'=>$id,'a'=>0,'b'=>1,'activate'=>'true'],422);
    reject($player,'run.power',['runId'=>$id,'power'=>'tnt','index'=>0],422);
    $before=snapshot($id);[$a,$b]=legal($before);$moved=command($player,'run.move',['runId'=>$id,'a'=>$a,'b'=>$b]);
    check($moved['moves']===1&&$moved['score']>0&&$moved['jewels']>0,'Legal move advances server counters');
    check($moved['board']===snapshot($id)['board'],'Final board persisted');
    check($moved['steps']!==[]&&snapshot($id)['steps']===[],'Only response carries animation steps');
    check(command($player,'run.resume',['runId'=>$id])['board']===$moved['board'],'Resume restores exact server board');
    // Prepare a trusted near-completion state and verify settlement occurs exactly once.
    $state=$engine->initial($content->level(1),'normal');$state['contentVersion']=$content->data['version'];$state['expiresAt']=time()+86400;
    [$a,$b,$evaluation]=legal($state);foreach($state['tiles'] as &$tile){$tile['health']=0;unset($tile['chainHealth']);}unset($tile);
    $state['tiles'][$evaluation['matches'][0]['indices'][0]]['health']=1;$state['remainingLayers']=$state['totalLayers']=1;
    saveFixture($id,$state);$finished=command($player,'run.move',['runId'=>$id,'a'=>$a,'b'=>$b]);
    check($finished['cleared']&&$finished['status']==='completed'&&is_array($finished['receipt']),'Victory comes from resolved objectives');
    $settled=profile($player);check(isset($settled['records'][1]),'Victory unlock persisted');
    reject($player,'run.move',['runId'=>$id,'a'=>$a,'b'=>$b],409);
    command($player,'run.resume',['runId'=>$id]);check(profile($player)['town']['coins']===$settled['town']['coins'],'Receipt resume cannot double grant');
    reject($player,'run.start',['level'=>1,'mode'=>'normal'],422);
    $settled['town']['buildings']['museum']=1;$settled['continuousRecords'][1]=['coins'=>24,'score'=>0];
    $settled['powers'][0]['quantity']=1;
    $db->update('players',['profile'=>json_encode($settled,JSON_THROW_ON_ERROR)],['id'=>$player]);
    $run=command($player,'run.start',['level'=>1,'mode'=>'continuous']);$id=$run['runId'];
    reject($player,'run.start',['level'=>2,'mode'=>'normal'],409);
    // Owned power still rolls back consumption if its target/board command is invalid.
    reject($player,'run.power',['runId'=>$id,'power'=>'clear-row','index'=>-1],422);
    // The paid clear can earn the final coin; measure the whole sequence from before it.
    $coins=profile($player)['town']['coins'];
    $beforePower=profile($player)['powers'][0]['quantity'];
    command($player,'run.power',['runId'=>$id,'power'=>'clear-row','index'=>0]);
    check(profile($player)['powers'][0]['quantity']===$beforePower-1,'Verified power consumes exactly one owned item');
    reject($player,'run.power',['runId'=>$id,'power'=>'clear-row','index'=>0],422);
    for($attempt=0;$attempt<2;$attempt++) {
        $state=snapshot($id);$state['jewels']=999;saveFixture($id,$state);[$a,$b]=legal($state);
        command($player,'run.move',['runId'=>$id,'a'=>$a,'b'=>$b]);
        check(profile($player)['continuousRecords'][1]['coins']===25,'Lifetime continuous cap');
        check(profile($player)['town']['coins']===$coins+1,'No additional credits after lifetime cap');
        check(snapshot($id)['status']==='active','Continuous cannot grant campaign victory');
        command($player,'run.abandon',['runId'=>$id]);reject($player,'run.move',['runId'=>$id,'a'=>$a,'b'=>$b],409);
        if($attempt===0)$id=command($player,'run.start',['level'=>1,'mode'=>'continuous'])['runId'];
    }
    $id=command($player,'run.start',['level'=>2,'mode'=>'normal'])['runId'];
    $db->update('runs',['expires_at'=>time()-1],['id'=>$id]);reject($player,'run.resume',['runId'=>$id],409);
    $replacement=command($player,'run.start',['level'=>2,'mode'=>'normal']);
    check($replacement['runId']!==$id,'Expired run replaced');
    check($db->fetchOne('SELECT status FROM runs WHERE id=?',[$id])==='expired','Expired run marked');
    // An old rules version can be explicitly abandoned, but never settled under new rules.
    $state=snapshot($replacement['runId']);$state['contentVersion']='obsolete-test-version';
    saveFixture($replacement['runId'],$state);[$a,$b]=legal($state);
    reject($player,'run.move',['runId'=>$replacement['runId'],'a'=>$a,'b'=>$b],409);
    check(command($player,'run.abandon',['runId'=>$replacement['runId']])['status']==='abandoned','Old content run can be abandoned');
    // The final authored chapter is accessible and obeys the same lifetime cap.
    $late=$content->fresh();$late['town']['buildings']['museum']=1;
    for($level=1;$level<$lastLevel;$level++)$late['records'][$level]=['score'=>1,'stars'=>1,'bestTimeMs'=>1000];
    $late['continuousRecords'][$lastLevel]=['coins'=>24,'score'=>0];
    $db->update('players',['profile'=>json_encode($late,JSON_THROW_ON_ERROR)],['id'=>$other]);
    $last=command($other,'run.start',['level'=>$lastLevel,'mode'=>'normal']);
    check($last['level']===$lastLevel&&$last['totalRelics']>=0,'Highest authored mine starts');
    command($other,'run.abandon',['runId'=>$last['runId']]);
    $last=command($other,'run.start',['level'=>$lastLevel,'mode'=>'continuous']);
    $state=snapshot($last['runId']);$state['jewels']=10;saveFixture($last['runId'],$state);[$a,$b]=legal($state);
    $beforeCoins=profile($other)['town']['coins'];
    command($other,'run.move',['runId'=>$last['runId'],'a'=>$a,'b'=>$b]);
    check(profile($other)['continuousRecords'][$lastLevel]['coins']===25,'Last chapter continuous lifetime cap');
    check(profile($other)['town']['coins']===$beforeCoins+1,'Last chapter credits remaining lifetime allowance only');
    echo "Puzzle service integration passed: $assertions assertions.\n";
} finally {
    foreach($players as $id)$db->delete('players',['id'=>$id]);
}
